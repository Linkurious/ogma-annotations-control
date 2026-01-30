import type { Point, NodeId, NodeList } from "@linkurious/ogma";
import { TARGET_TYPES } from "../../constants";
import { subtract, add, length, mul } from "../../utils/vec";

export type NodeSnap = {
  point: Point;
  id: NodeId;
  magnet: Point;
  type: typeof TARGET_TYPES.NODE;
};

export function snapToNodes(
  point: Point,
  nodes: NodeList,
  detectMargin: number
): NodeSnap | null {
  const xyrs = nodes.getAttributes(["x", "y", "radius"]);
  for (let i = 0; i < xyrs.length; i++) {
    const xyr = xyrs[i];
    const vec = subtract({ x: xyr.x, y: xyr.y }, point);
    const dist = length(vec);
    if (dist >= Number(xyr.radius) + Number(detectMargin)) continue;
    const unit = mul(vec, 1 / dist);
    const snapToCenter = dist < Number(xyr.radius) / 2;
    const snapPoint = snapToCenter
      ? { x: xyr.x, y: xyr.y }
      : add({ x: xyr.x, y: xyr.y }, mul(unit, -Number(xyr.radius)));
    const magnet = snapToCenter ? { x: 0, y: 0 } : unit;
    return {
      point: snapPoint,
      id: nodes.get(i).getId(),
      magnet,
      type: TARGET_TYPES.NODE
    };
  }
  return null;
}
