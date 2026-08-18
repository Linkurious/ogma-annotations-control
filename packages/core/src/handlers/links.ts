import type {
  Node,
  NodeId,
  EdgeId,
  NodeList,
  Ogma,
  Point,
  EdgeList,
  Edge,
  EdgesEvent
} from "@linkurious/ogma";
import { geometry } from "@linkurious/ogma";
import { Position } from "geojson";
import { nanoid as getId } from "nanoid";
import { Snapping } from "./snapping";
import { SIDE_END, SIDE_START, TARGET_TYPES } from "../constants";
import { Store } from "../store";
import type {
  Arrow,
  Id,
  Magnet,
  TargetType,
  Link,
  Side,
  Text,
  Annotation,
  DeepPartial,
  Comment
} from "../types";
import {
  isBox,
  isText,
  isPolygon,
  isComment,
  isArrow,
  getCommentSize,
  isRigidConnector
} from "../types";
import {
  getArrowSide,
  getBoxCenter,
  getBoxSize,
  getPolygonBounds,
  getPolygonCenter,
  throttle,
  updateBbox
} from "../utils/utils";
import { add, mul, subtract } from "../utils/vec";

type XYR = { x: number; y: number; radius: number };
type LinksByArrowId = Map<Id, { start?: Id; end?: Id }>;

const XYR_ATTRIBUTES: ["x", "y", "radius"] = ["x", "y", "radius"] as const;

const COMMIT_DEBOUNCE_MS = 1;
// Debounce window for updateFromNodePositions: waits one tick so Ogma has
// finished writing the node's new x/y/radius attributes before we read them.
const NODE_POSITION_DEBOUNCE_MS = 1;
// Throttle for the zoom/rotation-driven fixedSize refresh — cheap enough to
// run near every frame without saturating the main thread.
const REFRESH_THROTTLE_MS = 20;
// A node-linked arrow snaps to the node's center once its endpoint gets this
// close to it (as a fraction of the node's radius), instead of resting on
// the node's edge.
const NODE_CENTER_SNAP_RADIUS_FRACTION = 0.5;

/**
 * Converts a serialized { x, y } magnet (ExportedLink format) to the typed
 * internal Magnet union. Called once per link in Links.add().
 * For polygons, `raw` must already be bbox-relative (the conversion from
 * absolute graph coords happens in add() before this is called).
 */
function toMagnet(raw: Point, targetType: TargetType): Magnet {
  if (targetType === TARGET_TYPES.NODE)
    return { type: "node", center: raw.x === 0 && raw.y === 0 };
  if (targetType === TARGET_TYPES.EDGE)
    return { type: "edge", t: raw.x };
  if (targetType === TARGET_TYPES.POLYGON)
    return { type: "polygon", rx: raw.x, ry: raw.y };
  // text, box, comment — center-relative fraction of dimension
  return { type: "box", nx: raw.x, ny: raw.y };
}

/**
 * Class that implements linking between annotation arrows and different items.
 * An arrow can be connected to a text or to a node. It supports double indexing
 * so that you could get the arrow by the id of the text or the id of the node
 * or by the id of the arrow id itself.
 * A node or text can be connected to multiple arrows.
 * An arrow can be connected to only one node or text, but on both ends.
 */
export class Links {
  private links: Map<Id, Link> = new Map();
  private nodeToLink: Map<Id, Set<Id>> = new Map();
  private edgeToLink: Map<EdgeId, Set<Id>> = new Map();
  private annotationToLink: Map<Id, Set<Id>> = new Map();
  private linksByArrowId: LinksByArrowId = new Map();
  private store: Store;
  private ogma: Ogma;
  private snapping: Snapping;
  private updatedItems = new Set<Id>();
  private onLinkCreated?: (arrow: Arrow, link: Link) => void;
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
    this.onLinkCreated = onLinkCreated;

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

    const links = this.annotationToLink.get(annotationId);

    if (!links) return;

    const rigidComments = new Set<Id>();

    for (const linkId of links) {
      const link = this.links.get(linkId);
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
      const rigidComment = this._getRigidFollowComment(link.arrow, link);
      if (rigidComment && !visited.has(rigidComment.id))
        rigidComments.add(rigidComment.id);
    }

