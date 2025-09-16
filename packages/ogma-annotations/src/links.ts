import type { NodeId, NodeList, Ogma, Point } from "@linkurious/ogma";
import { nanoid as getId } from "nanoid";
import { boxToSegmentIntersection } from "./geom";
import { Store } from "./store";
import type {
  Arrow,
  Id,
  TargetType,
  Link,
  Side,
  Text,
  Annotation
} from "./types";
import { getBbox, getBoxCenter } from "./utils";
import { add, mul, subtract } from "./vec";

type XYR = { x: number; y: number; radius: number };

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

    this.store.subscribe((state) => state.features, this.onAddArrow);
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

  public onSetMultipleAttributes = ({
    elements,
    updatedAttributes
  }: {
    elements: NodeList;
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
    this.update();
  };

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
    const angle = this.ogma.view.getAngle();
    this.linksByArrowId.forEach((links, arrowId) => {
      // case when both sides are linked
      const start = this.links.get(links.start!);
      const end = this.links.get(links.end!);
      const arrow = state.getFeature(arrowId) as Arrow;

      let startPoint = arrow.geometry.coordinates[0];
      let endPoint = arrow.geometry.coordinates[1];

      const startCenter = start
        ? start.targetType === "node"
          ? xyr[nodeIdToIndex.get(start.target)!]
          : getBoxCenter(state.getFeature(start.target) as Text)
        : { x: startPoint[0], y: startPoint[1] };

      const endCenter = end
        ? end.targetType === "node"
          ? xyr[nodeIdToIndex.get(end.target)!]
          : getBoxCenter(state.getFeature(end.target) as Text)
        : { x: endPoint[0], y: endPoint[1] };

      const vec = subtract(endCenter!, startCenter!);
      if (start) {
        if (start.targetType === "node") {
          startPoint = this._getNodeSnapPoint(
            startCenter as XYR,
            vec,
            this._isLinkedToCenter(start)
          );
        } else {
          const box = state.getFeature(start.target) as Text;
          startPoint = this._getBoxSnapPoint(box, endCenter, angle);
        }
      }
      if (end) {
        if (end.targetType === "node") {
          endPoint = this._getNodeSnapPoint(
            endCenter as XYR,
            mul(vec, -1),
            this._isLinkedToCenter(end)
          );
        } else {
          const box = state.getFeature(end.target) as Text;
          endPoint = this._getBoxSnapPoint(box, startCenter, angle);
        }
      }
      state.applyLiveUpdate(arrow.id, {
        geometry: {
          coordinates: [startPoint, endPoint]
        }
      } as Partial<Arrow>);
    });
    state.commitLiveUpdates();
  }

  private onAddArrow = (
    newFeatures: Record<string, Annotation>,
    prevFeatures: Record<string, Annotation>
  ) => {
    const state = this.store.getState();
    const oldIds = new Set(Object.keys(prevFeatures));
    const newIds = Object.keys(newFeatures).filter((id) => !oldIds.has(id));
    newIds.forEach((id) => {
      const feature = state.getFeature(id);
      if (!feature || feature.properties.type !== "arrow") return;
      const arrow = feature as Arrow;
      if (arrow.properties.link?.start) {
        this.add(
          arrow,
          "start",
          arrow.properties.link.start.id,
          arrow.properties.link.start.type,
          arrow.properties.link.start.magnet!
        );
      }
      if (arrow.properties.link?.end) {
        this.add(
          arrow,
          "end",
          arrow.properties.link.end.id,
          arrow.properties.link.end.type,
          arrow.properties.link.end.magnet!
        );
      }
    });
  };

  private _isLinkedToCenter(link: Link) {
    return link.magnet.x === 0 && link.magnet.y === 0;
  }

  private _getBoxSnapPoint(box: Text, point: Point, angle = 0) {
    const bb = getBbox(box);
    const intersection = boxToSegmentIntersection(
      { x: bb[0], y: bb[1], width: bb[2] - bb[0], height: bb[3] - bb[1] },
      angle,
      point
    );
    if (intersection) {
      return [intersection.x, intersection.y];
    }
    return [bb[0], bb[1]];
  }

  private _getNodeSnapPoint(xyr: XYR, vec: Point, center: boolean) {
    if (center) {
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
