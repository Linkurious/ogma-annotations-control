import { strokeColor, strokeWidth } from "./styles";
import { Text } from "../../types";
import { getBoxSize } from "../../utils";
import { getTransformMatrix } from "../shapes/utils";

export function renderBox(
  ctx: CanvasRenderingContext2D,
  angle: number,
  annotation: Text
): void {
  const size = getBoxSize(annotation);
  const matrix = getTransformMatrix(annotation, { angle }, false);
  ctx.strokeStyle = strokeColor;
  // TODO: this is thicker for debugging.
  ctx.lineWidth = strokeWidth;
  ctx.save();
  ctx.transform(1, 0, 0, 1, matrix.x, matrix.y);
  ctx.moveTo(matrix.x, matrix.y);
  ctx.beginPath();
  ctx.rect(0, 0, size.width, size.height);
  ctx.stroke();
  ctx.restore();
}
