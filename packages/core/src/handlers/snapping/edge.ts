import type { Point, EdgeList, EdgeId } from "@linkurious/ogma";
import { geometry } from "@linkurious/ogma";
import { TARGET_TYPES } from "../../constants";
import { subtract, length } from "../../utils/vec";

export type EdgeSnap = {
  point: Point;
  id: EdgeId;
  magnet: Point;
  type: typeof TARGET_TYPES.EDGE;
};

/**
 * Find the closest point on a quadratic bezier curve
 * Returns the parameter t and distance
 */
function findClosestPointOnQuadraticCurve(
  point: Point,
  source: Point,
  target: Point,
  cp: Point,
  samples = 20
): { t: number; point: Point; distance: number } | null {
  let closestT = 0;
  let closestDist = Infinity;
  let closestPoint: Point | null = null;

  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const curvePoint = geometry.getPointOnQuadraticCurve(
      t,
      source.x,
      source.y,
      target.x,
      target.y,
      cp.x,
      cp.y
    );
    const dist = length(subtract(curvePoint, point));

    if (dist < closestDist) {
      closestDist = dist;
      closestPoint = curvePoint;
      closestT = t;
    }
  }

  return closestPoint
    ? { t: closestT, point: closestPoint, distance: closestDist }
    : null;
}

/**
 * Find the closest point on a straight line segment
 */
function findClosestPointOnLine(
  point: Point,
  source: Point,
  target: Point
): { t: number; point: Point; distance: number } {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    // Source and target are the same point
    return {
      t: 0,
      point: { x: source.x, y: source.y },
      distance: length(subtract(source, point))
    };
  }

  // Project point onto line, clamped to [0, 1]
  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - source.x) * dx + (point.y - source.y) * dy) / lengthSq
    )
  );

  const closestPoint = {
    x: source.x + t * dx,
    y: source.y + t * dy
  };

  return {
    t,
    point: closestPoint,
    distance: length(subtract(closestPoint, point))
  };
}

export function snapToEdges(
  point: Point,
  edges: EdgeList,
  magnetRadius: number
): EdgeSnap | null {
  let closestSnap: EdgeSnap | null = null;
  let closestDist = magnetRadius;
  // @ts-expect-error curvatures exist is a private readonly attribute
  const curvatures = edges.getAttribute("curvature") as readonly number[];
  const extremitiesList = edges.getExtremities();
  const positions = extremitiesList.getPosition();
  for (let i = 0; i < edges.size; i++) {
    const edge = edges.get(i);
    const curvature = curvatures[i];
    const source = positions[2 * i];
    const target = positions[2 * i + 1];

    let result: { t: number; point: Point; distance: number } | null;

    if (curvature === 0 || curvature === undefined) {
      // Straight edge
      result = findClosestPointOnLine(point, source, target);
    } else {
      // Curved edge - get control point
      const cp = geometry.getQuadraticCurveControlPoint(
        source.x,
        source.y,
        target.x,
        target.y,
        curvature
      );
      result = findClosestPointOnQuadraticCurve(point, source, target, cp);
    }

    if (result && result.distance < closestDist) {
      closestDist = result.distance;
      closestSnap = {
        point: result.point,
        id: edge.getId(),
        magnet: { x: result.t, y: 0 },
        type: TARGET_TYPES.EDGE
      };
    }
  }

  return closestSnap;
}
