import type {
  Node,
  NodeId,
  NodeList,
  Ogma,
  EdgeList,
  Edge,
  EdgesEvent,
  NodesEvent
} from "@linkurious/ogma";
import { LinkGeometry } from "./geometry";
import { LinkIndex, type LinksByArrowId } from "./registry";
import { getRigidComment, getRigidFollowComment, translateComment } from "../comment/follow";
import { SIDE_END, SIDE_START } from "../../constants";
import { Store } from "../../store";
import type { Arrow, Id, Annotation, DeepPartial } from "../../types";
import { isText, isComment } from "../../types";
import { getArrowSide, throttle, updateBbox } from "../../utils/utils";
import { mul, subtract } from "../../utils/vec";

type XYR = { x: number; y: number; radius: number };

const XYR_ATTRIBUTES: ["x", "y", "radius"] = ["x", "y", "radius"] as const;

const COMMIT_DEBOUNCE_MS = 1;
// Throttle for the zoom/rotation-driven fixedSize refresh — cheap enough to
// run near every frame without saturating the main thread.
const REFRESH_THROTTLE_MS = 20;

/**
 * Keeps linked arrows in sync with the things they're attached to, outside
 * of an interactive drag: reacts to Ogma node/edge changes and to
 * zoom/rotation (which affects fixedSize annotations' graph-space
 * dimensions), recomputes affected arrows' endpoints via {@link LinkGeometry},
 * and schedules the debounced commit that turns those into a single history
 * entry. Self-registers its Ogma listeners in the constructor and tears them
 * down in {@link destroy}.
 *
 * The interactive-drag cascade (`Links.updateLinkedArrowsDuringDrag` et al.)
 * is a separate, synchronous path that doesn't go through here — see
 * `handlers/links/index.ts`.
 *
 * Geo mode is handled as a derived, render-only overlay on top of that:
 * node-link geometry in `state.features` is always the source of truth, so
 * every recompute this class does while geo mode is transitioning or on
 * stays in `liveUpdates` and is never committed — see `onGeoModeChanged`,
 * `geoOverlayActive`, and `commitBlocked`.
 */
export class LinkSync {
  private ogma: Ogma;
  private store: Store;
  private index: LinkIndex;
  private geometry: LinkGeometry;
  private updatedItems: Set<Id>;
  private commitTimeout!: ReturnType<typeof setTimeout>;
  // Pending "read node positions" callback, coalescing a burst of
  // setMultipleAttributes calls (many per drag, or one per animated layout)
  // into a single recompute - see requestUpdateFromNodePositions for why
  // this waits for Ogma's next rendered frame rather than a fixed timeout.
  private nodePositionFrameHandler?: () => void;
  // Whether the geo overlay (onGeoModeChanged) is currently in liveUpdates.
  // Not redundant with `ogma.geo.enabled()`: that getter flips the instant
  // `.toggle()` is *called*, but the geoEnabled/geoDisabled events - where
  // the overlay is actually pushed/cleared - only fire once the
  // transition's camera animation finishes. `commitBlocked` ORs both so
  // there's no gap on either side of that lag.
  private geoOverlayActive = false;
  // Zoom last seen outside geo mode - geo's zoom convention is unrelated,
  // so this is the reference scale for reconstructing a rigid-linked
  // comment's screen offset under geo (see onGeoModeChanged).
  private lastNodeLinkZoom = 1;
  // Ids applyLiveUpdates was last called with from onGeoModeChanged's geo
  // branch - the exact set to clear on the way back out.
  private lastGeoOverlayIds: Id[] = [];

