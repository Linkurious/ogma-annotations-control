import { Point } from "@linkurious/ogma";
import type {
  BBox,
  Feature,
  FeatureCollection,
  Geometry,
  LineString,
  Polygon,
  Position,
  Point as GeoJSONPoint
} from "geojson";
import { SIDE_START } from "./constants";
import {
  Annotation,
  AnnotationCollection,
  AnnotationFeature,
  Arrow,
  Bounds,
  Box,
  ClientMouseEvent,
  isArrow,
  isBox,
  isText,
  Side,
  Text
} from "./types";

const SVG_NS = "http://www.w3.org/2000/svg";

export function createSVGElement<T extends SVGElement>(tag: string): T {
  return document.createElementNS(SVG_NS, tag) as T;
}

export function getBbox<T extends Annotation>(b: T) {
  if (!b.geometry.bbox) updateBbox(b);
  return b.geometry.bbox as BBox;
}

export function getBoxSize<T extends Annotation>(t: T) {
  // For Box and Text, read from properties
  if ("width" in t.properties && "height" in t.properties) {
    return {
      width: t.properties.width as number,
      height: t.properties.height as number
    };
  }
  // Fallback for other annotation types (arrows, etc)
  const bbox = getBbox(t);
  return {
    width: bbox[2] - bbox[0],
    height: bbox[3] - bbox[1]
  };
}

export function getBoxPosition<T extends Annotation>(t: T) {
  // For Point geometry (Box/Text), calculate from center
  if (
    t.geometry.type === "Point" &&
    "width" in t.properties &&
    "height" in t.properties
  ) {
    const [cx, cy] = t.geometry.coordinates as [number, number];
    const width = t.properties.width as number;
    const height = t.properties.height as number;
    return {
      x: cx - width / 2,
      y: cy - height / 2
    };
  }
  // Fallback for other annotation types
  const bbox = getBbox(t);
  return { x: bbox[0], y: bbox[1] };
}
export function getBoxCenter<T extends Annotation>(t: T) {
  // For Point geometry (Box/Text), return coordinates directly
  if (t.geometry.type === "Point") {
    return { x: t.geometry.coordinates[0], y: t.geometry.coordinates[1] };
  }
  // Fallback for other types
  const bbox = getBbox(t);
  return { x: (bbox[0] + bbox[2]) / 2, y: (bbox[1] + bbox[3]) / 2 };
}

export function updateBbox<T extends Annotation>(t: T) {
  if (isArrow(t)) {
    const [x0, y0] = t.geometry.coordinates[0];
    const [x1, y1] = t.geometry.coordinates[1];

    t.geometry.bbox = [
      Math.min(x0, x1),
      Math.min(y0, y1),
      Math.max(x0, x1),
      Math.max(y0, y1)
    ];
  } else if (
    t.geometry.type === "Point" &&
    "width" in t.properties &&
    "height" in t.properties
  ) {
    // Point geometry for Box/Text - calculate bbox from center + dimensions
    const [cx, cy] = t.geometry.coordinates as [number, number];
    const hw = (t.properties.width as number) / 2;
    const hh = (t.properties.height as number) / 2;
    t.geometry.bbox = [cx - hw, cy - hh, cx + hw, cy + hh];
  }
}

export function setBbox(
  t: Box | Text,
  x: number,
  y: number,
  width: number,
  height: number
) {
  // Update Point geometry and properties
  t.geometry.coordinates = [x + width / 2, y + height / 2] as [number, number];
  t.geometry.bbox = [x, y, x + width, y + height];
  t.properties.width = width;
  t.properties.height = height;
}

export function getArrowStart(a: Arrow) {
  const [x, y] = a.geometry.coordinates[0];
  return { x, y };
}

export function getArrowSide(a: Arrow, side: Side) {
  const [x, y] = a.geometry.coordinates[side === SIDE_START ? 0 : 1];
  return { x, y };
}

