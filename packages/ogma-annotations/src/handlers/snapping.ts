import type { Ogma, Node, NodeId, NodeList, Point } from "@linkurious/ogma";
import { Position } from "geojson";
import { TARGET_TYPES } from "../constants";
import { Index } from "../interaction/spatialIndex";
import { Store } from "../store";
import { Id, Text, Polygon, isBox, isText, isPolygon } from "../types";
import { getBoxCenter, getBoxSize } from "../utils/utils";
import { subtract, add, length, mul, dot } from "../utils/vec";

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
  type: typeof TARGET_TYPES.TEXT;
  id: Id;
};

export type PolygonSnap = {
  point: Point;
  magnet: Point;
  type: typeof TARGET_TYPES.POLYGON;
  id: Id;
};

export type NodeSnap = {
  point: Point;
  id: NodeId;
  magnet: Point;
  type: typeof TARGET_TYPES.NODE;
};

export type Snap = TextSnap | PolygonSnap | NodeSnap;

type SnappingOptions = {
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
    const snapping = this.findMagnet(position);
    if (!snapping) return null;
    return snapping;
  }

  private findMagnet(point: Point) {
    const detectMargin = this.options.detectMargin;
    const snapWindow = {
      minX: point.x - detectMargin,
      minY: point.y - detectMargin,
      maxX: point.x + detectMargin,
      maxY: point.y + detectMargin
    };
    const features = this.spatialIndex.search(snapWindow);
    const texts = features.filter((a) => isText(a) || isBox(a)) as Text[];
    const polygons = features.filter((a) => isPolygon(a)) as Polygon[];

    const nodes = this.ogma.view.getElementsInside(
      snapWindow.minX,
      snapWindow.minY,
      snapWindow.maxX,
      snapWindow.maxY
    ).nodes;
    const snapToNode = this.snapToNodes(point, nodes);
    if (snapToNode) return snapToNode;

    const snapToText = this.snapToText(point, texts);
    if (snapToText) return snapToText;

    const snapToPolygon = this.snapToPolygon(point, polygons);
    if (snapToPolygon) return snapToPolygon;

    return null;
  }

  public snapToText(point: Point, texts: Text[]): TextSnap | null {
    const { zoom } = this.store.getState();
    for (const text of texts) {
      const snap =
        this.snapToMagnetPoints(point, text, zoom) ||
        this.snapToEdge(point, text, zoom);
      if (snap) return snap;
    }
    return null;
  }

  public snapToPolygon(point: Point, polygons: Polygon[]): PolygonSnap | null {
    const magnetRadius = this.options.magnetRadius;
    const tension = 0.5; // Same as renderer

    for (const polygon of polygons) {
      const coords = polygon.geometry.coordinates[0];
      const points = coords.slice(0, -1); // Remove closing duplicate

      if (points.length < 3) {
        // Not enough points for smoothing, use straight edges
        return this.snapToPolygonStraightEdges(point, polygon, magnetRadius);
      }

      // Check vertex snapping first
      for (let i = 0; i < points.length; i++) {
        const [vx, vy] = points[i];
        const dist = length(subtract({ x: vx, y: vy }, point));

        if (dist < magnetRadius) {
          return {
            point: { x: vx, y: vy },
            magnet: { x: vx, y: vy },
            type: TARGET_TYPES.POLYGON,
            id: polygon.id
          };
        }
      }

      // Check if point is inside the polygon
      const isInside = this.isPointInsidePolygon(point, points);

      // Check smooth curve snapping
      let closestPoint: Point | null = null;
      let closestDist = isInside ? Infinity : magnetRadius;

      for (let i = 0; i < points.length; i++) {
        const p0 = points[(i - 1 + points.length) % points.length];
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];
        const p3 = points[(i + 2) % points.length];

        // Calculate Catmull-Rom control points
        const cp1x = p1[0] + ((p2[0] - p0[0]) / 6) * tension;
        const cp1y = p1[1] + ((p2[1] - p0[1]) / 6) * tension;
        const cp2x = p2[0] - ((p3[0] - p1[0]) / 6) * tension;
        const cp2y = p2[1] - ((p3[1] - p1[1]) / 6) * tension;

        // Find closest point on this Bézier curve segment
        const result = this.findClosestPointOnBezierCurve(
          point,
          { x: p1[0], y: p1[1] },
          { x: cp1x, y: cp1y },
          { x: cp2x, y: cp2y },
          { x: p2[0], y: p2[1] }
        );

        if (result) {
          const dist = result.distance;

          // If inside polygon, always track the closest point
          // If outside, only consider points within magnetRadius
          if (isInside) {
            if (dist < closestDist) {
              closestDist = dist;
              closestPoint = result.point;
            }
          } else if (dist < magnetRadius) {
            return {
              point: result.point,
              magnet: result.point,
              type: TARGET_TYPES.POLYGON,
              id: polygon.id
            };
          }
        }
      }

      // If point was inside and we found a closest point, return it
      if (isInside && closestPoint) {
        return {
          point: closestPoint,
          magnet: closestPoint,
          type: TARGET_TYPES.POLYGON,
          id: polygon.id
        };
      }
    }

    return null;
  }

  /**
   * Check if a point is inside a polygon using ray casting algorithm
   */
  private isPointInsidePolygon(point: Point, points: Position[]): boolean {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const xi = points[i][0];
      const yi = points[i][1];
      const xj = points[j][0];
      const yj = points[j][1];

      const intersect =
        yi > point.y !== yj > point.y &&
        point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  private snapToPolygonStraightEdges(
    point: Point,
    polygon: Polygon,
    magnetRadius: number
  ): PolygonSnap | null {
    const coords = polygon.geometry.coordinates[0];

    // Check vertex snapping
    for (let i = 0; i < coords.length - 1; i++) {
      const [vx, vy] = coords[i];
      const dist = length(subtract({ x: vx, y: vy }, point));

      if (dist < magnetRadius) {
        return {
          point: { x: vx, y: vy },
          magnet: { x: vx, y: vy },
          type: TARGET_TYPES.POLYGON,
          id: polygon.id
        };
      }
    }

    // Check edge snapping
    for (let i = 0; i < coords.length - 1; i++) {
      const [x1, y1] = coords[i];
      const [x2, y2] = coords[i + 1];

      const p1 = { x: x1, y: y1 };
      const p2 = { x: x2, y: y2 };

      const edgeVec = subtract(p2, p1);
      const edgeLength = length(edgeVec);
      const edgeDir = {
        x: edgeVec.x / edgeLength,
        y: edgeVec.y / edgeLength
      };
      const edgeNorm = { x: -edgeDir.y, y: edgeDir.x };

      const toPoint = subtract(point, p1);
      const dist = Math.abs(dot(edgeNorm, toPoint));
      const projection = dot(edgeDir, toPoint);

      if (projection >= 0 && projection <= edgeLength && dist < magnetRadius) {
        const snapPoint = {
          x: p1.x + edgeDir.x * projection,
          y: p1.y + edgeDir.y * projection
        };

        return {
          point: snapPoint,
          magnet: snapPoint,
          type: TARGET_TYPES.POLYGON,
          id: polygon.id
        };
      }
    }

    return null;
  }

  /**
   * Find closest point on a cubic Bézier curve using sampling
   * Returns the point and distance
   */
  private findClosestPointOnBezierCurve(
    point: Point,
    p0: Point,
    cp1: Point,
    cp2: Point,
    p3: Point
  ): { point: Point; distance: number } | null {
    let closestDist = Infinity;
    let closestPoint: Point | null = null;

    // Sample the curve at regular intervals (20 samples is a good balance)
    const samples = 20;
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const curvePoint = this.bezierPoint(t, p0, cp1, cp2, p3);
      const dist = length(subtract(curvePoint, point));

      if (dist < closestDist) {
        closestDist = dist;
        closestPoint = curvePoint;
      }
    }

    return closestPoint ? { point: closestPoint, distance: closestDist } : null;
  }

  /**
   * Calculate point on cubic Bézier curve at parameter t
   */
  private bezierPoint(
    t: number,
    p0: Point,
    cp1: Point,
    cp2: Point,
    p3: Point
  ): Point {
    const t2 = t * t;
    const t3 = t2 * t;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;

    return {
      x: mt3 * p0.x + 3 * mt2 * t * cp1.x + 3 * mt * t2 * cp2.x + t3 * p3.x,
      y: mt3 * p0.y + 3 * mt2 * t * cp1.y + 3 * mt * t2 * cp2.y + t3 * p3.y
    };
  }

  private snapToMagnetPoints(
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
        type: TARGET_TYPES.TEXT,
        magnet: vec,
        id: text.id
      };
    }
    return null;
  }

  private snapToEdge(point: Point, text: Text, zoom: number): TextSnap | null {
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
            type: TARGET_TYPES.TEXT,
            id: text.id
          };

          // If within magnetRadius, return immediately
          if (absDist < magnetRadius) return snap;

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

  public snapToNodes(point: Point, nodes: NodeList): NodeSnap | null {
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
        type: TARGET_TYPES.NODE
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
