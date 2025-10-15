import type Ogma from "@linkurious/ogma";
import type { Node, NodeId, NodeList, Point } from "@linkurious/ogma";
import { Index } from "../interaction/spatialIndex";
import { Annotation, Id, Text, isArrow, isBox, isText } from "../types";
import { getBoxCenter, getBoxPosition, getBoxSize } from "../utils";
import { subtract, add, multiply, length, mul, dot } from "../vec";

const MAGNETS: Point[] = [
  { x: -0.5, y: -0.5 },
  { x: 0, y: -0.5 },
  { x: 0.5, y: -0.5 },
  { x: -0.5, y: 0 },
  { x: 0.5, y: 0 },
  { x: -0.5, y: 0.5 },
  { x: 0, y: 0.5 },
  { x: 0.5, y: 0.5 }
];
const xs = { x: 1, y: 0 };
const ys = { x: 0, y: 1 };

export type TextSnap = {
  point: Point;
  magnet: Point;
  type: "text";
  id: Id;
};

export type NodeSnap = {
  point: Point;
  id: NodeId;
  magnet: Point;
  type: "node";
};

export type Snap = TextSnap | NodeSnap;

type SnappingOptions = {
  /**
   * The color of the magnet points
   */
  // magnetColor: string;
  /**
   * The radius in which arrows are attracted
   */
  magnetRadius: number;
  /**
   * The margin in which the Texts are detected when looking for magnet points
   */
  detectMargin: number;
  /**
   * Display size of the magnet point
   */
  // magnetHandleRadius: number;

  /**
   * Placeholder for the text input
   */
  // textPlaceholder: string;

  /**
   * Size of the text handle
   */
  // textHandleSize: number;

  /**
   * Size of the arrow handle
   */
  // arrowHandleSize: number;

  /**
   * Minimum height of the arrow in units
   */
  // minArrowHeight: number;

  /**
   * Maximum height of the arrow in units
   */
  // maxArrowHeight: number;
};

export class Snapping extends EventTarget {
  private ogma: Ogma;
  private options: SnappingOptions;
  private spatialIndex: Index;
  private hoveredNode: Node | null = null;

  constructor(ogma: Ogma, options: SnappingOptions, spatialIndex: Index) {
    super();
    this.ogma = ogma;
    this.options = options;
    this.spatialIndex = spatialIndex;
  }

  public snap(annotation: Annotation, position: Point) {
    if (!isArrow(annotation)) return null;
    const snapping = this._findMagnet(position);
    if (!snapping) return null;
    return snapping;
  }

  private _findMagnet(point: Point) {
    const detectMargin = this.options.detectMargin;
    const snapWindow = {
      minX: point.x - detectMargin,
      minY: point.y - detectMargin,
      maxX: point.x + detectMargin,
      maxY: point.y + detectMargin
    };
    const texts = this.spatialIndex
      .search(snapWindow)
      .filter((a) => isText(a) || isBox(a)) as Text[];
    const snapToText = this._snapToText(point, texts);

    if (snapToText) return snapToText;

    const nodes = this.ogma.view.getElementsInside(
      snapWindow.minX,
      snapWindow.minY,
      snapWindow.maxX,
      snapWindow.maxY
    ).nodes;
    const snapToNode = this._snapToNodes(point, nodes);
    if (snapToNode) return snapToNode;
    return null;
  }

