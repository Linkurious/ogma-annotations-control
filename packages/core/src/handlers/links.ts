import type {
  Node,
  NodeId,
  NodeList,
  Ogma,
  Point,
  EdgeList,
  Edge,
  EdgesEvent
} from "@linkurious/ogma";
import { Snapping } from "./snapping";
import { getRigidComment, getRigidFollowComment, translateComment } from "./commentFollow";
import { LinkGeometry } from "./linkGeometry";
import { LinkIndex, type LinksByArrowId, type MagnetSource } from "./linkIndex";
import { SIDE_END, SIDE_START } from "../constants";
import { Store } from "../store";
import type {
  Arrow,
  Id,
  TargetType,
  Link,
  Side,
  Text,
  Annotation,
  DeepPartial,
  Comment
} from "../types";
import { isBox, isText, isPolygon, isComment, isArrow } from "../types";
import { getArrowSide, throttle, updateBbox } from "../utils/utils";
import { add, mul, subtract } from "../utils/vec";

export type { MagnetSource } from "./linkIndex";

const XYR_ATTRIBUTES: ["x", "y", "radius"] = ["x", "y", "radius"] as const;

const COMMIT_DEBOUNCE_MS = 1;
// Debounce window for updateFromNodePositions: waits one tick so Ogma has
// finished writing the node's new x/y/radius attributes before we read them.
const NODE_POSITION_DEBOUNCE_MS = 1;
// Throttle for the zoom/rotation-driven fixedSize refresh — cheap enough to
// run near every frame without saturating the main thread.
const REFRESH_THROTTLE_MS = 20;

type XYR = { x: number; y: number; radius: number };

/**
 * Orchestrates linking between annotation arrows and the things they attach
 * to (nodes, edges, or other annotations): reacts to store/Ogma events, runs
 * the live-drag cascade, and schedules commits. The link registry itself
 * ({@link LinkIndex}) and the snap-point math ({@link LinkGeometry}) are
 * separate collaborators — see those files for what they own.
 *
 * An arrow can be connected to a text or to a node. It supports double
 * indexing so that you could get the arrow by the id of the text or the id
 * of the node or by the id of the arrow id itself. A node or text can be
 * connected to multiple arrows. An arrow can be connected to only one node
 * or text, but on both ends.
 */
export class Links {
  private index: LinkIndex;
  private geometry: LinkGeometry;
  private store: Store;
  private ogma: Ogma;
  private snapping: Snapping;
  private updatedItems = new Set<Id>();
  private commitTimeout!: ReturnType<typeof setTimeout>;
  private nodePositionTimeout?: ReturnType<typeof setTimeout>;

  constructor(
    ogma: Ogma,
    snapping: Snapping,
    store: Store,
    onLinkCreated?: (arrow: Arrow, link: Link) => void
  ) {
    this.ogma = ogma;
    this.store = store;
    this.snapping = snapping;
    this.index = new LinkIndex(ogma, store, onLinkCreated);
    this.geometry = new LinkGeometry(ogma, store);

    this.store.subscribe((state) => state.features, this.onAddArrow);
    this.store.subscribe(
      (state) => ({ zoom: state.zoom, rotation: state.rotation }),
      this.throttledRefresh,
      {
        equalityFn: (a, b) => a.zoom === b.zoom && a.rotation === b.rotation
      }
    );

    this.ogma.events
      // @ts-expect-error private event
      .on("setMultipleAttributes", this.onSetMultipleAttributes)
      .on(["addEdges", "removeEdges"], this.onAddRemoveEdges)
      .on("viewChanged", this.refresh);
  }

