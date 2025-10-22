import type { Polygon } from "../types/features/Polygon";
import type { Point } from "../types/geometry";

export type BBox = [number, number, number, number];

/**
 * Get bounding box of a polygon
 */
export function getPolygonBounds(polygon: Polygon): BBox {
  if (polygon.geometry.bbox) {
    return polygon.geometry.bbox as BBox;
  }

  const coords = polygon.geometry.coordinates[0];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const [x, y] of coords) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  return [minX, minY, maxX, maxY];
}

/**
 * Get centroid (geometric center) of a polygon
 */
export function getPolygonCenter(polygon: Polygon): Point {
  const coords = polygon.geometry.coordinates[0];
  let sumX = 0;
  let sumY = 0;
  const numPoints = coords.length - 1; // Don't count the closing point

  for (let i = 0; i < numPoints; i++) {
    sumX += coords[i][0];
    sumY += coords[i][1];
  }

  return {
    x: sumX / numPoints,
    y: sumY / numPoints
  };
}

/**
 * Translate (move) a polygon by dx, dy
 */
export function translatePolygon(
  polygon: Polygon,
  dx: number,
  dy: number
): Polygon {
  const newCoordinates = polygon.geometry.coordinates.map((ring) =>
    ring.map(([x, y]) => [x + dx, y + dy] as [number, number])
  );

  const bbox = polygon.geometry.bbox;
  const newBbox = bbox
    ? ([bbox[0] + dx, bbox[1] + dy, bbox[2] + dx, bbox[3] + dy] as BBox)
    : undefined;

  return {
    ...polygon,
    geometry: {
      ...polygon.geometry,
      coordinates: newCoordinates,
      bbox: newBbox
    }
  };
}

/**
 * Update bbox for a polygon
 */
export function updatePolygonBbox(polygon: Polygon): void {
  const coords = polygon.geometry.coordinates[0];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const [x, y] of coords) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  polygon.geometry.bbox = [minX, minY, maxX, maxY];
}

/**
 * Simplify polygon path using Douglas-Peucker algorithm
 * @param points Array of polygon points
 * @param tolerance Maximum distance threshold
 * @returns Simplified array of points
 */
export function simplifyPolygon(
  points: [number, number][],
  tolerance: number
): [number, number][] {
  if (points.length <= 2) return points;

  const sqTolerance = tolerance * tolerance;

  // Helper function to get squared distance from point to segment
  function getSquaredSegmentDistance(
    p: [number, number],
    p1: [number, number],
    p2: [number, number]
  ): number {
    let x = p1[0];
    let y = p1[1];
    let dx = p2[0] - x;
    let dy = p2[1] - y;

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

  // Recursive Douglas-Peucker
  function simplifyDouglasPeucker(
    points: [number, number][],
    first: number,
    last: number,
    sqTolerance: number,
    simplified: [number, number][]
  ): void {
    let maxSqDist = sqTolerance;
    let index = 0;

    for (let i = first + 1; i < last; i++) {
      const sqDist = getSquaredSegmentDistance(
        points[i],
        points[first],
        points[last]
      );

      if (sqDist > maxSqDist) {
        index = i;
        maxSqDist = sqDist;
      }
    }

    if (maxSqDist > sqTolerance) {
      if (index - first > 1)
        simplifyDouglasPeucker(points, first, index, sqTolerance, simplified);
      simplified.push(points[index]);
      if (last - index > 1)
        simplifyDouglasPeucker(points, index, last, sqTolerance, simplified);
    }
  }

  const last = points.length - 1;
  const simplified: [number, number][] = [points[0]];
  simplifyDouglasPeucker(points, 0, last, sqTolerance, simplified);
  simplified.push(points[last]);

  return simplified;
}

/**
 * Scale polygon around an origin point
 */
export function scalePolygon(
  polygon: Polygon,
  scale: number,
  originX: number,
  originY: number
): Polygon {
  const newCoordinates = polygon.geometry.coordinates.map((ring) =>
    ring.map(([x, y]) => {
      const dx = x - originX;
      const dy = y - originY;
      return [originX + dx * scale, originY + dy * scale] as [number, number];
    })
  );

  const newPolygon = {
    ...polygon,
    geometry: {
      ...polygon.geometry,
      coordinates: newCoordinates
    }
  };

  updatePolygonBbox(newPolygon);
  return newPolygon;
}