  constructor(
    ogma: Ogma,
    store: Store,
    index: LinkIndex,
    geometry: LinkGeometry,
    updatedItems: Set<Id>
  ) {
    this.ogma = ogma;
    this.store = store;
    this.index = index;
    this.geometry = geometry;
    this.updatedItems = updatedItems;
    // Defensive: if this is constructed while geo mode is already on (e.g.
    // `Control` created after `ogma.geo.enable()`), start as if the overlay
    // is active - the alternative is a spurious commit of geo-projected
    // coordinates the very first time something moves a linked node.
    this.geoOverlayActive = this.geoEnabled();
    if (!this.geoOverlayActive) this.lastNodeLinkZoom = ogma.view.getZoom();

    this.store.subscribe(
      (state) => ({ zoom: state.zoom, rotation: state.rotation }),
      (value) => {
        if (!this.geoEnabled()) this.lastNodeLinkZoom = value.zoom;
        this.throttledRefresh();
      },
      {
        equalityFn: (a, b) => a.zoom === b.zoom && a.rotation === b.rotation
      }
    );

    // A comment/text box auto-grows live while its textarea is being typed
    // into (TextArea.updateContent -> applyLiveUpdate, per keystroke) - that
    // never touches `state.features`, so the `setMultipleAttributes`/
    // `onAddRemoveEdges`-driven paths above (and the commit-triggered
    // `onAddArrow` in Links) never see it, and a linked arrow's endpoint
    // would otherwise sit frozen at wherever the box was when editing
    // started until the edit session ends and commits. React to the live
    // update directly, scoped to the annotation currently being edited
    // (`editingFeature`) specifically to avoid overlapping with the
    // separate, already-correct interactive-drag cascade in
    // `Links.updateLinkedArrowsDuringDrag` - dragging never sets
    // `editingFeature`, so this and that path can't both fire for the same
    // gesture.
    this.store.subscribe(
      (state) => ({
        editing: state.editingFeature,
        liveUpdates: state.liveUpdates
      }),
      this.onEditingLiveUpdate,
      {
        equalityFn: (a, b) =>
          a.editing === b.editing && a.liveUpdates === b.liveUpdates
      }
    );

    this.ogma.events
      // @ts-expect-error private event
      .on("setMultipleAttributes", this.onSetMultipleAttributes)
      .on(["addEdges", "removeEdges"], this.onAddRemoveEdges)
      .on("removeNodes", this.onRemoveNodes)
      .on("viewChanged", this.refresh)
      .on(["geoEnabled", "geoDisabled"], this.onGeoModeChanged);
  }

  /**
   * geoEnabled: Ogma has already rewritten every node's x/y to its
   * projected position - push one live (uncommitted) recompute (see class
   * doc for why it's live-only). geoDisabled: node-link values are exactly
   * what `features` already holds, so just drop the overlay and every
   * linked arrow snaps back for free.
   */
  private onGeoModeChanged = () => {
    this.geoOverlayActive = this.geoEnabled();
    if (this.index.linksByArrowId.size === 0) return;
    if (this.geoOverlayActive) {
      const updates = this._computeArrowUpdates(this.index.linksByArrowId);
      // Remember exactly what got overlaid - _computeArrowUpdates stages
      // rigid-follow comments (translateComment) alongside arrows, so
      // this can be a superset of linksByArrowId's arrow ids. Clearing
      // only the arrow ids on the way out left comment overlays stuck.
      this.lastGeoOverlayIds = Object.keys(updates);
      this.store.getState().applyLiveUpdates(updates);
    } else {
      this.store.getState().clearLiveUpdates(this.lastGeoOverlayIds);
      // Also drop from updatedItems - defense in depth alongside
      // commitLiveUpdates' own "ids still in liveUpdates" filter.
      this.lastGeoOverlayIds.forEach((id) => this.updatedItems.delete(id));
      this.lastGeoOverlayIds = [];
    }
  };

  public onSetMultipleAttributes = ({
    elements,
    updatedAttributes
  }: {
    elements: Node | NodeList | Edge | EdgeList;
    updatedAttributes: string[];
  }) => {
    const attributesSet = new Set(updatedAttributes);
    if (
      !elements.isNode ||
      (!attributesSet.has("x") &&
        !attributesSet.has("y") &&
        !attributesSet.has("radius"))
    )
      return;
    this.requestUpdateFromNodePositions(elements.toList() as NodeList);
  };

  // Re-entrancy guard: applying the recomputed arrow endpoint below is
  // itself a `state.liveUpdates` write, which would otherwise immediately
  // re-trigger this same subscriber.
  private applyingEditingLiveUpdate = false;

