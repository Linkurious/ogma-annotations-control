import { Point } from "@linkurious/ogma";
import type {
  BBox,
  Feature,
  FeatureCollection,
  Geometry,
  LineString,
  Polygon,
  Position
} from "geojson";
import {
  Annotation,
  AnnotationCollection,
  Arrow,
  Bounds,
  Box,
  ClientMouseEvent,
  isArrow,
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
  const bbox = getBbox(t);
  return {
    width: bbox[2] - bbox[0],
    height: bbox[3] - bbox[1]
  };
}

export function getBoxPosition<T extends Annotation>(t: T) {
  const bbox = getBbox(t);
  return { x: bbox[0], y: bbox[1] };
}
export function getBoxCenter<T extends Annotation>(t: T) {
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
  } else {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const coord of t.geometry.coordinates[0]) {
      const [x, y] = coord;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    t.geometry.bbox = [minX, minY, maxX, maxY];
  }
}

export function setBbox(
  t: Box | Text,
  x: number,
  y: number,
  width: number,
  height: number
) {
  t.geometry.bbox = [x, y, x + width, y + height];
  t.geometry.coordinates = [
    [
      [x, y],
      [x + width, y],
      [x + width, y + height],
      [x, y + height],
      [x, y]
    ]
  ];
}

export function getArrowStart(a: Arrow) {
  const [x, y] = a.geometry.coordinates[0];
  return { x, y };
}

export function getArrowSide(a: Arrow, side: "start" | "end") {
  const [x, y] = a.geometry.coordinates[side === "start" ? 0 : 1];
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

export function setArrowEndPoint(
  a: Arrow,
  side: "start" | "end",
  x: number,
  y: number
) {
  if (side === "start") setArrowStart(a, x, y);
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
  gj: Feature | FeatureCollection | Geometry
): Position[] {
  let coords: Position[] = [];
  if (gj.type == "Point") {
    coords = [gj.coordinates];
  } else if (gj.type == "LineString" || gj.type == "MultiPoint") {
    coords = gj.coordinates;
  } else if (gj.type == "Polygon" || gj.type == "MultiLineString") {
    coords = gj.coordinates.reduce(function (dump, part) {
      return dump.concat(part);
    }, []);
  } else if (gj.type == "MultiPolygon") {
    coords = gj.coordinates.reduce<Position[]>(
      (dump, poly) =>
        dump.concat(poly.reduce((points, part) => points.concat(part), [])),
      []
    );
  } else if (gj.type == "Feature") {
    coords = getCoordinates(gj.geometry);
  } else if (gj.type == "GeometryCollection") {
    coords = gj.geometries.reduce<Position[]>(
      (dump, g) => dump.concat(getCoordinates(g)),
      []
    );
  } else if (gj.type == "FeatureCollection") {
    coords = gj.features.reduce<Position[]>(
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

export {
  getBbox as getTextBbox,
  updateBbox as updateTextBbox,
  setBbox as setTextBbox,
  getBoxSize as getTextSize,
  getBoxPosition as getTextPosition
};