export function getArrowEnd(a: Arrow) {
  const [x, y] = a.geometry.coordinates[1];
  return { x, y };
}

export function setArrowStart(a: Arrow, x: number, y: number) {
  a.geometry.coordinates[0] = [x, y];
}

export function setArrowEnd(a: Arrow, x: number, y: number) {
  a.geometry.coordinates[1] = [x, y];
}

export function getArrowEndPoints(a: Arrow) {
  return { start: getArrowStart(a), end: getArrowEnd(a) };
}

export function setArrowEndPoint(a: Arrow, side: Side, x: number, y: number) {
  if (side === SIDE_START) setArrowStart(a, x, y);
  else setArrowEnd(a, x, y);
}

export const getHandleId = (handle: HTMLDivElement): number =>
  parseInt(handle.getAttribute("data-handle-id") || "-1");

/**
 * Calculate the bounds of a collection of annotations
 * @param annotations
 */
export function getAnnotationsBounds(
  annotations: AnnotationCollection
): Bounds {
  return getCoordinates(annotations).reduce(
    (acc: Bounds, coord) => {
      acc[0] = Math.min(coord[0], acc[0]);
      acc[1] = Math.min(coord[1], acc[1]);
      acc[2] = Math.max(coord[0], acc[2]);
      acc[3] = Math.max(coord[1], acc[3]);
      return acc;
    },
    [
      Number.POSITIVE_INFINITY,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.NEGATIVE_INFINITY
    ]
  );
}

function isPosition(coord: unknown): coord is Position {
  return Array.isArray(coord) && coord.length === 2 && coord.every(isFinite);
}

export function scaleGeometry(
  geometry: LineString | Polygon,
  scale: number,
  ox: number,
  oy: number
) {
  for (let i = 0; i < geometry.coordinates.length; i++) {
    const coord = geometry.coordinates[i];
    if (isPosition(coord)) {
      coord[0] = ox + (coord[0] - ox) * scale;
      coord[1] = oy + (coord[1] - oy) * scale;
    } else {
      for (let j = 0; j < coord.length; j++) {
        const pos = coord[j];
        pos[0] = ox + (pos[0] - ox) * scale;
        pos[1] = oy + (pos[1] - oy) * scale;
      }
    }
  }
  return geometry;
}

export function getCoordinates(
  geojson: Feature | FeatureCollection | Geometry
): Position[] {
  let coords: Position[] = [];
  if (geojson.type == "Point") {
    coords = [geojson.coordinates];
  } else if (geojson.type == "LineString" || geojson.type == "MultiPoint") {
    coords = geojson.coordinates;
  } else if (geojson.type == "Polygon" || geojson.type == "MultiLineString") {
    coords = geojson.coordinates.reduce(function (dump, part) {
      return dump.concat(part);
    }, []);
  } else if (geojson.type == "MultiPolygon") {
    coords = geojson.coordinates.reduce<Position[]>(
      (dump, poly) =>
        dump.concat(poly.reduce((points, part) => points.concat(part), [])),
      []
    );
  } else if (geojson.type == "Feature") {
    if (
      isText(geojson as AnnotationFeature) ||
      isBox(geojson as AnnotationFeature)
    ) {
      const bbox = getBbox(geojson as Box | Text);
      coords = [
        [bbox[0], bbox[1]],
        [bbox[2], bbox[3]]
      ];
    } else coords = getCoordinates(geojson.geometry);
  } else if (geojson.type == "GeometryCollection") {
    coords = geojson.geometries.reduce<Position[]>(
      (dump, g) => dump.concat(getCoordinates(g)),
      []
    );
  } else if (geojson.type == "FeatureCollection") {
    coords = geojson.features.reduce<Position[]>(
      (dump, f) => dump.concat(getCoordinates(f)),
      []
    );
  }
  return coords;
}