  /**
   * Called by handlers during drag operations to update linked arrows.
   *
   * Translates every arrow linked to `annotationId` by `displacement`. When
   * an arrow's *other* end is a comment in "rigid" mode, that comment (and
   * everything else attached to it) is cascaded through the same
   * displacement.
   *
   * `displacement` is always the *total* offset from the start of the drag
   * (matching the convention every caller already uses), and every read
   * here goes through the committed feature plus whatever this same call
   * has already staged — never the store's own `liveUpdates` bucket, which
   * can still hold a *previous* drag frame's stale values. Reading that
   * would compound frame over frame instead of recomputing the absolute
   * position each time.
   */
  public updateLinkedArrowsDuringDrag(
    annotationId: Id,
    displacement: Point,
    liveUpdates?: Record<Id, DeepPartial<Annotation>>
  ) {
    // Batch internally even when the caller wants immediate application, so
    // the rigid-comment cascade below can see updates staged earlier in the
    // very same call instead of clobbering them.
    const batched = liveUpdates ?? {};
    this._collectLinkedArrowUpdates(annotationId, displacement, batched, new Set());
    if (!liveUpdates) this.store.getState().applyLiveUpdates(batched);
  }

  /**
   * Recursive worker for {@link updateLinkedArrowsDuringDrag}. `visited`
   * bounds the recursion so a link graph can't cause it to revisit an
   * annotation it already moved.
   */
  private _collectLinkedArrowUpdates(
    annotationId: Id,
    displacement: Point,
    liveUpdates: Record<Id, DeepPartial<Annotation>>,
    visited: Set<Id>
  ) {
    if (visited.has(annotationId)) return;
    visited.add(annotationId);

    const state = this.store.getState();
    const annotation = state.getFeature(annotationId) as Text;
    if (!annotation) return;

    const links = this.index.annotationToLink.get(annotationId);

    if (!links) return;

    const rigidComments = new Set<Id>();

    for (const linkId of links) {
      const link = this.index.links.get(linkId);
      if (!link) continue;

      const committedArrow = state.getFeature(link.arrow) as Arrow;
      if (!committedArrow) continue;
      // An earlier link in this same cascade (e.g. this arrow's other end,
      // processed via the rigid-comment recursion below) may have already
      // staged a live update for this arrow — build on top of that instead
      // of the committed geometry, or we'd clobber it back to its pre-drag
      // position.
      const staged = liveUpdates[link.arrow] as Partial<Arrow> | undefined;
      const baseCoordinates = (staged?.geometry?.coordinates ??
        committedArrow.geometry.coordinates) as number[][];
      const sideIndex = link.side === SIDE_START ? 0 : 1;
      const currentEndPoint = {
        x: baseCoordinates[sideIndex][0],
        y: baseCoordinates[sideIndex][1]
      };
      const newEndPoint = add(currentEndPoint, displacement);

      // Stage the update for the arrow
      const updatedGeometry = {
        ...committedArrow.geometry,
        coordinates: baseCoordinates.map((coord, idx) => {
          if (idx === sideIndex) return [newEndPoint.x, newEndPoint.y];
          return [...coord];
        })
      };
      liveUpdates[link.arrow] = {
        geometry: updatedGeometry
      } as Partial<Arrow>;
      this.updatedItems.add(link.arrow);

      // Rigid-follow: if this arrow's *other* end is a comment in "rigid"
      // mode, it should translate along with `annotationId` too, instead of
      // being left behind to stretch elastically.
      const rigidComment = getRigidFollowComment(
        this.index.links,
        this.index.linksByArrowId,
        this.store,
        link.arrow,
        link
      );
      if (rigidComment && !visited.has(rigidComment.id))
        rigidComments.add(rigidComment.id);
    }

    for (const commentId of rigidComments) {
      const comment = state.getFeature(commentId) as Comment | undefined;
      if (!comment) continue;
      translateComment(comment, displacement, liveUpdates, this.updatedItems);

      // Cascade: move every other arrow attached to this comment too (and,
      // transitively, anything rigidly attached beyond that).
      this._collectLinkedArrowUpdates(commentId, displacement, liveUpdates, visited);
    }
  }
  public snapLinkedArrowsDuringDrag(
    annotationId: Id,
    liveUpdates?: Record<Id, DeepPartial<Annotation>>
  ) {
    const state = this.store.getState();
    let annotation = state.getFeature(annotationId);
    if (!annotation) return;
    const updates = state.liveUpdates[annotationId];
    annotation = updates
      ? { ...annotation, ...(updates as Annotation) }
      : annotation;
    const links = this.index.annotationToLink.get(annotationId);

    if (!links) return;
    for (const linkId of links) {
      const link = this.index.links.get(linkId);
      if (!link) continue;

      let arrow = state.getFeature(link.arrow) as Arrow;
      const arrowUpdates = state.liveUpdates[arrow.id];
      arrow = arrowUpdates ? { ...arrow, ...(arrowUpdates as Arrow) } : arrow;
      const position =
        arrow.geometry.coordinates[link.side === SIDE_START ? 0 : 1];
      const point = {
        x: position[0],
        y: position[1]
      };
      let snap;
      if (isText(annotation) || isComment(annotation) || isBox(annotation)) {
        snap = this.snapping.snapToText(point, [annotation as Text]);
      } else if (isPolygon(annotation)) {
        snap = this.snapping.snapToPolygon(point, [annotation]);
      }
      if (!snap) continue;
      const newEndPoint = snap.point;
      const updatedGeometry = {
        ...arrow.geometry,
        coordinates: arrow.geometry.coordinates.map((coord, idx) => {
          if (
            (link.side === SIDE_START && idx === 0) ||
            (link.side === SIDE_END && idx === 1)
          )
            return [newEndPoint.x, newEndPoint.y];

          return [...coord];
        })
      };
      if (liveUpdates) {
        liveUpdates[arrow.id] = {
          geometry: updatedGeometry
        } as Partial<Arrow>;
      } else {
        state.applyLiveUpdate(arrow.id, {
          geometry: updatedGeometry
        } as Partial<Arrow>);
      }
    }
  }

