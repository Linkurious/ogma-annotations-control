import { Point, Bounds } from "../types";

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

export function boxRayIntersection(
  x: number,
  y: number,
  width: number,
  height: number,
  px: number,
  py: number,
  sin: number,
  cos: number
) {
  // Transform to rectangle's local coordinate space
  const cx = x + width / 2;
  const cy = y + height / 2;
  const hw = width / 2;
  const hh = height / 2;

  // Transform point to local space (inverse rotation around center)
  const dx = px - cx;
  const dy = py - cy;
  const localPx = dx * cos + dy * sin;
  const localPy = -dx * sin + dy * cos;

  // Ray from local point to origin (center in local space is 0,0)
  const dirX = -localPx;
  const dirY = -localPy;

  // Find intersection with axis-aligned box [-hw, -hh] to [hw, hh]
  // Using parametric ray equation: P(t) = origin + t * direction
  let t = Infinity;
  let intersectX = 0;
  let intersectY = 0;

  // Test vertical edges (left and right) by solving for t where x = ±hw
  if (dirX !== 0) {
    // Left edge: x = -hw
    const t1 = (-hw - localPx) / dirX;
    const t2 = (hw - localPx) / dirX;
    if (t1 > 0 && t1 < t) {
      const iy = localPy + dirY * t1; // Project onto Y axis
      if (iy >= -hh && iy <= hh) {
        t = t1;
        intersectX = -hw;
        intersectY = iy;
      }
    }
    // Right edge: x = hw
    if (t2 > 0 && t2 < t) {
      const iy = localPy + dirY * t2; // Project onto Y axis
      if (iy >= -hh && iy <= hh) {
        t = t2;
        intersectX = hw;
        intersectY = iy;
      }
    }
  }

  // Test horizontal edges (top and bottom) by solving for t where y = ±hh
  if (dirY !== 0) {
    // Top edge: y = -hh
    const t1 = (-hh - localPy) / dirY;
    const t2 = (hh - localPy) / dirY;
    if (t1 > 0 && t1 < t) {
      const ix = localPx + dirX * t1; // Project onto X axis
      if (ix >= -hw && ix <= hw) {
        t = t1;
        intersectX = ix;
        intersectY = -hh;
      }
    }
    // Bottom edge: y = hh
    if (t2 > 0 && t2 < t) {
      const ix = localPx + dirX * t2; // Project onto X axis
      if (ix >= -hw && ix <= hw) {
        t = t2;
        intersectX = ix;
        intersectY = hh;
      }
    }
  }

  if (t === Infinity) return null;

  // Transform intersection back to world space
  return {
    x: cx + intersectX * cos - intersectY * sin,
    y: cy + intersectX * sin + intersectY * cos
  };
}

export function getAABB1(
  x0: number,
  y0: number,
  w: number,
  h: number,
  angle = 0,
  sin: number = Math.sin(angle),
  cos: number = Math.cos(angle),
  dest: Bounds = [0, 0, 0, 0]
): Bounds {
  const hw = w / 2;
  const hh = h / 2;
  const cx = x0;
  const cy = y0;

  // as is
  if (angle === 0) {
    dest[0] = x0;
    dest[1] = y0;
    dest[2] = x0 + w;
    dest[3] = y0 + h;
    return dest;
  }

  // const sin = Math.sin(angle),
  //       cos = Math.cos(angle);
  let xr, yr, x, y;
  let minX, minY, maxX, maxY;

  x = -hw;
  y = -hh;
  xr = cx + x * cos - y * sin;
  yr = cy + x * sin + y * cos;
  minX = maxX = xr;
  minY = maxY = yr;

  x = -hw;
  y = hh;
  xr = cx + x * cos - y * sin;
  yr = cy + x * sin + y * cos;
  if (xr < minX) {
    minX = xr;
  } else if (xr > maxX) {
    maxX = xr;
  }
  if (yr < minY) {
    minY = yr;
  } else if (yr > maxY) {
    maxY = yr;
  }

  x = hw;
  y = hh;
  xr = cx + x * cos - y * sin;
  yr = cy + x * sin + y * cos;
  if (xr < minX) minX = xr;
  else if (xr > maxX) maxX = xr;

  if (yr < minY) minY = yr;
  else if (yr > maxY) maxY = yr;

  x = hw;
  y = -hh;
  xr = cx + x * cos - y * sin;
  yr = cy + x * sin + y * cos;
  if (xr < minX) minX = xr;
  else if (xr > maxX) maxX = xr;

  if (yr < minY) minY = yr;
  else if (yr > maxY) maxY = yr;

  dest[0] = minX;
  dest[1] = minY;
  dest[2] = maxX;
  dest[3] = maxY;

  return dest;
}

export function getAABB(
  x: number,
  y: number,
  w: number,
  h: number,
  sin: number,
  cos: number,
  ox: number,
  oy: number,
  dest: Bounds
): Bounds {
  const dx = x - ox;
  const dy = y - oy;

  const x1 = ox + dx * cos - dy * sin;
  const y1 = oy + dx * sin + dy * cos;

  const x2 = ox + (dx + w) * cos - dy * sin;
  const y2 = oy + (dx + w) * sin + dy * cos;

  const x3 = ox + (dx + w) * cos - (dy + h) * sin;
  const y3 = oy + (dx + w) * sin + (dy + h) * cos;

  const x4 = ox + dx * cos - (dy + h) * sin;
  const y4 = oy + dx * sin + (dy + h) * cos;

  dest[0] = Math.min(x1, x2, x3, x4);
  dest[1] = Math.min(y1, y2, y3, y4);
  dest[2] = Math.max(x1, x2, x3, x4);
  dest[3] = Math.max(y1, y2, y3, y4);
  return dest;
}

/**
 * Distance from point to line segment
 * @private
 */
export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    // a and b are the same point
    const ddx = p.x - a.x;
    const ddy = p.y - a.y;
    return Math.sqrt(ddx * ddx + ddy * ddy);
  }

  // Parameter t represents position along segment
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared;
  t = Math.max(0, Math.min(1, t));

  const nearestX = a.x + t * dx;
  const nearestY = a.y + t * dy;
  const ddx = p.x - nearestX;
  const ddy = p.y - nearestY;

  return Math.sqrt(ddx * ddx + ddy * ddy);
}
