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

/**
 * With `bodyOnly`, only edges the pointer is clearly over (inside the stroke)
 * qualify. Otherwise also edges within `magnetRadius` of the stroke.
 * Edges the pointer is inside always beat ones it is only near; ties go to
 * the closest centerline.
 */
export function snapToEdges(
  point: Point,
  edges: EdgeList,
  magnetRadius: number,
  bodyOnly = false
): EdgeSnap | null {
  // @ts-expect-error curvatures exist is a private readonly attribute
  const curvatures = edges.getAttribute("curvature") as readonly number[];
  // getExtremities() is [source of every edge..., target of every edge...]
  const sources = edges.getSource().getPosition();
  const targets = edges.getTarget().getPosition();
  let closestSnap: EdgeSnap | null = null;
  let closestDist = Infinity;
  let closestInside = false;
  for (let i = 0; i < edges.size; i++) {
    const edge = edges.get(i);
    const source = sources[i];
    const target = targets[i];
    const curvature = curvatures[i];
    // Thick edges are hit anywhere within their body, so widen the
    // tolerance by half the stroke width. Centerline is still the snap target.
    const halfWidth = (edge.getAttribute("width") as number) / 2;
    const tolerance = magnetRadius + halfWidth;

    const result = curvature
      ? findClosestPointOnQuadraticCurve(
          point,
          source,
          target,
          geometry.getQuadraticCurveControlPoint(
            source.x,
            source.y,
            target.x,
            target.y,
            curvature
          )
        )
      : findClosestPointOnLine(point, source, target);

    if (!result || result.distance > tolerance) continue;
    const inside = result.distance <= halfWidth;
    if (bodyOnly && !inside) continue;
    const better =
      closestSnap === null ||
      (inside !== closestInside ? inside : result.distance < closestDist);
    if (better) {
      closestInside = inside;
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
