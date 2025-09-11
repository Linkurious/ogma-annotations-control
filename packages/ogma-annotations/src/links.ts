import type { NodeId, Ogma, Point } from "@linkurious/ogma";
import { nanoid as getId } from "nanoid";
import { Store } from "./store";
import type { Arrow, Id, TargetType, Link, Side, Text } from "./types";
import { getBbox } from "./utils";
import { add, mul, multiply, subtract } from "./vec";

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
  private annotationToLink: Map<Id, Set<Id>> = new Map();
  private linksByArrowId: Map<Id, { start?: Id; end?: Id }> = new Map();
  private store: Store;
  private ogma: Ogma;
  constructor(ogma: Ogma, store: Store) {
    this.ogma = ogma;
    this.store = store;
  }

  public add(
    arrow: Arrow,
    side: Side,
    targetId: Id,
    targetType: TargetType,
    magnet: Point
  ) {
    const id = getId();
    const arrowId = arrow.id;
    // create a link
    const link: Link = {
      id,
      arrow: arrowId,
      target: targetId,
      targetType,
      magnet,
      side
    };
    if (targetType === "node") {
      const node = this.ogma.getNode(targetId);
      if (!node) {
        return;
      }
    }
    // cleanup existing link on that side
    this.remove(arrow, side);
    // add it to the links
    this.links.set(id, link);
    // add it to the linksByTargetId
    const map = targetType === "node" ? this.nodeToLink : this.annotationToLink;
    if (!map.has(targetId)) {
      map.set(targetId, new Set());
    }
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
      magnet: magnet
    };
    return this;
  }

  public remove(arrow: Arrow, side: Side) {
    const arrowId = arrow.id;
    const id = this.linksByArrowId.get(arrowId)?.[side];
    delete arrow.properties.link?.[side];
    if (!id) return this;
    const link = this.links.get(id);
    if (!link) return this;
    // remove the link from the links
    this.links.delete(id);
    // remove the link from the linksByTargetId
    this.nodeToLink.get(link.target)?.delete(id);
    this.annotationToLink.get(link.target)?.delete(id);
    // remove the link from the linksByArrowId
    this.linksByArrowId.has(arrowId) &&
      (this.linksByArrowId.get(arrowId)![side] = undefined);
    return this;
  }

  getArrowLink(arrowId: Id, side: Side): Link | null {
    const id = this.linksByArrowId.get(arrowId)?.[side];
    if (!id) return null;
    return this.links.get(id) || null;
  }

  forEach(cb: (link: Link) => void) {
    this.links.forEach(cb);
  }

  update() {
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
    this.linksByArrowId.forEach((links, arrowId) => {
      // case when both sides are linked
      const start = this.links.get(links.start!);
      const end = this.links.get(links.end!);
      const arrow = state.getFeature(arrowId) as Arrow;
      let startPoint = arrow.geometry.coordinates[0];
      let endPoint = arrow.geometry.coordinates[1];
      if (start && end) {
        const startIndex = nodeIdToIndex.get(start.target)!;
        const endIndex = nodeIdToIndex.get(end.target)!;
        if (start.targetType === "node" && end.targetType === "node") {
          const vec = subtract(xyr[endIndex], xyr[startIndex]);
          startPoint = this._getNodeSnapPoint(xyr[startIndex], vec);
          endPoint = this._getNodeSnapPoint(xyr[endIndex], mul(vec, -1));
        } else if (start.targetType === "node") {
          // compute first the box snap point
          const box = state.getFeature(end.target) as Text;
          endPoint = this._getBoxSnapPoint(box, end);
          const vec = subtract(xyr[startIndex], {
            x: endPoint[0],
            y: endPoint[1]
          });
          startPoint = this._getNodeSnapPoint(xyr[startIndex], mul(vec, -1));
        } else if (end.targetType === "node") {
          const box = state.getFeature(start.target) as Text;
          const startPoint = this._getBoxSnapPoint(box, start);
          const vec = subtract(xyr[endIndex], {
            x: startPoint[0],
            y: startPoint[1]
          });
          endPoint = this._getNodeSnapPoint(xyr[endIndex], vec);
        }
      } else if (start) {
        const startIndex = nodeIdToIndex.get(start.target)!;
        if (start.targetType === "node") {
          const vec = subtract(
            { x: endPoint[0], y: endPoint[1] },
            { x: startPoint[0], y: startPoint[1] }
          );
          startPoint = this._getNodeSnapPoint(xyr[startIndex], vec);
        } else {
          const box = state.getFeature(start.target) as Text;
          startPoint = this._getBoxSnapPoint(box, start);
        }
      } else if (end) {
        const endIndex = nodeIdToIndex.get(end.target)!;
        if (end.targetType === "node") {
          const vec = subtract(
            { x: startPoint[0], y: startPoint[1] },
            { x: endPoint[0], y: endPoint[1] }
          );
          endPoint = this._getNodeSnapPoint(xyr[endIndex], vec);
        }
      }
      arrow.geometry.coordinates[0] = [startPoint[0], startPoint[1]];
      arrow.geometry.coordinates[1] = [endPoint[0], endPoint[1]];
    });
  }

  _getBoxSnapPoint(box: Text, link: Link) {
    const bb = getBbox(box);
    const point = add(
      { x: bb[0], y: bb[1] },
      multiply(link.magnet!, { x: bb[2] - bb[0], y: bb[3] - bb[1] })
    );
    return [point.x, point.y];
  }
  _getNodeSnapPoint(xyr: { x: number; y: number; radius: number }, vec: Point) {
    if (vec.x === 0 && vec.y === 0) {
      return [xyr.x, xyr.y];
    }
    const dist = Math.sqrt(vec.x * vec.x + vec.y * vec.y);
    const unit = mul(vec, 1 / dist);
    const snapPoint =
      dist < Number(xyr.radius) / 2
        ? { x: xyr.x, y: xyr.y }
        : add({ x: xyr.x, y: xyr.y }, mul(unit, -Number(xyr.radius)));
    return [snapPoint.x, snapPoint.y];
  }
}
