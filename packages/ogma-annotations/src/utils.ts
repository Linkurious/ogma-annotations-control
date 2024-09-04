import { Point } from "@linkurious/ogma";
import type {
  BBox,
  Feature,
  FeatureCollection,
  Geometry,
  LineString,
  Polygon,
  Position,
} from "geojson";
import { AnnotationCollection, Arrow, Text } from "./types";

const SVG_NS = "http://www.w3.org/2000/svg";

export function createSVGElement<T extends SVGElement>(tag: string): T {
  return document.createElementNS(SVG_NS, tag) as T;
}

export function getTextBbox(t: Text) {
  if (!t.geometry.bbox) updateTextBbox(t);
  return t.geometry.bbox as BBox;
}

export function getTextSize(t: Text) {
  const bbox = getTextBbox(t);
  return {
    width: bbox[2] - bbox[0],
    height: bbox[3] - bbox[1],
  };
}

export function getTextPosition(t: Text) {
  const bbox = getTextBbox(t);
  return { x: bbox[0], y: bbox[1] };
}

export function updateTextBbox(t: Text) {
  // TODO: maybe check the winding order of the coordinates
  const [x0, y0] = t.geometry.coordinates[0][0];
  const [x1, y1] = t.geometry.coordinates[0][2];
  t.geometry.bbox = [x0, y0, x1, y1];
}

export function setTextBbox(
  t: Text,
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
      [x, y],
    ],
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

type Bounds = [number, number, number, number];

export function getAnnotationsBounds(
  annotations: AnnotationCollection
): Bounds {
  return getCoordinatesDump(annotations).reduce(
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
      Number.NEGATIVE_INFINITY,
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

function getCoordinatesDump(
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
    coords = getCoordinatesDump(gj.geometry);
  } else if (gj.type == "GeometryCollection") {
    coords = gj.geometries.reduce<Position[]>(
      (dump, g) => dump.concat(getCoordinatesDump(g)),
      []
    );
  } else if (gj.type == "FeatureCollection") {
    coords = gj.features.reduce<Position[]>(
      (dump, f) => dump.concat(getCoordinatesDump(f)),
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
    y: nodeCenter.y + nodeRadius * Math.sin(angle),
  };
}

export function clientToContainerPosition(
  evt: { clientX: number; clientY: number },
  container?: HTMLElement | null
) {
  if (!container) return { x: evt.clientX, y: evt.clientY };
  const rect = container.getBoundingClientRect();
  return {
    x: evt.clientX - rect.left - container.clientLeft,
    y: evt.clientY - rect.top - container.clientTop,
  };
}
