import type { Node, NodeId, NodeList, Ogma, Point } from "@linkurious/ogma";
import { nanoid as getId } from "nanoid";
import { SIDE_END, SIDE_START } from "./constants";
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
import { getArrowSide, getBbox, getBoxCenter, updateBbox } from "./utils";
import { add, mul, subtract } from "./vec";

type XYR = { x: number; y: number; radius: number };
type LinksByArrowId = Map<Id, { start?: Id; end?: Id }>;

const XYR_ATTRIBUTES: ["x", "y", "radius"] = ["x", "y", "radius"] as const;
const COMMIT_DELAY = 100; // ms
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
  private linksByArrowId: LinksByArrowId = new Map();
  private store: Store;
  private ogma: Ogma;
  private updatedItems = new Set<Id>();

  constructor(ogma: Ogma, store: Store) {
    this.ogma = ogma;
    this.store = store;

    this.store.subscribe((state) => state.features, this.onAddArrow);
    // @ts-expect-error private event
    this.ogma.events.on("setMultipleAttributes", this.onSetMultipleAttributes);
  }

  /**
   * Called by handlers during drag operations to update linked arrows
   * This method applies live updates directly without causing recursion
   */
  public updateLinkedArrowsDuringDrag(annotationId: Id, displacement: Point) {
    const state = this.store.getState();
    const annotation = state.getFeature(annotationId) as Text;
    if (!annotation) return;

    const links = this.annotationToLink.get(annotationId);

    if (!links) return;

    for (const linkId of links) {
      const link = this.links.get(linkId);
      if (!link) continue;

      const arrow = state.getFeature(link.arrow) as Arrow;
      const currentEndPoint = getArrowSide(arrow, link.side);
      const newEndPoint = add(currentEndPoint, displacement);

      // Apply live update to the arrow
      const updatedGeometry = {
        ...arrow.geometry,
        coordinates: arrow.geometry.coordinates.map((coord, idx) => {
          if (
            (link.side === SIDE_START && idx === 0) ||
            (link.side === SIDE_END && idx === 1)
          ) {
            return [newEndPoint.x, newEndPoint.y];
          }
          return [...coord];
        })
      };

      state.applyLiveUpdate(arrow.id, {
        geometry: updatedGeometry
      } as Partial<Arrow>);
      this.updatedItems.add(arrow.id);
    }
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
    elements: Node | NodeList;
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

  private requestUpdateFromNodePositions(nodes: NodeList) {
    // debounce to next tick to get the real coordinates
    setTimeout(() => this.updateFromNodePositions(nodes), 1);
  }

  private updateFromNodePositions(nodes: NodeList) {
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

    const xyr = nodes.getAttributes(XYR_ATTRIBUTES) as XYR[];
    const state = this.store.getState();
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
        const start = getArrowSide(arrow, SIDE_END);
        const end = getArrowSide(arrow, SIDE_START);

        const positionAndRadius = xyr[i];
        // Update the arrow's position
        const snapPoint = this._getNodeSnapPoint(
          positionAndRadius,
          mul(subtract(end, start), -1),
          this._isLinkedToCenter(link)
        );
        coordinates[link.side === SIDE_START ? 0 : 1] = snapPoint;
        state.applyLiveUpdate(arrowId, {
          ...arrow,
          geometry: {
            coordinates
          }
        } as Arrow);
        this.updatedItems.add(arrowId);
        link.magnet = {
          x: snapPoint[0] - positionAndRadius.x,
          y: snapPoint[1] - positionAndRadius.y
        };
        updateBbox(arrow);
      }
    }

    this.debouncedCommit();
  }

  private debouncedCommit = (() => {
    let timeout: ReturnType<typeof setTimeout>;
    return () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        this.store.getState().batchUpdate(() => {
          this.store.getState().commitLiveUpdates(this.updatedItems);
        });
        this.updatedItems.clear();
      }, COMMIT_DELAY);
    };
  })();

  update(linksByArrowId: LinksByArrowId = this.linksByArrowId) {
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
    linksByArrowId.forEach((links, arrowId) => {
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
      this.updatedItems.add(arrow.id);
    });
    this.debouncedCommit();
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
          SIDE_START,
          arrow.properties.link.start.id,
          arrow.properties.link.start.type,
          arrow.properties.link.start.magnet!
        );
      }
      if (arrow.properties.link?.end) {
        this.add(
          arrow,
          SIDE_END,
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

  private _getNodeSnapPoint(
    xyr: XYR,
    vec: Point,
    center: boolean
  ): [number, number] {
    if (center) return [xyr.x, xyr.y];
    const dist = Math.sqrt(vec.x * vec.x + vec.y * vec.y);
    const unit = mul(vec, 1 / dist);
    const snapPoint =
      dist < Number(xyr.radius) / 2
        ? { x: xyr.x, y: xyr.y }
        : add({ x: xyr.x, y: xyr.y }, mul(unit, -Number(xyr.radius)));
    return [snapPoint.x, snapPoint.y];
  }

  public destroy() {
    this.ogma.events.off(this.onSetMultipleAttributes);
  }
}
