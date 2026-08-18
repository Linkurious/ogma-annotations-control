import type { EdgeId, Ogma, Point } from "@linkurious/ogma";
import { nanoid as getId } from "nanoid";
import { TARGET_TYPES } from "../constants";
import { Store } from "../store";
import type { Arrow, Id, Magnet, TargetType, Link, Side } from "../types";
import { isPolygon } from "../types";
import { getPolygonBounds } from "../utils/utils";

export type LinksByArrowId = Map<Id, { start?: Id; end?: Id }>;

/**
 * How to interpret the `magnet` passed to {@link LinkIndex.add}:
 * - "absolute": a fresh point in graph coordinates, e.g. from hit-testing or
 *   snapping. The default — every caller doing a live snap/link wants this.
 * - "stored": already this class's own persisted format
 *   (`arrow.properties.link[side].magnet`) — for a polygon target that's the
 *   bbox-relative fraction `add()` itself produces, for every other target
 *   type it's the same value either way. Passing "absolute" for a magnet
 *   that's actually already-relative would run a polygon's fraction through
 *   the absolute-to-relative conversion a second time and corrupt it — the
 *   case a round-tripped export/import, or re-linking on comment creation,
 *   legitimately hits.
 */
export type MagnetSource = "absolute" | "stored";

/**
 * Converts a serialized { x, y } magnet (ExportedLink format) to the typed
 * internal Magnet union. Called once per link in LinkIndex.add().
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
 * The link registry: double-indexed bookkeeping so an arrow can be looked up
 * by its own id or by the id of whatever it's attached to (node, edge, or
 * another annotation), on either end.
 *
 * Holds no drag/commit/event-wiring logic of its own - see {@link Links}
 * for the orchestration built on top of this.
 */
export class LinkIndex {
  links: Map<Id, Link> = new Map();
  nodeToLink: Map<Id, Set<Id>> = new Map();
  edgeToLink: Map<EdgeId, Set<Id>> = new Map();
  annotationToLink: Map<Id, Set<Id>> = new Map();
  linksByArrowId: LinksByArrowId = new Map();

  private ogma: Ogma;
  private store: Store;
  private onLinkCreated?: (arrow: Arrow, link: Link) => void;

  constructor(
    ogma: Ogma,
    store: Store,
    onLinkCreated?: (arrow: Arrow, link: Link) => void
  ) {
    this.ogma = ogma;
    this.store = store;
    this.onLinkCreated = onLinkCreated;
  }

  add(
    arrow: Arrow,
    side: Side,
    targetId: Id,
    targetType: TargetType,
    magnet: Point,
    magnetSource: MagnetSource = "absolute"
  ) {
    const id = getId();
    const arrowId = arrow.id;

    // For polygon annotations, convert absolute magnet to relative coordinates
    let adjustedMagnet = magnet;
    if (targetType === TARGET_TYPES.POLYGON && magnetSource === "absolute") {
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

  remove(arrow: Arrow | Id, side: Side) {
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
}