  private onEditingLiveUpdate = ({ editing }: { editing: Id | null }) => {
    if (!editing || this.applyingEditingLiveUpdate) return;
    const linkIds = this.index.annotationToLink.get(editing);
    if (!linkIds || linkIds.size === 0) return;

    const linksToUpdate: LinksByArrowId = new Map();
    linkIds.forEach((linkId) => {
      const link = this.index.links.get(linkId);
      if (!link) return;
      const arrowId = link.arrow;
      linksToUpdate.set(arrowId, this.index.linksByArrowId.get(arrowId)!);
    });
    if (linksToUpdate.size === 0) return;

    const updates = this._computeArrowUpdates(linksToUpdate);
    if (Object.keys(updates).length === 0) return;

    this.applyingEditingLiveUpdate = true;
    try {
      this.store.getState().applyLiveUpdates(updates);
    } finally {
      this.applyingEditingLiveUpdate = false;
    }
  };

  public refresh = () => {
    // When zoom changes, fixedSize text annotations change their graph-space dimensions
    // We need to recalculate all links attached to fixedSize texts
    const state = this.store.getState();
    const linksToUpdate: LinksByArrowId = new Map();

    // Find all links attached to fixedSize annotations
    this.index.annotationToLink.forEach((linkIds, annotationId) => {
      const annotation = state.getFeature(annotationId);
      if (!annotation) return;

      // Check if this is a text with fixedSize enabled or a comment (comments always have fixedSize)
      // (only text and comments have fixedSize, boxes have scaled property instead)
      const hasFixedSize =
        (isText(annotation) && annotation.properties.style?.fixedSize) ||
        isComment(annotation); // Comments always have fixedSize

      if (hasFixedSize) {
        linkIds.forEach((linkId) => {
          const link = this.index.links.get(linkId);
          if (!link) return;
          const arrowId = link.arrow;
          linksToUpdate.set(arrowId, this.index.linksByArrowId.get(arrowId)!);
        });
      }
    });

    if (linksToUpdate.size > 0) this.update(linksToUpdate);
  };

  private throttledRefresh = throttle(() => this.refresh(), REFRESH_THROTTLE_MS);

  private requestUpdateFromNodePositions(nodes: NodeList) {
    // Wait for Ogma's next rendered frame before reading node positions,
    // not a fixed setTimeout: an *animated* setMultipleAttributes call
    // (duration > 0, e.g. a layout) queues its x/y write for the next
    // rAF tick instead of applying it synchronously, so a 1ms timeout can
    // win that race and read the stale pre-move position - a linked arrow
    // would then sit frozen until layoutEnd's final commit. `frame` fires
    // after the write lands either way, animated or instant.
    if (this.nodePositionFrameHandler) {
      this.ogma.events.off(this.nodePositionFrameHandler);
    }
    this.nodePositionFrameHandler = () => {
      this.nodePositionFrameHandler = undefined;
      this.updateFromNodePositions(nodes);
    };
    this.ogma.events.once("frame", this.nodePositionFrameHandler);
  }