export function getAttachmentPointOnNode(
  start: Point,
  nodeCenter: Point,
  nodeRadius: number
) {
  const angle = Math.atan2(start.y - nodeCenter.y, start.x - nodeCenter.x);
  return {
    x: nodeCenter.x + nodeRadius * Math.cos(angle),
    y: nodeCenter.y + nodeRadius * Math.sin(angle)
  };
}

export function clientToContainerPosition(
  evt: ClientMouseEvent,
  container?: HTMLElement | null
) {
  if (!container) return { x: evt.clientX, y: evt.clientY };
  const rect = container.getBoundingClientRect();
  return {
    x: evt.clientX - rect.left - container.clientLeft,
    y: evt.clientY - rect.top - container.clientTop
  };
}

export function colorToRgba(color: string, alpha: number) {
  if (color.startsWith("#")) return hexToRgba(color, alpha);
  if (color.startsWith("rgb")) return rgbToRgba(color, alpha);
  return color;
}

export function hexShortToLong(color: string) {
  if (color.length === 4)
    return color
      .split("")
      .map((c) => c + c)
      .join("");
  return color;
}

export function hexToRgba(color: string, alpha: number) {
  const [r, g, b] = hexShortToLong(color)
    .match(/\w\w/g)!
    .map((c) => parseInt(c, 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function rgbToRgba(color: string, alpha: number) {
  const [r, g, b] = color.match(/\d+/g)!.map((c) => parseInt(c, 10));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getBrowserWindow() {
  return typeof window !== "undefined"
    ? (window as unknown as HTMLElement)
    : undefined;
}

export const throttle = <T extends unknown[]>(
  callback: (...args: T) => void,
  delay: number
) => {
  let isWaiting = false;

  return (...args: T) => {
    if (isWaiting) return;

    callback(...args);
    isWaiting = true;

    setTimeout(() => {
      isWaiting = false;
    }, delay);
  };
};

export const debounce = <F extends (...args: Parameters<F>) => ReturnType<F>>(
  func: F,
  waitFor: number
) => {
  let timeout: ReturnType<typeof setTimeout>;

  const debounced = (...args: Parameters<F>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), waitFor);
  };

  return debounced;
};

export function debounceTail<T, A extends unknown[]>(
  fn: (this: T, ...args: A) => void,
  delay: number
): (this: T, ...args: A) => void {
  let timer: ReturnType<typeof setTimeout>;

  return function (this: T, ...args: A): void {
    // Trailing edge.
    // Postpone calling fn until the delay has elapsed since the last call.
    // Each call clears any previously delayed call and resets the delay, so
    // the postponed call will always be the last one.
    clearTimeout(timer);
    timer = setTimeout(() => {
      // Call fn on the trailing edge.
      fn.apply(this, args);
    }, delay);
  };
}

export {
  getBbox as getTextBbox,
  updateBbox as updateTextBbox,
  setBbox as setTextBbox,
  getBoxSize as getTextSize,
  getBoxPosition as getTextPosition
};

/**
 * Migrates old Polygon-based Box/Text to new Point-based format
 * Called only when annotations are added/loaded
 */
export function migrateBoxOrTextIfNeeded<T extends Annotation>(
  annotation: T
): T {
  // Only migrate Box or Text annotations with Polygon geometry
  if (
    (isBox(annotation) || isText(annotation)) &&
    (annotation.geometry as unknown as Polygon | GeoJSONPoint).type ===
      "Polygon"
  ) {
    const coords = (annotation.geometry as unknown as Polygon).coordinates[0];
    const x0 = coords[0][0];
    const y0 = coords[0][1];
    const x1 = coords[2][0];
    const y1 = coords[2][1];

    const width = x1 - x0;
    const height = y1 - y0;
    const centerX = x0 + width / 2;
    const centerY = y0 + height / 2;

    return {
      ...annotation,
      geometry: {
        type: "Point",
        coordinates: [centerX, centerY],
        bbox: [x0, y0, x1, y1]
      },
      properties: {
        ...annotation.properties,
        width,
        height
      }
    } as T;
  }

  return annotation;
}
