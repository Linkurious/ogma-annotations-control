import { strokeColor, strokeWidth } from "./styles";
import { Arrow } from "../../types";
export function renderArrow(
  ctx: CanvasRenderingContext2D,
  annotation: Arrow
): void {
  const startPoint = annotation.geometry.coordinates[0];
  const endPoint = annotation.geometry.coordinates[1];

  ctx.lineWidth = strokeWidth;
  ctx.fillStyle = strokeColor;
  ctx.beginPath();
  ctx.arc(startPoint[0], startPoint[1], 4, 0, 2 * Math.PI);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(endPoint[0], endPoint[1], 4, 0, 2 * Math.PI);
  ctx.fill();
}