  private updateFromNodePositions(nodes: NodeList) {
    // The debounced call can fire after the nodes (or the whole graph) have been
    // removed; bail out rather than reading attributes off a destroyed list.
    if (!nodes.size) return;
    const ids = nodes.getId();
    const links: LinksByArrowId = new Map();
    ids.forEach((id) => {
      const nodeLinks = this.index.nodeToLink.get(id);

      if (!nodeLinks) return;
      nodeLinks.forEach((linkId) => {
        const link = this.index.links.get(linkId);
        if (!link) return;
        const arrowId = link.arrow;
        links.set(arrowId, this.index.linksByArrowId.get(arrowId)!);
      });
    });

    // Also update arrows linked to edges connected to these nodes
    const edgeLinksToUpdate: LinksByArrowId = new Map();
    const affectedEdges = nodes.getAdjacentEdges();
    affectedEdges.getId().forEach((edgeId) => {
      const edgeLinks = this.index.edgeToLink.get(edgeId);
      if (!edgeLinks) return;
      edgeLinks.forEach((linkId) => {
        const link = this.index.links.get(linkId);
        if (!link) return;
        const arrowId = link.arrow;
        links.set(arrowId, this.index.linksByArrowId.get(arrowId)!);
        edgeLinksToUpdate.set(arrowId, this.index.linksByArrowId.get(arrowId)!);
      });
    });

    const xyr = nodes.getAttributes(XYR_ATTRIBUTES) as XYR[];
    const state = this.store.getState();
    const updates: Record<Id, DeepPartial<Annotation>> = {};
    for (let i = 0; i < ids.length; i++) {
      const nodeId = ids[i];
      const nodeLinks = this.index.nodeToLink.get(nodeId);
      if (!nodeLinks) continue;
      for (const linkId of nodeLinks) {
        const link = this.index.links.get(linkId);
        if (!link) continue;
        const arrowId = link.arrow;
        const arrow = this.store.getState().getFeature(arrowId) as Arrow;
        const coordinates = arrow.geometry.coordinates.slice();
        const end = getArrowSide(arrow, SIDE_END);
        const start = getArrowSide(arrow, SIDE_START);
        const nodeSideIndex = link.side === SIDE_START ? 0 : 1;

        const positionAndRadius = xyr[i];
        // Update the arrow's position
        const snapPoint = this.geometry.getNodeSnapPoint(
          positionAndRadius,
          mul(subtract(end, start), -1),
          this.geometry.isLinkedToCenter(link)
        );

        // Rigid-follow: when the arrow's *other* endpoint is attached to a
        // comment in "rigid" mode (the default), dragging the node carries
        // the whole callout (comment + arrow) by the node's delta instead of
        // stretching the line. The arrow keeps its length and angle; the
        // comment translates with the node.
        const comment = getRigidFollowComment(
          this.index.links,
          this.index.linksByArrowId,
          this.store,
          arrowId,
          link
        );
        if (comment) {
          const oldNodePoint = coordinates[nodeSideIndex];
          const delta = subtract(
            { x: snapPoint[0], y: snapPoint[1] },
            { x: oldNodePoint[0], y: oldNodePoint[1] }
          );
          coordinates[0] = [coordinates[0][0] + delta.x, coordinates[0][1] + delta.y];
          coordinates[1] = [coordinates[1][0] + delta.x, coordinates[1][1] + delta.y];

          translateComment(comment, delta, updates, this.updatedItems);
        } else {
          coordinates[nodeSideIndex] = snapPoint;
        }

        updates[arrowId] = {
          ...arrow,
          geometry: {
            coordinates
          }
        } as Arrow;
        this.updatedItems.add(arrowId);
        updateBbox(updates[arrowId] as Arrow);
      }
    }
    state.applyLiveUpdates(updates);

    // Update edge links using the general update method
    if (edgeLinksToUpdate.size > 0) {
      this.update(edgeLinksToUpdate);
      return; // update() will call requestCommit()
    }

    this.requestCommit();
  }

  private onAddRemoveEdges = (event: EdgesEvent<unknown, unknown>) => {
    const edges = event.edges;
    if (!edges.size || !this.index.edgeToLink.size) return;
    const links: LinksByArrowId = new Map();
    // Also update arrows linked to edges connected to these nodes
    const edgeLinksToUpdate: LinksByArrowId = new Map();
    edges
      .getParallelEdges()
      .getId()
      .forEach((edgeId) => {
        const edgeLinks = this.index.edgeToLink.get(edgeId);
        if (!edgeLinks) return;
        edgeLinks.forEach((linkId) => {
          const link = this.index.links.get(linkId);
          if (!link) return;
          const arrowId = link.arrow;
          links.set(arrowId, this.index.linksByArrowId.get(arrowId)!);
          edgeLinksToUpdate.set(arrowId, this.index.linksByArrowId.get(arrowId)!);
        });
      });
    // Update edge links using the general update method
    if (edgeLinksToUpdate.size === 0) return;
    this.update(edgeLinksToUpdate);
  };

  /**
   * A removed node leaves its links dangling otherwise: the registry
   * (`nodeToLink` etc.) has no listener for node removal, so an arrow's
   * `properties.link` would keep pointing at an id that no longer resolves
   * to anything - harmless until something re-reads it (e.g. a future
   * `updateFromNodePositions` pass, or a re-export/re-import round trip).
   * Detach the link (same shape as a manual "drag the endpoint away"
   * detach) rather than deleting the arrow - the annotation stays exactly
   * where it last was, just no longer tracked.
   */
  private onRemoveNodes = ({ nodes }: NodesEvent<unknown, unknown>) => {
    const removedIds = nodes.getId();
    if (!removedIds.length) return;
    const state = this.store.getState();
    const updates: Record<Id, Arrow> = {};

    removedIds.forEach((nodeId) => {
      const linkIds = this.index.nodeToLink.get(nodeId);
      if (!linkIds) return;
      // index.remove() mutates this same Set as we go - snapshot first.
      Array.from(linkIds).forEach((linkId) => {
        const link = this.index.links.get(linkId);
        if (!link) return;
        const arrowId = link.arrow;
        // Reuse the same clone if both sides of this arrow got detached in
        // this pass (both ends linked to nodes removed in the same batch).
        const arrow = updates[arrowId] ?? (state.getFeature(arrowId) as Arrow);
        if (!arrow) return;
        const clone: Arrow = {
          ...arrow,
          properties: { ...arrow.properties, link: { ...arrow.properties.link } }
        };
        this.index.remove(clone, link.side);
        updates[arrowId] = clone;
      });
    });

    if (Object.keys(updates).length === 0) return;
    state.batchUpdate(() => {
      state.updateFeatures(updates as Record<Id, Partial<Annotation>>);
    });
  };

