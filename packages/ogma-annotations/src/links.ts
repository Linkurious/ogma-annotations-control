import type { Node, NodeId, NodeList, Ogma, Point } from "@linkurious/ogma";
import { Position } from "geojson";
import { nanoid as getId } from "nanoid";
import { SIDE_END, SIDE_START } from "./constants";
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
import { isBox, isText, isPolygon, isComment } from "./types";
import {
  getArrowSide,
  getBoxCenter,
  getBoxSize,
  updateBbox
} from "./utils/utils";
import { add, mul, subtract } from "./utils/vec";

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
    this.store.subscribe((state) => state.zoom, this.refresh);
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
          )
            return [newEndPoint.x, newEndPoint.y];

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
      if (!node) return;
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
        const end = getArrowSide(arrow, SIDE_END);
        const start = getArrowSide(arrow, SIDE_START);

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
          : this._getAnnotationCenter(state.getFeature(start.target)!)
        : { x: startPoint[0], y: startPoint[1] };

      const endCenter = end
        ? end.targetType === "node"
          ? xyr[nodeIdToIndex.get(end.target)!]
          : this._getAnnotationCenter(state.getFeature(end.target)!)
        : { x: endPoint[0], y: endPoint[1] };

      const vec = subtract(endCenter, startCenter);
      if (start) {
        if (start.targetType === "node") {
          startPoint = this._getNodeSnapPoint(
            startCenter as XYR,
            vec,
            this._isLinkedToCenter(start)
          );
        } else {
          const annotation = state.getFeature(start.target)!;
          startPoint = this._getAnnotationSnapPoint(
            annotation,
            endCenter,
            start,
            state.zoom
          );
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
          const annotation = state.getFeature(end.target)!;
          endPoint = this._getAnnotationSnapPoint(
            annotation,
            startCenter,
            end,
            state.zoom
          );
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
        const linkData = arrow.properties.link.start;
        // Only add link if target exists
        if (linkData.type === "node") {
          // Node existence will be checked in add()
          this.add(
            arrow,
            SIDE_START,
            linkData.id,
            linkData.type,
            linkData.magnet!
          );
        } else {
          // Check if annotation target exists (in current or new features)?
          this.add(
            arrow,
            SIDE_START,
            linkData.id,
            linkData.type,
            linkData.magnet!
          );
        }
      }
      if (arrow.properties.link?.end) {
        const linkData = arrow.properties.link.end;
        // Only add link if target exists
        if (linkData.type === "node") {
          // Node existence will be checked in add()
          this.add(
            arrow,
            SIDE_END,
            linkData.id,
            linkData.type,
            linkData.magnet!
          );
        } else {
          // Check if annotation target exists (in current or new features)?
          this.add(
            arrow,
            SIDE_END,
            linkData.id,
            linkData.type,
            linkData.magnet!
          );
        }
      }
    });
  };

  private _isLinkedToCenter(link: Link) {
    return link.magnet.x === 0 && link.magnet.y === 0;
  }

  private _getAnnotationCenter(annotation: Annotation): Point {
    if (isPolygon(annotation)) {
      const bbox = annotation.geometry.bbox;
      if (bbox) {
        return {
          x: (bbox[0] + bbox[2]) / 2,
          y: (bbox[1] + bbox[3]) / 2
        };
      }
      // Fallback: calculate from coordinates
      const coords = annotation.geometry.coordinates[0];
      const xs = coords.map((c) => c[0]);
      const ys = coords.map((c) => c[1]);
      return {
        x: (Math.min(...xs) + Math.max(...xs)) / 2,
        y: (Math.min(...ys) + Math.max(...ys)) / 2
      };
    }
    return getBoxCenter(annotation as Text);
  }

  private _getAnnotationSnapPoint(
    annotation: Annotation,
    point: Point,
    link: Link,
    zoom: number
  ): Position {
    // For polygons, the magnet point is stored as absolute coordinates
    // (not relative like boxes), so we just return it directly
    if (isPolygon(annotation)) return [link.magnet.x, link.magnet.y];
    return this._getBoxSnapPoint(annotation, point, link, zoom);
  }

  private _getBoxSnapPoint(
    box: Annotation,
    _point: Point,
    link: Link,
    zoom: number
  ): [number, number] {
    const center = getBoxCenter(box);
    let { width, height } = getBoxSize(box);

    // Handle fixedSize for Text and Comment (comments always have fixedSize)
    const hasFixedSize =
      (isText(box) && box.properties.style?.fixedSize) || isComment(box);

    if (hasFixedSize) {
      width /= zoom;
      height /= zoom;
    }

    // Magnet is in center-relative coordinates
    let offsetX = link.magnet.x * width;
    let offsetY = link.magnet.y * height;

    // Texts are counter-rotated (but not boxes or comments - they are screen-aligned)
    if (isText(box) && !isBox(box)) {
      const { sin, cos } = this.store.getState();
      // Rotate the offset by the current rotation
      const rotatedX = offsetX * cos - offsetY * sin;
      const rotatedY = offsetX * sin + offsetY * cos;
      offsetX = rotatedX;
      offsetY = rotatedY;
    }

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
      dist < Number(xyr.radius) / 2
        ? { x: xyr.x, y: xyr.y }
        : add({ x: xyr.x, y: xyr.y }, mul(unit, -Number(xyr.radius)));
    return [snapPoint.x, snapPoint.y];
  }

  public destroy() {
    this.ogma.events.off(this.onSetMultipleAttributes);
  }
}
