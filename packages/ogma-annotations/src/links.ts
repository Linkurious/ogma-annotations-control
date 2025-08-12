import type { NodeList, Ogma, Point } from "@linkurious/ogma";
import { nanoid as getId } from "nanoid";
import type {
  Arrow,
  Id,
  TargetType,
  Link,
  Side,
  Text,
  AnnotationGetter
} from "./types";
import {
  getArrowSide,
  getAttachmentPointOnNode,
  getTextPosition,
  getTextSize,
  setArrowEndPoint
} from "./utils";
import { add, multiply, rotateRadians } from "./vec";

/**
 * Class that implements linking between annotation arrows and different items.
 * An arrow can be connected to a text or to a node. It supports double indexing
 * so that you could get the arrow by the id of the text or the id of the node
 * or by the id of the arrow id itself.
 * A node or text can be connected to multiple arrows.
 * An arrow can be connected to only one node or text, but on both ends.
 */
export class Links {
  private links: Record<Id, Link> = {};
  private linksByTargetId: Record<Id, Id[]> = {};
  private linksByArrowId: Record<Id, { start?: Id; end?: Id }> = {};

  constructor(private ogma: Ogma) {}

  public add(
    arrow: Arrow,
    side: Side,
    targetId: Id,
    targetType: TargetType,
    connectionPoint: Point
  ) {
    const id = getId();
    const arrowId = arrow.id;
    // create a link
    const link: Link = {
      id,
      arrow: arrowId,
      target: targetId,
      targetType,
      connectionPoint,
      side
    };
    // add it to the links
    this.links[id] = link;
    // add it to the linksByTargetId
    if (!this.linksByTargetId[targetId]) {
      this.linksByTargetId[targetId] = [];
    }
    this.linksByTargetId[targetId].push(id);

    // add it to the linksByArrowId
    if (!this.linksByArrowId[arrowId]) {
      this.linksByArrowId[arrowId] = {};
    }
    this.linksByArrowId[arrowId][side] = id;

    // make it serializable
    arrow.properties.link = arrow.properties.link || {};
    arrow.properties.link[side] = {
      id: targetId,
      side,
      type: targetType,
      magnet: connectionPoint
    };
    return this;
  }

  public arrowIsLinked(arrowId: Id, side: Side) {
    return !!this.linksByArrowId[arrowId]?.[side];
  }

  // remove the link between the arrow and the target by arrow id and side
  public remove(arrow: Arrow, side: Side) {
    const arrowId = arrow.id;
    const id = this.linksByArrowId[arrowId]?.[side];
    delete arrow.properties.link?.[side];
    if (!id) return this;
    const link = this.links[id];
    // remove the link from the links
    delete this.links[id];
    // remove the link from the linksByTargetId
    const targetLinks = this.linksByTargetId[link.target];
    for (let i = 0; i < targetLinks.length; i++) {
      if (targetLinks[i] === id) {
        targetLinks.splice(i, 1);
        break;
      }
    }
    // remove the link from the linksByArrowId
    delete this.linksByArrowId[arrowId][side];
    return this;
  }

  getArrowLink(arrowId: Id, side: Side): Link | null {
    const id = this.linksByArrowId[arrowId]?.[side];
    if (!id) return null;
    return this.links[id];
  }

  getTargetLinks(targetId: Id, type: TargetType): Link[] {
    return (
      this.linksByTargetId[targetId]
        ?.map((id) => this.links[id])
        .filter((l) => l.targetType === type) ?? []
    );
  }

  forEach(cb: (link: Link) => void) {
    Object.values(this.links).forEach(cb);
  }

  refreshLinks(getAnnotation: AnnotationGetter) {
    let shouldRefresh = false;
    const angle = this.ogma.view.getAngle();
    this.forEach(({ connectionPoint, targetType, target, arrow, side }) => {
      // @ts-expect-error I don't understand why TS is complaining
      if (targetType !== "text" || targetType !== "box") return;
      shouldRefresh = true;

      const text = getAnnotation(target) as Text;
      const a = getAnnotation(arrow) as Arrow;
      const size = getTextSize(text);
      const position = getTextPosition<Text>(text);

      const m = multiply(connectionPoint!, { x: size.width, y: size.height });
      const r = rotateRadians(m, angle);
      const point = add(r, position);
      setArrowEndPoint(a, side, point.x, point.y);
    });
    return shouldRefresh;
  }

  updateLinksForNodes(
    nodes: NodeList,
    getAnnotation: AnnotationGetter,
    dx: number,
    dy: number
  ) {
    nodes.forEach((node) => {
      const links = this.getTargetLinks(node.getId(), "node");
      const pos = node.getPosition();
      links.forEach((link) => {
        const arrow = getAnnotation(link.arrow) as Arrow;
        const side = link.side;
        const otherSide = getArrowSide(
          arrow,
          side === "start" ? "end" : "start"
        );

        let anchor = pos; // graph space
        const r = +node.getAttribute("radius");
        const eps = 1e-6;
        if (
          link.connectionPoint.x - (pos.x - dx) > eps ||
          link.connectionPoint.y - (pos.y - dy) > eps
        ) {
          anchor = getAttachmentPointOnNode(otherSide, pos, r);
        }
        setArrowEndPoint(arrow, side, anchor.x, anchor.y);
      });
    });
  }

  updateTextLinks(links: Link[], text: Text, getAnnotation: AnnotationGetter) {
    const angle = this.ogma.view.getAngle();
    links.forEach((link) => {
      const arrow = getAnnotation(link.arrow) as Arrow;
      const size = getTextSize(text);
      const position = getTextPosition(text);

      const m = multiply(link.connectionPoint!, {
        x: size.width,
        y: size.height
      });
      const r = rotateRadians(m, angle);
      const pt = add(r, position);

      arrow.geometry.coordinates[link.side === "start" ? 0 : 1] = [pt.x, pt.y];
    });
  }
}
