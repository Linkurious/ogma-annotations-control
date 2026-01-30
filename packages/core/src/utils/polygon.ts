import type { Polygon } from "../types/features/Polygon";
import type { Bounds, Point } from "../types/geometry";

/**
 * Get bounding box of a polygon
 */
export function getPolygonBounds(polygon: Polygon): Bounds {
  if (polygon.geometry.bbox) return polygon.geometry.bbox as Bounds;

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

export { simplify as simplifyPolygon } from "../lib/simplify";

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
    ? ([bbox[0] + dx, bbox[1] + dy, bbox[2] + dx, bbox[3] + dy] as Bounds)
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
