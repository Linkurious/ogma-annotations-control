import type { EdgeId, NodeId, Ogma, Point } from "@linkurious/ogma";
import { geometry } from "@linkurious/ogma";
import { Position } from "geojson";
import { TARGET_TYPES } from "../constants";
import { AnnotationState, Store } from "../store";
import type { Annotation, Comment, Link, Text } from "../types";
import { isBox, isComment, isPolygon, isText, getCommentSize } from "../types";
import {
  getBoxCenter,
  getBoxSize,
  getPolygonBounds,
  getPolygonCenter
} from "../utils/utils";
import { add, mul } from "../utils/vec";

export type XYR = { x: number; y: number; radius: number };

// A node-linked arrow snaps to the node's center once its endpoint gets this
// close to it (as a fraction of the node's radius), instead of resting on
// the node's edge.
const NODE_CENTER_SNAP_RADIUS_FRACTION = 0.5;

/**
 * Pure(ish) geometry for arrow endpoints anchored to nodes, edges, and other
 * annotations - no link bookkeeping of its own, just `ogma`/`store` reads.
 * Extracted out of {@link Links} so the snap-point math is independently
 * readable/testable from the link registry and drag/commit orchestration.
 */
export class LinkGeometry {
  private ogma: Ogma;
  private store: Store;

  constructor(ogma: Ogma, store: Store) {
    this.ogma = ogma;
    this.store = store;
  }

  isLinkedToCenter(link: Link) {
    return link.magnet.type === "node" && link.magnet.center;
  }

  /**
   * The reference point an arrow endpoint pivots around: the node's own
   * position, a point on a curved/straight edge, or an annotation's center.
   * Shared by both the start and end side of `Links._computeArrowUpdates`.
   */
  resolveLinkCenter(
    link: Link,
    xyr: XYR[],
    nodeIdToIndex: Map<NodeId, number>,
    state: AnnotationState
  ): Point {
    if (link.targetType === TARGET_TYPES.NODE)
      return xyr[nodeIdToIndex.get(link.target)!];
    if (link.targetType === TARGET_TYPES.EDGE)
      return this.getEdgeSnapPoint(
        link.target as EdgeId,
        (link.magnet as { t: number }).t,
        true
      );
    return this.getAnnotationCenter(state.getFeature(link.target)!);
  }

  /**
   * The actual point an arrow endpoint snaps to for `link`, given the
   * already-resolved center for this side (`center`, from
   * {@link resolveLinkCenter}) and the *other* side's center (`otherCenter`,
   * used to orient box/polygon magnets and pick the node's edge-vs-center
   * point via `vec`). Shared by both the start and end side of
   * `Links._computeArrowUpdates`.
   */
  resolveLinkPoint(
    link: Link,
    center: Point,
    vec: Point,
    otherCenter: Point,
    state: AnnotationState
  ): Position {
    if (link.targetType === TARGET_TYPES.NODE)
      return this.getNodeSnapPoint(
        center as XYR,
        vec,
        this.isLinkedToCenter(link)
      );
    if (link.targetType === TARGET_TYPES.EDGE)
      return this.getEdgeSnapPoint(
        link.target as EdgeId,
        (link.magnet as { t: number }).t
      );
    const annotation = state.getMergedFeature(link.target)!;
    return this.getAnnotationSnapPoint(annotation, otherCenter, link, state.zoom);
  }

  getAnnotationCenter(annotation: Annotation): Point {
    if (isPolygon(annotation)) return getPolygonCenter(annotation);
    return getBoxCenter(annotation as Text);
  }

  getAnnotationSnapPoint(
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
    return this.getBoxSnapPoint(annotation, point, link, zoom);
  }

  getBoxSnapPoint(
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

  getNodeSnapPoint(xyr: XYR, vec: Point, center: boolean): [number, number] {
    if (center) return [xyr.x, xyr.y];
    const dist = Math.sqrt(vec.x * vec.x + vec.y * vec.y);
    const unit = mul(vec, 1 / dist);
    const snapPoint =
      dist < Number(xyr.radius) * NODE_CENTER_SNAP_RADIUS_FRACTION
        ? { x: xyr.x, y: xyr.y }
        : add({ x: xyr.x, y: xyr.y }, mul(unit, -Number(xyr.radius)));
    return [snapPoint.x, snapPoint.y];
  }

  getEdgeSnapPoint(edgeId: EdgeId, t: number, asPoint: true): Point;
  getEdgeSnapPoint(edgeId: EdgeId, t: number, asPoint?: false): Position;

  getEdgeSnapPoint(edgeId: EdgeId, t: number, asPoint = false): Position | Point {
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
}
