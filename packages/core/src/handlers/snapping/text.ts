import type { Point } from "@linkurious/ogma";
import { TARGET_TYPES } from "../../constants";
import { Store } from "../../store";
import { Id, Text, isBox } from "../../types";
import { getBoxCenter, getBoxSize } from "../../utils/utils";
import { subtract, length, dot } from "../../utils/vec";

export type TextSnap = {
  point: Point;
  magnet: Point;
  type: typeof TARGET_TYPES.TEXT;
  id: Id;
};

export const MAGNETS: Point[] = [
  { x: -0.5, y: -0.5 },
  { x: 0, y: -0.5 },
  { x: 0.5, y: -0.5 },
  { x: -0.5, y: 0 },
  { x: 0.5, y: 0 },
  { x: -0.5, y: 0.5 },
  { x: 0, y: 0.5 },
  { x: 0.5, y: 0.5 },
  { x: 0, y: 0 } // center
];

// Edge definitions in normalized coordinates: [x1, y1, x2, y2]
// Edges are: top, right, bottom, left
const EDGE_DEFS = [
  [-0.5, -0.5, 0.5, -0.5], // top
  [0.5, -0.5, 0.5, 0.5], // right
  [0.5, 0.5, -0.5, 0.5], // bottom
  [-0.5, 0.5, -0.5, -0.5] // left
] as const;

// Transform local corner to world coordinates
function toWorld(
  lx: number,
  ly: number,
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  cos: number,
  sin: number,
  isRotated: boolean
): Point {
  const x = lx * width;
  const y = ly * height;
  if (isRotated) {
    return {
      x: centerX + (x * cos - y * sin),
      y: centerY + (x * sin + y * cos)
    };
  }
  return { x: centerX + x, y: centerY + y };
}

export function snapToMagnetPoints(
  point: Point,
  text: Text,
  zoom: number,
  magnetRadius: number,
  store: Store
): TextSnap | null {
  const center = getBoxCenter(text);
  let { width, height } = getBoxSize(text);
  const { sin, cos } = store.getState();

  if (text.properties.style?.fixedSize) {
    width /= zoom;
    height /= zoom;
  }

  for (const magnet of MAGNETS) {
    // Calculate offset in local (box) coordinates
    let offsetX = magnet.x * width;
    let offsetY = magnet.y * height;

    // For texts (counter-rotated), rotate the offset to world coordinates
    if (!isBox(text)) {
      // Rotate the offset by the current rotation
      const rotatedX = offsetX * cos - offsetY * sin;
      const rotatedY = offsetX * sin + offsetY * cos;
      offsetX = rotatedX;
      offsetY = rotatedY;
    }

    const magnetPoint = { x: center.x + offsetX, y: center.y + offsetY };
    const dist = length(subtract(magnetPoint, point));
    if (dist >= magnetRadius) continue;
    return {
      point: { x: magnetPoint.x, y: magnetPoint.y },
      type: TARGET_TYPES.TEXT,
      magnet,
      id: text.id
    };
  }
  return null;
}

export function snapToEdge(
  point: Point,
  text: Text,
  zoom: number,
  magnetRadius: number,
  store: Store
): TextSnap | null {
  const { x, y } = getBoxCenter(text);
  let { width, height } = getBoxSize(text);

  if (text.properties.style?.fixedSize) {
    width /= zoom;
    height /= zoom;
  }

  const { sin, cos } = store.getState();
  const isRotated = !isBox(text);

  let closestSnap: TextSnap | null = null;
  let closestDist = Infinity;

  for (let i = 0; i < 4; i++) {
    const [lx1, ly1, lx2, ly2] = EDGE_DEFS[i];
    const p1 = toWorld(lx1, ly1, x, y, width, height, cos, sin, isRotated);
    const p2 = toWorld(lx2, ly2, x, y, width, height, cos, sin, isRotated);

    const edgeVec = subtract(p2, p1);
    const edgeLength = length(edgeVec);
    const edgeDir = { x: edgeVec.x / edgeLength, y: edgeVec.y / edgeLength };
    const edgeNorm = { x: -edgeDir.y, y: edgeDir.x };

    const toPoint = subtract(point, p1);
    const dist = dot(edgeNorm, toPoint);
    const projection = dot(edgeDir, toPoint);

    // Check if projection is within edge bounds
    if (projection >= 0 && projection <= edgeLength) {
      const absDist = Math.abs(dist);

      // If within magnetRadius OR if this is the closest edge (for points inside box)
      if (absDist < magnetRadius || absDist < closestDist) {
        // Interpolate local magnet position
        const t = projection / edgeLength;

        const snap = {
          point: {
            x: p1.x + edgeDir.x * projection,
            y: p1.y + edgeDir.y * projection
          },
          magnet: {
            x: lx1 + (lx2 - lx1) * t,
            y: ly1 + (ly2 - ly1) * t
          },
          type: TARGET_TYPES.TEXT,
          id: text.id
        };

        // If within magnetRadius, return immediately
        if (absDist < magnetRadius) return snap;

        // Otherwise track as closest for potential inside-box snap
        if (absDist < closestDist) {
          closestDist = absDist;
          closestSnap = snap;
        }
      }
    }
  }

  // If we found a closest edge and the point seems to be inside the box
  // (all distances were checked and we have a closest), snap to it
  if (closestSnap && closestDist < Math.max(width, height)) {
    return closestSnap;
  }

  return null;
}

export function snapToText(
  point: Point,
  texts: Text[],
  zoom: number,
  magnetRadius: number,
  store: Store
): TextSnap | null {
  for (const text of texts) {
    const snap =
      snapToMagnetPoints(point, text, zoom, magnetRadius, store) ||
      snapToEdge(point, text, zoom, magnetRadius, store);
    if (snap) return snap;
  }
  return null;
}