  private commit = () => {
    const state = this.store.getState();
    state.batchUpdate(this.commitLiveUpdates);
    this.updatedItems.clear();
  };

  private commitLiveUpdates = () => {
    this.store.getState().commitLiveUpdates(this.updatedItems);
  };

  update(linksByArrowId: LinksByArrowId = this.index.linksByArrowId) {
    const updates = this._computeArrowUpdates(linksByArrowId);
    const state = this.store.getState();
    state.applyLiveUpdates(updates);
    this.requestCommit();
  }

  /**
   * Compute and synchronously commit arrow position updates for the given links.
   * Used when an annotation is moved programmatically (not during a live drag).
   * Wraps changes in batchUpdate so no extra history entry is created.
   *
   * While a geo overlay is active, `batchUpdate` only suppresses the *undo
   * history* entry - `updateFeatures` still writes straight into
   * `state.features`, which would commit a geo-projected position as if it
   * were node-link truth. Fall back to the same live-overlay-only path as
   * every other geo-aware recompute in this class instead (see
   * `onGeoModeChanged`/`requestCommit`).
   */
  updateAndCommitSync(linksByArrowId: LinksByArrowId) {
    const updates = this._computeArrowUpdates(linksByArrowId);
    if (Object.keys(updates).length === 0) return;
    const state = this.store.getState();
    if (this.commitBlocked()) {
      state.applyLiveUpdates(updates);
      return;
    }
    state.batchUpdate(() => {
      state.updateFeatures(updates as Record<string, Partial<Annotation>>);
    });
  }

  /**
   * Rescales a rigid-follow delta for geo mode. The comment's graph-space
   * offset from its anchor was chosen to look right at node-link zoom
   * (~3, say); geo's zoom is a different convention (observed 64) with no
   * relation to that, so translating by the anchor's raw delta keeps the
   * offset graph-exact but visually explodes it. `lastNodeLinkZoom` is the
   * reference scale the offset was chosen at. No-op outside geo mode -
   * gated on `geoOverlayActive`, same signal the rest of this class
   * treats as authoritative for "is geo mode's overlay live right now"
   * (see that field's doc comment), not a fresh `ogma.geo.enabled()` read.
   */
  private _geoRigidFollowDelta(
    rawDelta: { x: number; y: number },
    anchorOld: number[],
    commentOld: number[]
  ): { x: number; y: number } {
    if (!this.geoOverlayActive) return rawDelta;
    const scale = this.lastNodeLinkZoom / this.ogma.view.getZoom();
    const offset = subtract(
      { x: commentOld[0], y: commentOld[1] },
      { x: anchorOld[0], y: anchorOld[1] }
    );
    return subtract(rawDelta, mul(offset, 1 - scale));
  }

