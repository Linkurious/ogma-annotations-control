import { Ogma, geometry } from "@linkurious/ogma";
import { Point, Bounds } from "./types";

/**
 * Rotates a point around the origin (0,0) by a given angle (in radians).
 * Uses the standard 2D rotation matrix:
 *   x' = cos(a) * x - sin(a) * y
 *   y' = sin(a) * x + cos(a) * y
 */
function rotatePoint({ x, y }: Point, angle: number): Point {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: c * x - s * y, y: s * x + c * y };
}

/**
 * Computes the shortest distance from point p to the line segment ab.
 * Uses vector projection to find the closest point on the segment,
 * then computes the Euclidean distance from p to that point.
 */
function pointSegmentDistance(p: Point, a: Point, b: Point): number {
  const { x: px, y: py } = p;
  const { x: ax, y: ay } = a;
  const { x: bx, y: by } = b;
  // Vector from a to b
  const vx = bx - ax;
  const vy = by - ay;
  // Vector from a to p
  const wx = px - ax;
  const wy = py - ay;

  // Squared length of ab
  const vv = vx * vx + vy * vy;

  // Project point p onto ab, clamped to [0,1] (segment)
  const t = vv === 0 ? 0 : Math.max(0, Math.min(1, (wx * vx + wy * vy) / vv));

  // Compute closest point on ab to p
  const dx = px - (ax + t * vx);
  const dy = py - (ay + t * vy);
  // Return Euclidean distance
  return Math.hypot(dx, dy);
}

export function segmentIntersection(
  p1: Point,
  p2: Point,
  q1: Point,
  q2: Point
): Point | null {
  const s1x = p2.x - p1.x;
  const s1y = p2.y - p1.y;
  const s2x = q2.x - q1.x;
  const s2y = q2.y - q1.y;

  const denom = -s2x * s1y + s1x * s2y;
  if (denom === 0) return null; // Parallel lines
  const s = (-s1y * (p1.x - q1.x) + s1x * (p1.y - q1.y)) / denom;
  const t = (s2x * (p1.y - q1.y) - s2y * (p1.x - q1.x)) / denom;

  if (s < 0 || s > 1 || t < 0 || t > 1) return null; // Intersection not within segments

  // Compute intersection point
  return {
    x: p1.x + s * s1x,
    y: p1.y + s * s1y
  };
}

/**
 * Returns the four corners of a box [x0, y0, x1, y1] as Point objects,
 * in the following order: top-left, top-right, bottom-right, bottom-left.
 */
export function corners([x0, y0, x1, y1]: Bounds): [
  Point,
  Point,
  Point,
  Point
] {
  return [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 }
  ];
}

/**
 * Attempts to rotate a box of given width and height around a given origin so that:
 *  1. All corners remain inside a "fence" rectangle.
 *  2. The minimum distance from the origin to any edge of the box is at least d.
 * The function steps through angles from 0 to 2π, returning the first valid angle and corners.
 *
 * @param box     The box to rotate ({ width, height })
 * @param origin  The point to rotate around
 * @param fence   The bounding rectangle ([x0, y0, x1, y1])
 * @param d       The minimum allowed distance from origin to any box edge
 * @param step    The angle increment (radians)
 * @returns      { angle, corners } if a valid rotation is found, else null
 */
export function rotateBoxToFit(
  box: { width: number; height: number },
  origin: Point,
  fence: Bounds,
  d: number,
  step = Math.PI / 360 // 0.5°
): { angle: number; corners: Point[] } | null {
  const { x: ox, y: oy } = origin;
  const { width, height } = box;

  // Define box corners relative to the origin (centered at origin)
  const halfW = width / 2;
  const halfH = height / 2;
  const boxCorners = [
    { x: -halfW, y: -halfH },
    { x: halfW, y: -halfH },
    { x: halfW, y: halfH },
    { x: -halfW, y: halfH }
  ];

  // Compute fence bounds
  const fenceX0 = Math.min(fence[0], fence[2]);
  const fenceX1 = Math.max(fence[0], fence[2]);
  const fenceY0 = Math.min(fence[1], fence[3]);
  const fenceY1 = Math.max(fence[1], fence[3]);

  // Try all angles from 0 to 2π
  for (let angle = 0; angle < 2 * Math.PI; angle += step) {
    // Rotate all box corners around the origin, then move to absolute position
    const rot = boxCorners.map((p) => {
      const { x: rx, y: ry } = rotatePoint(p, angle);
      return { x: rx + ox, y: ry + oy };
    });

    // 1) Check if all corners are inside the fence
    if (
      rot.some(
        ({ x, y }) => x < fenceX0 || x > fenceX1 || y < fenceY0 || y > fenceY1
      )
    ) {
      continue;
    }

    // 2) Check if the minimum distance from the origin to any edge is at least d
    const edges = rot.map((p, i) => [p, rot[(i + 1) % 4]] as [Point, Point]);
    const minDist = Math.min(
      ...edges.map(([a, b]) => pointSegmentDistance(origin, a, b))
    );
    if (minDist >= d) {
      return { angle, corners: rot };
    }
  }

  // No valid rotation found
  return null;
}

export function boxToSegmentIntersection(
  box: { x: number; y: number; width: number; height: number },
  angle: number,
  point: Point
) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const tl = { x: box.x, y: box.y };
  const br = {
    x: box.x + box.width * cos - box.height * sin,
    y: box.y + box.width * sin + box.height * cos
  };
  const tr = { x: br.x + box.height * sin, y: br.y - box.height * cos };
  const bl = { x: tl.x - box.height * sin, y: tl.y + box.height * cos };
  const center = {
    x: (tl.x + br.x) / 2,
    y: (tl.y + br.y) / 2
  };

  let intersects: Point | null = null;
  intersects = geometry.segmentIntersection(
    point.x,
    point.y,
    center.x,
    center.y,
    tl.x,
    tl.y,
    tr.x,
    tr.y
  );
  if (intersects) return intersects;
  intersects = geometry.segmentIntersection(
    point.x,
    point.y,
    center.x,
    center.y,
    tr.x,
    tr.y,
    br.x,
    br.y
  );
  if (intersects) return intersects;
  intersects = Ogma.geometry.segmentIntersection(
    point.x,
    point.y,
    center.x,
    center.y,
    br.x,
    br.y,
    bl.x,
    bl.y
  );
  if (intersects) return intersects;
  intersects = Ogma.geometry.segmentIntersection(
    point.x,
    point.y,
    center.x,
    center.y,
    bl.x,
    bl.y,
    tl.x,
    tl.y
  );
  if (intersects) return intersects;
  return null;
}