  private _snapToText(point: Point, texts: Text[]): TextSnap | null {
    for (const text of texts) {
      const center = getBoxCenter(text);
      const { width, height } = getBoxSize(text);

      for (const vec of MAGNETS) {
        const magnet = add(center, multiply(vec, { x: width, y: height }));
        const dist = length(subtract(magnet, point));
        if (dist >= this.options.magnetRadius) continue;
        return {
          point: { x: magnet.x, y: magnet.y },
          type: "text" as const,
          magnet: vec,
          id: text.id
        };
      }

      const position = getBoxPosition(text);
      const magnetRadius = this.options.magnetRadius;
      let snap:
        | {
            min: { x: number; y: number };
            max: { x: number; y: number };
            axis: { x: number; y: number };
            norm: { x: number; y: number };
          }
        | undefined;

      // Check top edge
      let min = { x: position.x, y: position.y };
      let max = { x: position.x + width, y: position.y };
      let norm = ys;
      let dist = dot(norm, { x: point.x - min.x, y: point.y - min.y });
      if (
        Math.abs(dist) < magnetRadius &&
        point.x >= min.x - magnetRadius &&
        point.x <= max.x + magnetRadius &&
        point.y >= min.y - magnetRadius &&
        point.y <= max.y + magnetRadius
      ) {
        snap = { min, max, axis: xs, norm };
      } else {
        // Check right edge
        min = { x: position.x + width, y: position.y };
        max = { x: position.x + width, y: position.y + height };
        norm = xs;
        dist = dot(norm, { x: point.x - min.x, y: point.y - min.y });
        if (
          Math.abs(dist) < magnetRadius &&
          point.x >= min.x - magnetRadius &&
          point.x <= max.x + magnetRadius &&
          point.y >= min.y - magnetRadius &&
          point.y <= max.y + magnetRadius
        ) {
          snap = { min, max, axis: ys, norm };
        } else {
          // Check bottom edge
          min = { x: position.x, y: position.y + height };
          max = { x: position.x + width, y: position.y + height };
          norm = ys;
          dist = dot(norm, { x: point.x - min.x, y: point.y - min.y });
          if (
            Math.abs(dist) < magnetRadius &&
            point.x >= min.x - magnetRadius &&
            point.x <= max.x + magnetRadius &&
            point.y >= min.y - magnetRadius &&
            point.y <= max.y + magnetRadius
          ) {
            snap = { min, max, axis: xs, norm };
          } else {
            // Check left edge
            min = { x: position.x, y: position.y };
            max = { x: position.x, y: position.y + height };
            norm = xs;
            dist = dot(norm, { x: point.x - min.x, y: point.y - min.y });
            if (
              Math.abs(dist) < magnetRadius &&
              point.x >= min.x - magnetRadius &&
              point.x <= max.x + magnetRadius &&
              point.y >= min.y - magnetRadius &&
              point.y <= max.y + magnetRadius
            ) {
              snap = { min, max, axis: ys, norm };
            }
          }
        }
      }

      if (!snap) continue;

      const projection = dot(snap.axis, {
        x: point.x - snap.min.x,
        y: point.y - snap.min.y
      });
      if (projection < 0 || projection > length(subtract(snap.max, snap.min)))
        continue;
      const snapPoint = {
        x: snap.min.x + snap.axis.x * projection,
        y: snap.min.y + snap.axis.y * projection
      };
      const boxCenter = {
        x: position.x + width / 2,
        y: position.y + height / 2
      };
      const magnet = multiply(subtract(snapPoint, boxCenter), {
        x: 1 / width,
        y: 1 / height
      });
      return {
        point: snapPoint,
        magnet,
        type: "text" as const,
        id: text.id
      };
    }

    return null;
  }

  private _snapToNodes(point: Point, nodes: NodeList): NodeSnap | null {
    const xyrs = nodes.getAttributes(["x", "y", "radius"]);
    for (let i = 0; i < xyrs.length; i++) {
      const xyr = xyrs[i];
      const vec = subtract({ x: xyr.x, y: xyr.y }, point);
      const dist = length(vec);
      if (dist >= Number(xyr.radius) + Number(this.options.detectMargin))
        continue;
      const unit = mul(vec, 1 / dist);
      const snapToCenter = dist < Number(xyr.radius) / 2;
      const snapPoint = snapToCenter
        ? { x: xyr.x, y: xyr.y }
        : add({ x: xyr.x, y: xyr.y }, mul(unit, -Number(xyr.radius)));
      const magnet = snapToCenter ? { x: 0, y: 0 } : unit;
      return {
        point: snapPoint,
        id: nodes.get(i).getId(),
        magnet,
        type: "node" as const
      };
    }
    return null;
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
