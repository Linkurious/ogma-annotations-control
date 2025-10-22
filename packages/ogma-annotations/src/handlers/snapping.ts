import type Ogma from "@linkurious/ogma";
import type { Node, NodeId, NodeList, Point } from "@linkurious/ogma";
import { Index } from "../interaction/spatialIndex";
import { Store } from "../store";
import { Id, Text, isBox, isText } from "../types";
import { getBoxCenter, getBoxSize } from "../utils";
import { subtract, add, length, mul, dot } from "../vec";

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

// Edge definitions in normalized coordinates: [x1, y1, x2, y2]
// Edges are: top, right, bottom, left
const EDGE_DEFS = [
  [-0.5, -0.5, 0.5, -0.5], // top
  [0.5, -0.5, 0.5, 0.5], // right
  [0.5, 0.5, -0.5, 0.5], // bottom
  [-0.5, 0.5, -0.5, -0.5] // left
] as const;

// Transform local corner to world coordinates
function toWorld(
  lx: number,
  ly: number,
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  cos: number,
  sin: number,
  isRotated: boolean
): Point {
  const x = lx * width;
  const y = ly * height;
  if (isRotated) {
    return {
      x: centerX + (x * cos - y * sin),
      y: centerY + (x * sin + y * cos)
    };
  }
  return { x: centerX + x, y: centerY + y };
}

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
  private store: Store;

  constructor(
    ogma: Ogma,
    options: SnappingOptions,
    spatialIndex: Index,
    store: Store
  ) {
    super();
    this.ogma = ogma;
    this.options = options;
    this.spatialIndex = spatialIndex;
    this.store = store;
  }

  public snap(position: Point) {
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
    const { zoom } = this.store.getState();
    for (const text of texts) {
      const snap =
        this._snapToMagnetPoints(point, text, zoom) ||
        this._snapToEdge(point, text, zoom);
      if (snap) return snap;
    }
    return null;
  }

  private _snapToMagnetPoints(
    point: Point,
    text: Text,
    zoom: number
  ): TextSnap | null {
    const center = getBoxCenter(text);
    let { width, height } = getBoxSize(text);
    const { sin, cos } = this.store.getState();

    if (text.properties.style?.fixedSize) {
      width /= zoom;
      height /= zoom;
    }

    for (const vec of MAGNETS) {
      // Calculate offset in local (box) coordinates
      let offsetX = vec.x * width;
      let offsetY = vec.y * height;

      // For texts (counter-rotated), rotate the offset to world coordinates
      if (!isBox(text)) {
        // Rotate the offset by the current rotation
        const rotatedX = offsetX * cos - offsetY * sin;
        const rotatedY = offsetX * sin + offsetY * cos;
        offsetX = rotatedX;
        offsetY = rotatedY;
      }

      const magnetPoint = { x: center.x + offsetX, y: center.y + offsetY };
      const dist = length(subtract(magnetPoint, point));
      if (dist >= this.options.magnetRadius) continue;
      return {
        point: { x: magnetPoint.x, y: magnetPoint.y },
        type: "text" as const,
        magnet: vec,
        id: text.id
      };
    }
    return null;
  }

  private _snapToEdge(point: Point, text: Text, zoom: number): TextSnap | null {
    const { x, y } = getBoxCenter(text);
    let { width, height } = getBoxSize(text);
    const magnetRadius = this.options.magnetRadius;

    if (text.properties.style?.fixedSize) {
      width /= zoom;
      height /= zoom;
    }

    const { sin, cos } = this.store.getState();
    const isRotated = !isBox(text);

    let closestSnap: TextSnap | null = null;
    let closestDist = Infinity;

    for (let i = 0; i < 4; i++) {
      const [lx1, ly1, lx2, ly2] = EDGE_DEFS[i];
      const p1 = toWorld(lx1, ly1, x, y, width, height, cos, sin, isRotated);
      const p2 = toWorld(lx2, ly2, x, y, width, height, cos, sin, isRotated);

      const edgeVec = subtract(p2, p1);
      const edgeLength = length(edgeVec);
      const edgeDir = { x: edgeVec.x / edgeLength, y: edgeVec.y / edgeLength };
      const edgeNorm = { x: -edgeDir.y, y: edgeDir.x };

      const toPoint = subtract(point, p1);
      const dist = dot(edgeNorm, toPoint);
      const projection = dot(edgeDir, toPoint);

      // Check if projection is within edge bounds
      if (projection >= 0 && projection <= edgeLength) {
        const absDist = Math.abs(dist);

        // If within magnetRadius OR if this is the closest edge (for points inside box)
        if (absDist < magnetRadius || absDist < closestDist) {
          // Interpolate local magnet position
          const t = projection / edgeLength;

          const snap = {
            point: {
              x: p1.x + edgeDir.x * projection,
              y: p1.y + edgeDir.y * projection
            },
            magnet: {
              x: lx1 + (lx2 - lx1) * t,
              y: ly1 + (ly2 - ly1) * t
            },
            type: "text" as const,
            id: text.id
          };

          // If within magnetRadius, return immediately
          if (absDist < magnetRadius) {
            return snap;
          }

          // Otherwise track as closest for potential inside-box snap
          if (absDist < closestDist) {
            closestDist = absDist;
            closestSnap = snap;
          }
        }
      }
    }

    // If we found a closest edge and the point seems to be inside the box
    // (all distances were checked and we have a closest), snap to it
    if (closestSnap && closestDist < Math.max(width, height)) {
      return closestSnap;
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
