import type { Point } from "@linkurious/ogma";
import { Position } from "geojson";
import { TARGET_TYPES } from "../../constants";
import { Id, Polygon } from "../../types";
import { subtract, length, dot } from "../../utils/vec";

export type PolygonSnap = {
  point: Point;
  magnet: Point;
  type: typeof TARGET_TYPES.POLYGON;
  id: Id;
};

/**
 * Check if a point is inside a polygon using ray casting algorithm
 */
export function isPointInsidePolygon(point: Point, points: Position[]): boolean {
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

/**
 * Calculate point on cubic Bezier curve at parameter t
 */
export function bezierPoint(
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

/**
 * Find closest point on a cubic Bezier curve using sampling
 * Returns the point and distance
 */
export function findClosestPointOnBezierCurve(
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
    const curvePoint = bezierPoint(t, p0, cp1, cp2, p3);
    const dist = length(subtract(curvePoint, point));

    if (dist < closestDist) {
      closestDist = dist;
      closestPoint = curvePoint;
    }
  }

  return closestPoint ? { point: closestPoint, distance: closestDist } : null;
}

export function snapToPolygonStraightEdges(
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

export function snapToPolygon(
  point: Point,
  polygons: Polygon[],
  magnetRadius: number
): PolygonSnap | null {
  const tension = 0.5; // Same as renderer

  for (const polygon of polygons) {
    const coords = polygon.geometry.coordinates[0];
    const points = coords.slice(0, -1); // Remove closing duplicate

    if (points.length < 3) {
      // Not enough points for smoothing, use straight edges
      return snapToPolygonStraightEdges(point, polygon, magnetRadius);
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
    const isInside = isPointInsidePolygon(point, points);

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

      // Find closest point on this Bezier curve segment
      const result = findClosestPointOnBezierCurve(
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
