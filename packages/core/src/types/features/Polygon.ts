import { Polygon as GeoJSONPolygon, Geometry } from "geojson";
import { nanoid as getId } from "nanoid";
import { AnnotationFeature, AnnotationProps, Id } from "./Annotation";
import { BoxStyle, defaultBoxStyle } from "./Box";
import { distanceToSegment } from "../../utils/geom";
import { Point } from "../geometry";

export interface PolygonStyle extends BoxStyle {}

export interface PolygonProperties extends AnnotationProps {
  type: "polygon";
  style?: PolygonStyle;
}

/**
 * Polygon placed on the graph, use it to highlight areas
 */
export interface Polygon
  extends AnnotationFeature<GeoJSONPolygon, PolygonProperties> {}

export const isPolygon = (
  a: AnnotationFeature<Geometry, AnnotationProps>
): a is Polygon => a.properties.type === "polygon";

/**
 * Point-in-polygon detection using ray casting algorithm
 * @private
 * @param polygon The polygon annotation
 * @param point The point to test
 * @param threshold Detection threshold in pixels
 * @return True if the point is inside the polygon or within the threshold distance from its edges
 */
export function detectPolygon(
  polygon: Polygon,
  point: Point,
  threshold: number = 0
): boolean {
  const coords = polygon.geometry.coordinates[0]; // Exterior ring

  // First check bbox with threshold
  const bbox = polygon.geometry.bbox;
  if (bbox) {
    const [minX, minY, maxX, maxY] = bbox;
    if (
      point.x < minX - threshold ||
      point.x > maxX + threshold ||
      point.y < minY - threshold ||
      point.y > maxY + threshold
    ) {
      return false;
    }
  }

  // Check if point is inside polygon using ray casting
  let inside = false;
  for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
    const xi = coords[i][0];
    const yi = coords[i][1];
    const xj = coords[j][0];
    const yj = coords[j][1];

    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  if (inside) return true;

  // If not inside, check distance to edges with threshold
  if (threshold > 0) {
    for (let i = 0; i < coords.length - 1; i++) {
      const [x1, y1] = coords[i];
      const [x2, y2] = coords[i + 1];

      const dist = distanceToSegment(point, { x: x1, y: y1 }, { x: x2, y: y2 });
      if (dist <= threshold) return true;
    }
  }

  return false;
}

/**
 * Create a polygon annotation
 */
export function createPolygon(
  coordinates: [number, number][][],
  properties?: Partial<Omit<PolygonProperties, "type">> & { id?: Id }
): Polygon {
  // Ensure polygon is closed (first and last points are the same)
  const ring = coordinates[0];
  if (
    ring.length > 0 &&
    (ring[0][0] !== ring[ring.length - 1][0] ||
      ring[0][1] !== ring[ring.length - 1][1])
  ) {
    ring.push([ring[0][0], ring[0][1]]);
  }

  // Calculate bbox
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const [x, y] of ring) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  const bbox: [number, number, number, number] = [minX, minY, maxX, maxY];

  const { id, style, ...rest } = properties || {};

  return {
    type: "Feature",
    id: id || getId(),
    geometry: {
      type: "Polygon",
      coordinates,
      bbox
    },
    properties: {
      type: "polygon",
      style: {
        ...defaultPolygonStyle,
        ...style
      },
      ...rest
    }
  };
}

/**
 * Default style configuration for polygon annotations.
 *
 * @example
 * ```typescript
 * {
 *   background: "transparent",
 *   strokeWidth: 2,
 *   borderRadius: 8,
 *   padding: 16,
 *   strokeType: "plain",
 *   strokeColor: "#000000"
 * }
 * ```
 */
export const defaultPolygonStyle: PolygonStyle = {
  ...defaultBoxStyle,
  strokeColor: "#000000",
  strokeWidth: 2,
  background: "transparent"
};

/**
 * Default polygon properties for creating new Polygon annotations.
 * Contains the default polygon configuration with {@link defaultPolygonStyle}.
 */
export const defaultPolygonProperties: PolygonProperties = {
  type: "polygon",
  style: {
    ...defaultPolygonStyle
  }
};