  public add(
    arrow: Arrow,
    side: Side,
    targetId: Id,
    targetType: TargetType,
    magnet: Point,
    magnetSource: MagnetSource = "absolute"
  ): this | undefined {
    const result = this.index.add(arrow, side, targetId, targetType, magnet, magnetSource);
    return result ? this : undefined;
  }

  public remove(arrow: Arrow | Id, side: Side) {
    this.index.remove(arrow, side);
    return this;
  }

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
    // debounce to next tick to get the real coordinates
    clearTimeout(this.nodePositionTimeout);
    this.nodePositionTimeout = setTimeout(
      () => this.updateFromNodePositions(nodes),
      NODE_POSITION_DEBOUNCE_MS
    );
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
   */
  private _updateAndCommitSync(linksByArrowId: LinksByArrowId) {
    const updates = this._computeArrowUpdates(linksByArrowId);
    if (Object.keys(updates).length === 0) return;
    const state = this.store.getState();
    state.batchUpdate(() => {
      state.updateFeatures(
        updates as Record<string, Partial<Annotation>>
      );
    });
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
      // re-anchor elastically to the nearest point on the box.
      const startComment = getRigidComment(this.store, start);
      const endComment = getRigidComment(this.store, end);

      if (startComment && end) {
        const oldEnd = arrow.geometry.coordinates[1];
        const delta = { x: endPoint[0] - oldEnd[0], y: endPoint[1] - oldEnd[1] };
        if (delta.x !== 0 || delta.y !== 0) {
          const oldStart = arrow.geometry.coordinates[0];
          startPoint = [oldStart[0] + delta.x, oldStart[1] + delta.y];
          translateComment(startComment, delta, updates, this.updatedItems);
        }
      } else if (endComment && start) {
        const oldStart = arrow.geometry.coordinates[0];
        const delta = { x: startPoint[0] - oldStart[0], y: startPoint[1] - oldStart[1] };
        if (delta.x !== 0 || delta.y !== 0) {
          const oldEnd = arrow.geometry.coordinates[1];
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
    clearTimeout(this.commitTimeout);
    this.commitTimeout = setTimeout(this.commit, COMMIT_DEBOUNCE_MS);
  }

  private onAddArrow = (
    newFeatures: Record<string, Annotation>,
    prevFeatures: Record<string, Annotation>
  ) => {
    const state = this.store.getState();
    const oldIds = new Set(Object.keys(prevFeatures));
    const newIds = Object.keys(newFeatures).filter((id) => !oldIds.has(id));
    const removedIds = Object.keys(prevFeatures).filter(
      (id) => !newFeatures[id]
    );

    newIds.forEach((id) => {
      const feature = state.getFeature(id);
      if (!feature || !isArrow(feature)) return;
      const arrow = feature as Arrow;
      if (arrow.properties.link?.start) {
        const linkData = arrow.properties.link.start;
        // Node/edge existence will be checked in add(). The magnet on
        // arrow.properties.link is always this class's own stored (already
        // bbox-relative, for polygon) format - never re-convert it.
        this.add(
          arrow,
          SIDE_START,
          linkData.id,
          linkData.type,
          linkData.magnet!,
          "stored"
        );
      }
      if (arrow.properties.link?.end) {
        const linkData = arrow.properties.link.end;
        // Node/edge existence will be checked in add(). Same as the start
        // side above - this magnet is already in stored format.
        this.add(
          arrow,
          SIDE_END,
          linkData.id,
          linkData.type,
          linkData.magnet!,
          "stored"
        );
      }
    });

    removedIds.forEach((id) => {
      const feature = prevFeatures[id];
      if (isArrow(feature)) {
        const arrow = feature as Arrow;
        // Remove all links associated with this arrow
        this.remove(arrow, SIDE_START);
        this.remove(arrow, SIDE_END);
      } else {
        // Remove all links associated with this annotation
        const annotationLinks = this.index.annotationToLink.get(id);
        if (!annotationLinks) return;
        for (const linkId of annotationLinks) {
          const link = this.index.links.get(linkId);
          if (!link) continue;
          const arrow = state.getFeature(link.arrow) as Arrow;
          // modify the object if passed
          if (arrow) this.remove(arrow, link.side);
          else {
            // otherwise remove by id (happens when deleting the arrow from the state)
            this.remove(link.arrow, link.side);
          }
        }
      }
    });

    // Detect programmatic position/size changes in annotations with linked arrows
    // and refresh those arrows so they stay connected.
    const linksToRefresh: LinksByArrowId = new Map();
    for (const id of oldIds) {
      const newFeature = newFeatures[id];
      if (!newFeature || !this.index.annotationToLink.has(id)) continue;

      const prevFeature = prevFeatures[id];
      // Coordinates reference changes when geometry is explicitly set (position change).
      // Properties reference changes when width/height or other layout props change.
      const positionChanged =
        prevFeature.geometry.coordinates !== newFeature.geometry.coordinates;
      const sizeChanged =
        (prevFeature.properties as { width?: number; height?: number })
          .width !==
          (newFeature.properties as { width?: number; height?: number })
            .width ||
        (prevFeature.properties as { width?: number; height?: number })
          .height !==
          (newFeature.properties as { width?: number; height?: number })
            .height;

      if (!positionChanged && !sizeChanged) continue;

      const annotationLinks = this.index.annotationToLink.get(id)!;
      for (const linkId of annotationLinks) {
        const link = this.index.links.get(linkId);
        if (!link) continue;
        const arrowId = link.arrow;
        if (this.index.linksByArrowId.has(arrowId)) {
          linksToRefresh.set(arrowId, this.index.linksByArrowId.get(arrowId)!);
        }
      }
    }

    if (linksToRefresh.size > 0) this._updateAndCommitSync(linksToRefresh);
  };

  public destroy() {
    clearTimeout(this.commitTimeout);
    clearTimeout(this.nodePositionTimeout);
    this.ogma.events
      .off(this.onSetMultipleAttributes)
      .off(this.onAddRemoveEdges)
      .off(this.refresh);
  }
}
