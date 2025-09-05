import { Point } from "@linkurious/ogma/dev";
import { Handler } from "./Handler";
import { defaultStyle as defaultTextStyle } from "../Editor/Box/defaults";
import { getTransformMatrix } from "../renderer/shapes/utils";
import { Text } from "../types";
import { getBoxSize } from "../utils";
export class TextHandler extends Handler<Text> {
  constructor() {
    super();
  }
  draw(ctx: CanvasRenderingContext2D, angle: number): void {
    if (!this.isActive()) return;
    const annotation = this.annotation!;
    const size = getBoxSize(annotation);
    const { strokeColor, strokeWidth, strokeType } =
      annotation.properties.style || defaultTextStyle;
    const matrix = getTransformMatrix(annotation, { angle }, false);
    if (strokeType && strokeType !== "none") {
      ctx.strokeStyle = strokeColor || "black";
      ctx.lineWidth = 8 * (strokeWidth || 1);

      if (strokeType === "dashed") {
        ctx.setLineDash([5, 5]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.save();
      ctx.transform(1, 0, 0, 1, matrix.x, matrix.y);
      ctx.moveTo(matrix.x, matrix.y);
      ctx.beginPath();
      ctx.rect(0, 0, size.width, size.height);
      ctx.stroke();
      ctx.restore();
    }
  }
  handleMouseMove(e: MouseEvent): void {}
  handleMouseDown(e: MouseEvent): void {}
  handleMouseUp(e: MouseEvent): void {}
  cancelEdit(): void {}
}