  private _computeArrowUpdates(
    linksByArrowId: LinksByArrowId
  ): Record<Id, DeepPartial<Annotation>> {
    const state = this.store.getState();
    const nodeIds = Array.from(this.index.nodeToLink.keys());
    const nodeIdToIndex = new Map<NodeId, number>();
    nodeIds.forEach((id, i) => nodeIdToIndex.set(id, i));
    const nodes = this.ogma.getNodes(nodeIds);
    const xyr = nodes.getAttributes(["x", "y", "radius"]) as {
      x: number;
      y: number;
      radius: number;
    }[];

    const updates: Record<Id, DeepPartial<Annotation>> = {};

    linksByArrowId.forEach((links, arrowId) => {
      // case when both sides are linked
      const start = this.index.links.get(links.start!);
      const end = this.index.links.get(links.end!);
      const arrow = state.getFeature(arrowId) as Arrow;

      let startPoint = arrow.geometry.coordinates[0];
      let endPoint = arrow.geometry.coordinates[1];

      const startCenter = start
        ? this.geometry.resolveLinkCenter(start, xyr, nodeIdToIndex, state)
        : { x: startPoint[0], y: startPoint[1] };

      const endCenter = end
        ? this.geometry.resolveLinkCenter(end, xyr, nodeIdToIndex, state)
        : { x: endPoint[0], y: endPoint[1] };

      const vec = subtract(endCenter, startCenter);
      if (start) {
        startPoint = this.geometry.resolveLinkPoint(
          start,
          startCenter,
          vec,
          endCenter,
          state
        );
      }
      if (end) {
        endPoint = this.geometry.resolveLinkPoint(
          end,
          endCenter,
          mul(vec, -1),
          startCenter,
          state
        );
      }
      // Rigid-follow: when one side is anchored to a comment in "rigid" mode
      // and the *other* side actually moved, translate the comment (and this
      // endpoint) by that delta instead of letting the comment side
      // re-anchor elastically to the nearest point on the box. Under geo
      // mode the raw delta is rescaled first - see _geoRigidFollowDelta.
      const startComment = getRigidComment(this.store, start);
      const endComment = getRigidComment(this.store, end);

      if (startComment && end) {
        const oldEnd = arrow.geometry.coordinates[1];
        const oldStart = arrow.geometry.coordinates[0];
        const rawDelta = { x: endPoint[0] - oldEnd[0], y: endPoint[1] - oldEnd[1] };
        const delta = this._geoRigidFollowDelta(rawDelta, oldEnd, oldStart);
        if (delta.x !== 0 || delta.y !== 0) {
          startPoint = [oldStart[0] + delta.x, oldStart[1] + delta.y];
          translateComment(startComment, delta, updates, this.updatedItems);
        }
      } else if (endComment && start) {
        const oldStart = arrow.geometry.coordinates[0];
        const oldEnd = arrow.geometry.coordinates[1];
        const rawDelta = { x: startPoint[0] - oldStart[0], y: startPoint[1] - oldStart[1] };
        const delta = this._geoRigidFollowDelta(rawDelta, oldStart, oldEnd);
        if (delta.x !== 0 || delta.y !== 0) {
          endPoint = [oldEnd[0] + delta.x, oldEnd[1] + delta.y];
          translateComment(endComment, delta, updates, this.updatedItems);
        }
      }

      updates[arrow.id] = {
        properties: arrow.properties,
        geometry: {
          coordinates: [startPoint, endPoint]
        }
      } as Annotation;
      updateBbox(updates[arrow.id] as Arrow);
      this.updatedItems.add(arrow.id);
    });

    return updates;
  }

  private requestCommit() {
    // Geo mode is derived, never committed - see `onGeoModeChanged`. Any
    // node-position-triggered recompute that happens while geo mode is on
    // (drag, layout) must stay a live overlay only.
    if (this.commitBlocked()) return;
    clearTimeout(this.commitTimeout);
    this.commitTimeout = setTimeout(this.commit, COMMIT_DEBOUNCE_MS);
  }

  // See `geoOverlayActive`'s doc comment - neither the getter nor the
  // delayed geoEnabled/geoDisabled-driven flag is safe to gate on alone;
  // this is unsafe for the union of both signals' windows.
  private commitBlocked(): boolean {
    return this.geoEnabled() || this.geoOverlayActive;
  }

  // `ogma.geo.enabled()` can throw when the geo module never finished
  // initializing (observed in the jsdom-based unit test harness) or
  // Ogma's mid-teardown - same crash Shapes.isGeoActive() guards against.
  // Every raw read of the getter in this class goes through here instead.
  private geoEnabled(): boolean {
    try {
      return this.ogma.geo.enabled();
    } catch {
      return false;
    }
  }

  public destroy() {
    clearTimeout(this.commitTimeout);
    if (this.nodePositionFrameHandler) {
      this.ogma.events.off(this.nodePositionFrameHandler);
    }
    this.ogma.events
      .off(this.onSetMultipleAttributes)
      .off(this.onAddRemoveEdges)
      .off(this.onRemoveNodes)
      .off(this.refresh)
      .off(this.onGeoModeChanged);
  }
}
