import { View } from "@linkurious/ogma";
import { Box, Text } from "../../types";
import { getBoxPosition, getBoxSize } from "../../utils";
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
  const size = getBoxSize(box);
  const scale = 1;

  const offsetX = x + (size.width / 2) * (1 - scale);
  const offsetY = y + (size.height / 2) * (1 - scale);
  if (!asString) {
    return {
      x: offsetX,
      y: offsetY
    };
  }
  return `matrix(${scale}, 0, 0, ${scale}, ${offsetX}, ${offsetY})`;
}