    for (const commentId of rigidComments) {
      const comment = state.getFeature(commentId) as Comment | undefined;
      if (!comment) continue;
      this._translateComment(comment, displacement, liveUpdates);

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
    const links = this.annotationToLink.get(annotationId);

    if (!links) return;
    for (const linkId of links) {
      const link = this.links.get(linkId);
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
    // True when `magnet` is already the final bbox-relative fraction this
    // class itself produces and persists (arrow.properties.link[side].magnet
    // - what a round-tripped export/import carries) rather than a fresh
    // absolute point picked up by hit-testing/snapping. Every other target
    // type stores its magnet as-is either way, so this only matters for
    // polygon, whose magnet IS an absolute point on the way in but a
    // relative fraction once stored - without this flag, re-adding a link
    // straight from its own (already-relative) serialized magnet - as the
    // import path and re-linking on comment creation both legitimately need
    // to - would run it through the absolute-to-relative conversion a
    // second time and corrupt it.
    alreadyRelative = false
  ) {
    const id = getId();
    const arrowId = arrow.id;

    // For polygon annotations, convert absolute magnet to relative coordinates
    let adjustedMagnet = magnet;
    if (targetType === TARGET_TYPES.POLYGON && !alreadyRelative) {
      const state = this.store.getState();
      const annotation = state.getFeature(targetId);
      if (annotation && isPolygon(annotation)) {
        const bbox = getPolygonBounds(annotation);
        // Convert absolute coordinates to relative (0-1 range) based on bbox
        const bboxWidth = bbox[2] - bbox[0];
        const bboxHeight = bbox[3] - bbox[1];
        const ox = magnet.x - bbox[0];
        const oy = magnet.y - bbox[1];

        // Avoid division by zero
        const relativeX = bboxWidth > 0 ? ox / bboxWidth : 0.5;
        const relativeY = bboxHeight > 0 ? oy / bboxHeight : 0.5;

        adjustedMagnet = { x: relativeX, y: relativeY };
      }
    }

    // create a link — convert the serialized Point to the typed internal Magnet
    const link: Link = {
      id,
      arrow: arrowId,
      target: targetId,
      targetType,
      magnet: toMagnet(adjustedMagnet, targetType),
      side
    };
    if (targetType === TARGET_TYPES.NODE) {
      const node = this.ogma.getNode(targetId);
      if (!node) return;
    }
    if (targetType === TARGET_TYPES.EDGE) {
      const edge = this.ogma.getEdge(targetId);
      if (!edge) return;
    }
    // cleanup existing link on that side
    this.remove(arrow, side);
    // add it to the links
    this.links.set(id, link);
    // add it to the linksByTargetId
    const map =
      targetType === TARGET_TYPES.NODE
        ? this.nodeToLink
        : targetType === TARGET_TYPES.EDGE
          ? this.edgeToLink
          : this.annotationToLink;
    if (!map.has(targetId)) map.set(targetId, new Set());
    map.get(targetId)!.add(id);

    // add it to the linksByArrowId
    if (!this.linksByArrowId.has(arrowId)) {
      this.linksByArrowId.set(arrowId, {});
    }
    this.linksByArrowId.get(arrowId)![side] = id;

    // make it serializable
    arrow.properties.link = arrow.properties.link || {};
    arrow.properties.link[side] = {
      id: targetId,
      side,
      type: targetType,
      magnet: adjustedMagnet
    };

    // Emit link event if callback is provided
    if (this.onLinkCreated) {
      this.onLinkCreated(arrow, link);
    }

    return this;
  }

  public remove(arrow: Arrow | Id, side: Side) {
    const arrowId = typeof arrow === "object" ? arrow.id : arrow;
    const id = this.linksByArrowId.get(arrowId)?.[side];
    if (typeof arrow === "object") {
      delete arrow.properties.link?.[side];
    }
    if (!id) return this;
    const link = this.links.get(id);
    if (!link) return this;
    // remove the link from the links
    this.links.delete(id);
    // remove the link from the linksByTargetId
    this.nodeToLink.get(link.target)?.delete(id);
    this.edgeToLink.get(link.target as EdgeId)?.delete(id);
    this.annotationToLink.get(link.target)?.delete(id);
    // remove the link from the linksByArrowId
    if (this.linksByArrowId.has(arrowId)) {
      this.linksByArrowId.get(arrowId)![side] = undefined;
    }
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
    this.annotationToLink.forEach((linkIds, annotationId) => {
      const annotation = state.getFeature(annotationId);
      if (!annotation) return;

      // Check if this is a text with fixedSize enabled or a comment (comments always have fixedSize)
      // (only text and comments have fixedSize, boxes have scaled property instead)
      const hasFixedSize =
        (isText(annotation) && annotation.properties.style?.fixedSize) ||
        isComment(annotation); // Comments always have fixedSize

      if (hasFixedSize) {
        linkIds.forEach((linkId) => {
          const link = this.links.get(linkId);
          if (!link) return;
          const arrowId = link.arrow;
          linksToUpdate.set(arrowId, this.linksByArrowId.get(arrowId)!);
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
      const nodeLinks = this.nodeToLink.get(id);

      if (!nodeLinks) return;
      nodeLinks.forEach((linkId) => {
        const link = this.links.get(linkId);
        if (!link) return;
        const arrowId = link.arrow;
        links.set(arrowId, this.linksByArrowId.get(arrowId)!);
      });
    });

    // Also update arrows linked to edges connected to these nodes
    const edgeLinksToUpdate: LinksByArrowId = new Map();
    const affectedEdges = nodes.getAdjacentEdges();
    affectedEdges.getId().forEach((edgeId) => {
      const edgeLinks = this.edgeToLink.get(edgeId);
      if (!edgeLinks) return;
      edgeLinks.forEach((linkId) => {
        const link = this.links.get(linkId);
        if (!link) return;
        const arrowId = link.arrow;
        links.set(arrowId, this.linksByArrowId.get(arrowId)!);
        edgeLinksToUpdate.set(arrowId, this.linksByArrowId.get(arrowId)!);
      });
    });

    const xyr = nodes.getAttributes(XYR_ATTRIBUTES) as XYR[];
    const state = this.store.getState();
    const updates: Record<Id, DeepPartial<Annotation>> = {};
    for (let i = 0; i < ids.length; i++) {
      const nodeId = ids[i];
      const nodeLinks = this.nodeToLink.get(nodeId);
      if (!nodeLinks) continue;
      for (const linkId of nodeLinks) {
        const link = this.links.get(linkId);
        if (!link) continue;
        const arrowId = link.arrow;
        const arrow = this.store.getState().getFeature(arrowId) as Arrow;
        const coordinates = arrow.geometry.coordinates.slice();
        const end = getArrowSide(arrow, SIDE_END);
        const start = getArrowSide(arrow, SIDE_START);
        const nodeSideIndex = link.side === SIDE_START ? 0 : 1;

        const positionAndRadius = xyr[i];
        // Update the arrow's position
        const snapPoint = this._getNodeSnapPoint(
          positionAndRadius,
          mul(subtract(end, start), -1),
          this._isLinkedToCenter(link)
        );

        // Rigid-follow: when the arrow's *other* endpoint is attached to a
        // comment in "rigid" mode (the default), dragging the node carries
        // the whole callout (comment + arrow) by the node's delta instead of
        // stretching the line. The arrow keeps its length and angle; the
        // comment translates with the node.
        const comment = this._getRigidFollowComment(arrowId, link);
        if (comment) {
          const oldNodePoint = coordinates[nodeSideIndex];
          const delta = subtract(
            { x: snapPoint[0], y: snapPoint[1] },
            { x: oldNodePoint[0], y: oldNodePoint[1] }
          );
          coordinates[0] = [coordinates[0][0] + delta.x, coordinates[0][1] + delta.y];
          coordinates[1] = [coordinates[1][0] + delta.x, coordinates[1][1] + delta.y];

          this._translateComment(comment, delta, updates);
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
    if (!edges.size || !this.edgeToLink.size) return;
    const links: LinksByArrowId = new Map();
    // Also update arrows linked to edges connected to these nodes
    const edgeLinksToUpdate: LinksByArrowId = new Map();
    edges
      .getParallelEdges()
      .getId()
      .forEach((edgeId) => {
        const edgeLinks = this.edgeToLink.get(edgeId);
        if (!edgeLinks) return;
        edgeLinks.forEach((linkId) => {
          const link = this.links.get(linkId);
          if (!link) return;
          const arrowId = link.arrow;
          links.set(arrowId, this.linksByArrowId.get(arrowId)!);
          edgeLinksToUpdate.set(arrowId, this.linksByArrowId.get(arrowId)!);
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

  update(linksByArrowId: LinksByArrowId = this.linksByArrowId) {
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
    const nodeIds = Array.from(this.nodeToLink.keys());
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
      const start = this.links.get(links.start!);
      const end = this.links.get(links.end!);
      const arrow = state.getFeature(arrowId) as Arrow;

      let startPoint = arrow.geometry.coordinates[0];
      let endPoint = arrow.geometry.coordinates[1];

      const startCenter = start
        ? start.targetType === TARGET_TYPES.NODE
          ? xyr[nodeIdToIndex.get(start.target)!]
          : start.targetType === TARGET_TYPES.EDGE
            ? this._getEdgeSnapPoint(
                start.target as EdgeId,
                (start.magnet as { t: number }).t,
                true
              )
            : this._getAnnotationCenter(state.getFeature(start.target)!)
        : { x: startPoint[0], y: startPoint[1] };

      const endCenter = end
        ? end.targetType === TARGET_TYPES.NODE
          ? xyr[nodeIdToIndex.get(end.target)!]
          : end.targetType === TARGET_TYPES.EDGE
            ? this._getEdgeSnapPoint(end.target as EdgeId, (end.magnet as { t: number }).t, true)
            : this._getAnnotationCenter(state.getFeature(end.target)!)
        : { x: endPoint[0], y: endPoint[1] };

      const vec = subtract(endCenter, startCenter);
      if (start) {
        if (start.targetType === TARGET_TYPES.NODE) {
          startPoint = this._getNodeSnapPoint(
            startCenter as XYR,
            vec,
            this._isLinkedToCenter(start)
          );
        } else if (start.targetType === TARGET_TYPES.EDGE) {
          startPoint = this._getEdgeSnapPoint(
            start.target as EdgeId,
            (start.magnet as { t: number }).t
          );
        } else {
          const annotation = state.getMergedFeature(start.target)!;
          startPoint = this._getAnnotationSnapPoint(
            annotation,
            endCenter,
            start,
            state.zoom
          );
        }
      }
      if (end) {
        if (end.targetType === TARGET_TYPES.NODE) {
          endPoint = this._getNodeSnapPoint(
            endCenter as XYR,
            mul(vec, -1),
            this._isLinkedToCenter(end)
          );
        } else if (end.targetType === TARGET_TYPES.EDGE) {
          endPoint = this._getEdgeSnapPoint(
            end.target as EdgeId,
            (end.magnet as { t: number }).t
          );
        } else {
          const annotation = state.getMergedFeature(end.target)!;
          endPoint = this._getAnnotationSnapPoint(
            annotation,
            startCenter,
            end,
            state.zoom
          );
        }
      }
      // Rigid-follow: when one side is anchored to a comment in "rigid" mode
      // and the *other* side actually moved, translate the comment (and this
      // endpoint) by that delta instead of letting the comment side
      // re-anchor elastically to the nearest point on the box.
      const startComment = this._getRigidComment(start);
      const endComment = this._getRigidComment(end);

      if (startComment && end) {
        const oldEnd = arrow.geometry.coordinates[1];
        const delta = { x: endPoint[0] - oldEnd[0], y: endPoint[1] - oldEnd[1] };
        if (delta.x !== 0 || delta.y !== 0) {
          const oldStart = arrow.geometry.coordinates[0];
          startPoint = [oldStart[0] + delta.x, oldStart[1] + delta.y];
          this._translateComment(startComment, delta, updates);
        }
      } else if (endComment && start) {
        const oldStart = arrow.geometry.coordinates[0];
        const delta = { x: startPoint[0] - oldStart[0], y: startPoint[1] - oldStart[1] };
        if (delta.x !== 0 || delta.y !== 0) {
          const oldEnd = arrow.geometry.coordinates[1];
          endPoint = [oldEnd[0] + delta.x, oldEnd[1] + delta.y];
          this._translateComment(endComment, delta, updates);
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
          true
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
          true
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
        const annotationLinks = this.annotationToLink.get(id);
        if (!annotationLinks) return;
        for (const linkId of annotationLinks) {
          const link = this.links.get(linkId);
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
      if (!newFeature || !this.annotationToLink.has(id)) continue;

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

      const annotationLinks = this.annotationToLink.get(id)!;
      for (const linkId of annotationLinks) {
        const link = this.links.get(linkId);
        if (!link) continue;
        const arrowId = link.arrow;
        if (this.linksByArrowId.has(arrowId)) {
          linksToRefresh.set(arrowId, this.linksByArrowId.get(arrowId)!);
        }
      }
    }

    if (linksToRefresh.size > 0) this._updateAndCommitSync(linksToRefresh);
  };

  private _isLinkedToCenter(link: Link) {
    return link.magnet.type === "node" && link.magnet.center;
  }

  /**
   * Rigid-follow guard: returns the linked Comment when this arrow's *other*
   * endpoint (relative to `nodeSideLink`) is attached to a comment whose
   * connector mode is "rigid" (the default). In that case a node drag should
   * translate the whole callout (comment + arrow) rather than just moving
   * the node-side endpoint. Returns undefined when the far side isn't a
   * comment, or the comment opted into "elastic" mode.
   */
  private _getRigidFollowComment(
    arrowId: Id,
    nodeSideLink: Link
  ): Comment | undefined {
    const arrowLinks = this.linksByArrowId.get(arrowId);
    if (!arrowLinks) return undefined;

    // The far side is whichever end isn't the one anchored to the moved node.
    const farLinkId =
      nodeSideLink.side === SIDE_START ? arrowLinks.end : arrowLinks.start;
    if (!farLinkId) return undefined;

    const farLink = this.links.get(farLinkId);
    if (!farLink || farLink.targetType !== TARGET_TYPES.COMMENT) return undefined;

    return this._getRigidComment(farLink);
  }

  /**
   * Returns the Comment targeted by `link`, when it's a comment link whose
   * connector mode is "rigid". Shared eligibility check for both the
   * node-drag path and the generic (edge / annotation move) path.
   */
  private _getRigidComment(link: Link | undefined): Comment | undefined {
    if (!link || link.targetType !== TARGET_TYPES.COMMENT) return undefined;
    const comment = this.store.getState().getFeature(link.target);
    if (!comment || !isComment(comment)) return undefined;
    if (!isRigidConnector(comment)) return undefined;
    return comment;
  }

  /**
   * Translate a comment by `delta` and stage the update, mirroring the
   * rigid-follow handling in `updateFromNodePositions`.
   */
  private _translateComment(
    comment: Comment,
    delta: Point,
    updates: Record<Id, DeepPartial<Annotation>>
  ) {
    const [cx, cy] = comment.geometry.coordinates as [number, number];
    const commentUpdate: DeepPartial<Comment> = {
      ...comment,
      geometry: {
        type: "Point",
        coordinates: [cx + delta.x, cy + delta.y]
      }
    };
    updates[comment.id] = commentUpdate as Annotation;
    updateBbox(commentUpdate as Comment);
    this.updatedItems.add(comment.id);
  }

  private _getAnnotationCenter(annotation: Annotation): Point {
    if (isPolygon(annotation)) return getPolygonCenter(annotation);
    return getBoxCenter(annotation as Text);
  }

  private _getAnnotationSnapPoint(
    annotation: Annotation,
    point: Point,
    link: Link,
    zoom: number
  ): Position {
    // For polygons, the magnet point is stored as relative coordinates (0-1 range)
    // based on the bounding box, similar to boxes
    if (isPolygon(annotation)) {
      const bbox = getPolygonBounds(annotation);
      // PolygonMagnet: rx/ry are 0-1 fractions of the bbox from top-left
      const m = link.magnet as { rx: number; ry: number };
      const x = bbox[0] + m.rx * (bbox[2] - bbox[0]);
      const y = bbox[1] + m.ry * (bbox[3] - bbox[1]);
      return [x, y];
    }
    return this._getBoxSnapPoint(annotation, point, link, zoom);
  }

  private _getBoxSnapPoint(
    box: Annotation,
    _point: Point,
    link: Link,
    zoom: number
  ): [number, number] {
    const center = getBoxCenter(box);
    // Comments use getCommentSize so collapsed mode returns iconSize dimensions
    let { width, height } = isComment(box)
      ? getCommentSize(box as Comment)
      : getBoxSize(box);

    // Handle fixedSize for Text and Comment (comments always have fixedSize)
    const hasFixedSize =
      (isText(box) && box.properties.style?.fixedSize) || isComment(box);

    if (hasFixedSize) {
      width /= zoom;
      height /= zoom;
    }

    // Magnet is BoxMagnet: center-relative fractions of width/height
    const m = link.magnet as { nx: number; ny: number };
    let offsetX = m.nx * width;
    let offsetY = m.ny * height;

    // Texts are counter-rotated (but not boxes or comments - they are screen-aligned)
    if (isText(box) && !isBox(box)) {
      const { sin, cos } = this.store.getState();
      // Rotate the offset by the current rotation
      const rotatedX = offsetX * cos - offsetY * sin;
      const rotatedY = offsetX * sin + offsetY * cos;
      offsetX = rotatedX;
      offsetY = rotatedY;
    }
    // Note: Comments use the same box calculation as other fixed-size elements.
    // The width/height are already converted to graph space above when hasFixedSize is true.

    return [center.x + offsetX, center.y + offsetY];
  }

  private _getNodeSnapPoint(
    xyr: XYR,
    vec: Point,
    center: boolean
  ): [number, number] {
    if (center) return [xyr.x, xyr.y];
    const dist = Math.sqrt(vec.x * vec.x + vec.y * vec.y);
    const unit = mul(vec, 1 / dist);
    const snapPoint =
      dist < Number(xyr.radius) * NODE_CENTER_SNAP_RADIUS_FRACTION
        ? { x: xyr.x, y: xyr.y }
        : add({ x: xyr.x, y: xyr.y }, mul(unit, -Number(xyr.radius)));
    return [snapPoint.x, snapPoint.y];
  }

  private _getEdgeSnapPoint(edgeId: EdgeId, t: number, asPoint: true): Point;
  private _getEdgeSnapPoint(
    edgeId: EdgeId,
    t: number,
    asPoint?: false
  ): Position;

  private _getEdgeSnapPoint(
    edgeId: EdgeId,
    t: number,
    asPoint = false
  ): Position | Point {
    const edge = this.ogma.getEdge(edgeId);
    if (!edge) return [0, 0];

    // @ts-expect-error curvature exists on edges
    const curvature = edge.getAttribute("curvature") as number;
    const extremities = edge.getExtremities();
    const positions = extremities.getPosition();
    const source = positions[0];
    const target = positions[1];

    if (curvature === 0 || curvature === undefined) {
      // Straight edge - linear interpolation
      const res = [
        source.x + t * (target.x - source.x),
        source.y + t * (target.y - source.y)
      ];
      return asPoint ? { x: res[0], y: res[1] } : res;
    }

    // Curved edge - use quadratic bezier
    const cp = geometry.getQuadraticCurveControlPoint(
      source.x,
      source.y,
      target.x,
      target.y,
      curvature
    );
    const point = geometry.getPointOnQuadraticCurve(
      t,
      source.x,
      source.y,
      target.x,
      target.y,
      cp.x,
      cp.y
    );
    return asPoint ? { x: point.x, y: point.y } : [point.x, point.y];
  }

  public destroy() {
    clearTimeout(this.commitTimeout);
    clearTimeout(this.nodePositionTimeout);
    this.ogma.events
      .off(this.onSetMultipleAttributes)
      .off(this.onAddRemoveEdges)
      .off(this.refresh);
  }
}
