/*
 (c) 2017, Vladimir Agafonkin
 Simplify.js, a high-performance JS polyline simplification library
 mourner.github.io/simplify-js
*/

// to suit your point format, run search/replace for '[0]' and '[1]';
// for 3D version, see 3d branch (configurability would draw significant performance overhead)

import { Position } from "geojson";

// square distance between 2 points
function getSqDist(p1: Position, p2: Position) {
  const dx = p1[0] - p2[0],
    dy = p1[1] - p2[1];

  return dx * dx + dy * dy;
}

// square distance from a point to a segment
function getSqSegDist(p: Position, p1: Position, p2: Position) {
  let x = p1[0],
    y = p1[1],
    dx = p2[0] - x,
    dy = p2[1] - y;

  if (dx !== 0 || dy !== 0) {
    const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);

    if (t > 1) {
      x = p2[0];
      y = p2[1];
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }

  dx = p[0] - x;
  dy = p[1] - y;

  return dx * dx + dy * dy;
}
// rest of the code doesn't care about point format

// basic distance-based simplification
function simplifyRadialDist(points: Position[], sqTolerance: number) {
  let prevPoint = points[0];
  const newPoints = [prevPoint];
  let point: Position;

  for (let i = 1, len = points.length; i < len; i++) {
    point = points[i];

    if (getSqDist(point, prevPoint) > sqTolerance) {
      newPoints.push(point);
      prevPoint = point;
    }
  }

  if (prevPoint !== point!) newPoints.push(point!);

  return newPoints;
}

function simplifyDPStep(
  points: Position[],
  first: number,
  last: number,
  sqTolerance: number,
  simplified: Position[]
) {
  let maxSqDist = sqTolerance,
    index: number = 0;

  for (let i = first + 1; i < last; i++) {
    const sqDist = getSqSegDist(points[i], points[first], points[last]);

    if (sqDist > maxSqDist) {
      index = i;
      maxSqDist = sqDist;
    }
  }

  if (maxSqDist > sqTolerance) {
    if (index - first > 1)
      simplifyDPStep(points, first, index, sqTolerance, simplified);
    simplified.push(points[index]);
    if (last - index > 1)
      simplifyDPStep(points, index, last, sqTolerance, simplified);
  }
}

// simplification using Ramer-Douglas-Peucker algorithm
function simplifyDouglasPeucker(points: Position[], sqTolerance: number) {
  const last = points.length - 1;

  const simplified: Position[] = [points[0]];
  simplifyDPStep(points, 0, last, sqTolerance, simplified);
  simplified.push(points[last]);

  return simplified;
}

// both algorithms combined for awesome performance
/**
 * Polyline simplification using a combination of
 * the Radial Distance and
 * the Douglas-Peucker algorithms
 * See https://github.com/mourner/simplify-js for more details
 *
 * @param points Points to simplify
 * @param tolerance Tolerance in pixels
 * @param highestQuality Whether to skip radial distance simplification
 * @returns Simplified points
 */
export function simplify(
  points: Position[],
  tolerance: number,
  highestQuality: boolean
) {
  if (points.length <= 2) return points;

  const sqTolerance = tolerance !== undefined ? tolerance * tolerance : 1;

  points = highestQuality ? points : simplifyRadialDist(points, sqTolerance);
  points = simplifyDouglasPeucker(points, sqTolerance);

  return points;
}
