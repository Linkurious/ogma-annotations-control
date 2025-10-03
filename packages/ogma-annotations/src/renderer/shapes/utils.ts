import { View } from "@linkurious/ogma";
import { Box, Text } from "../../types";
import { getBoxPosition } from "../../utils";
import { rotateRadians } from "../../vec";

interface Point {
  x: number;
  y: number;
}

export function getTransformMatrix<T extends Box | Text>(
  box: T,
  view: View,
  asString?: true
): string;
export function getTransformMatrix<T extends Box | Text>(
  box: T,
  view: View,
  asString?: false
): Point;
export function getTransformMatrix<T extends Box | Text>(
  box: T,
  { angle = 0 }: View,
  asString = true
): string | Point {
  const position = getBoxPosition(box);
  const { x, y } = rotateRadians(position, -angle);
  // scale it around its center
  const scale = 1;

  if (!asString) return { x, y };
  return `matrix(${scale}, 0, 0, ${scale}, ${x}, ${y})`;
}

export function getRotationMatrix(angle: number, cx: number, cy: number) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const tx = cx * (1 - cos) + cy * sin;
  const ty = cy * (1 - cos) - cx * sin;
  return `matrix(${cos}, ${sin}, ${-sin}, ${cos}, ${-tx}, ${-ty})`;
}
