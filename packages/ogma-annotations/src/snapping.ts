import type Ogma from "@linkurious/ogma";
import type { Node, Point } from "@linkurious/ogma";
import { Texts } from "./Editor/Texts";
import { Links } from "./links";
import { Arrow, ControllerOptions, Text } from "./types";
import {
  getArrowSide,
  getTextPosition,
  getTextSize,
  setArrowEndPoint,
  getAttachmentPointOnNode
} from "./utils";
import { subtract, rotateRadians, add, multiply, length } from "./vec";

type EndType = "start" | "end";

const MAGNETS: Point[] = [
  { x: 0, y: 0 },
  { x: 0.5, y: 0 },
  { x: 1, y: 0 },
  { x: 0, y: 0.5 },
  { x: 1, y: 0.5 },
  { x: 0, y: 1 },
  { x: 0.5, y: 1 },
  { x: 1, y: 1 }
];

type MagnetPoint = {
  point: Point;
  magnet: Point;
};

export class Snapping {
  private ogma: Ogma;
  private options: ControllerOptions;
  private texts: Texts;
  private links: Links;
  private hoveredNode: Node | null = null;

  constructor(
    ogma: Ogma,
    options: ControllerOptions,
    texts: Texts,
    links: Links
  ) {
    this.ogma = ogma;
    this.options = options;
    this.texts = texts;
    this.links = links;
  }

  public snapToText(arrow: Arrow, side: EndType, point: Point): boolean {
    const text = this.texts.detect(point, this.options.detectMargin);
    this.links.remove(arrow, side);
    if (!text) return false;

    const anchor = this.findMagnetPoint(MAGNETS, text, point);
    if (anchor) {
      setArrowEndPoint(arrow, side, anchor.point.x, anchor.point.y);
      this.links.add(arrow, side, text.id, "text", anchor.magnet);
      return true;
    }
    return false;
  }

  public findAndSnapToNode(arrow: Arrow, side: EndType, point: Point): void {
    const screenPoint = this.ogma.view.graphToScreenCoordinates(point);
    const element = this.ogma.view.getElementAt(screenPoint);
    this.links.remove(arrow, side);
    if (element && element.isNode) {
      this.hoveredNode?.setSelected(false);
      this.hoveredNode = element;
      element.setSelected(true);
      this.snapToNode(arrow, side, element, screenPoint);
    } else {
      this.hoveredNode?.setSelected(false);
      this.hoveredNode = null;
    }
  }

  private snapToNode(
    arrow: Arrow,
    side: EndType,
    node: Node,
    screenPoint: Point
  ): void {
    const pos = node.getPositionOnScreen();
    const r = +node.getAttribute("radius");
    const rpx = r * this.ogma.view.getZoom();
    const dx = screenPoint.x - pos.x;
    const dy = screenPoint.y - pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const nodeCenter = node.getPosition();

    if (dist < rpx + this.options.detectMargin) {
      let anchor = nodeCenter;
      if (dist > rpx / 2) {
        const otherEnd = getArrowSide(arrow, side === "end" ? "start" : "end");
        anchor = getAttachmentPointOnNode(otherEnd, anchor, r);
      }
      setArrowEndPoint(arrow, side, anchor.x, anchor.y);
      this.links.add(arrow, side, node.getId(), "node", anchor);
    }
  }

  public findMagnetPoint(
    magnets: Point[],
    textToMagnet: Text,
    point: Point
  ): MagnetPoint | undefined {
    let res: MagnetPoint | undefined;
    for (const magnet of magnets) {
      const size = getTextSize(textToMagnet);
      const position = getTextPosition(textToMagnet);
      const m = multiply(magnet, { x: size.width, y: size.height });
      const r = rotateRadians(m, this.ogma.view.getAngle());
      const mPoint = add(r, position);
      const dist = length(subtract(mPoint, point));
      const scaledRadius = Math.min(
        this.options.magnetRadius * this.ogma.view.getZoom(),
        size.width / 2,
        size.height / 2
      );
      if (dist < Math.max(scaledRadius, this.options.magnetHandleRadius)) {
        res = {
          point: mPoint,
          magnet
        };
        break;
      }
    }
    return res;
  }

  public getHoveredNode(): Node | null {
    return this.hoveredNode;
  }

  public clearHoveredNode(): void {
    this.hoveredNode?.setSelected(false);
    this.hoveredNode = null;
  }

  public getMagnets(): Point[] {
    return MAGNETS;
  }
}
