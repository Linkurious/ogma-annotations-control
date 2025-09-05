import Ogma, { Point } from "@linkurious/ogma";
import { Handler } from "./Handler";
import { defaultStyle as defaultTextStyle } from "../Editor/Box/defaults";
import { getTransformMatrix } from "../renderer/shapes/utils";
import { Text } from "../types";
import { getBoxSize, updateBbox } from "../utils";
import { dot } from "../vec";
type Handle = {
  edge: "top" | "right" | "bottom" | "left";
  min: Point;
  max: Point;
  axis: Point;
  norm: Point;
};
export class TextHandler extends Handler<Text> {
  private hoveredHandle?: Handle;
  constructor(ogma: Ogma) {
    super(ogma);
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
      // TODO: this is thicker for debugging.
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
  handleMouseMove(e: MouseEvent): void {
    // compute the distance between the mouse and the edges of te box
    if (!this.isActive()) return;
    if (!this.dragging) {
      return this._detectHandle(e);
    } else if (this.dragStartPoint) {
      this._drag(e);
    }
  }
  handleMouseDown(e: MouseEvent): void {
    if (!this.isActive() || !this.hoveredHandle) return;
    e.preventDefault();
    e.stopPropagation();
    // start resizing
    this.dragging = true;
    this.dragStartPoint = this.clientToCanvas(e);
    this.dragStartAnnotation = JSON.parse(JSON.stringify(this.annotation));
    this.ogmaPanningOption = Boolean(
      this.ogma.getOptions().interactions?.pan?.enabled
    );
    this.ogma.setOptions({
      interactions: { pan: { enabled: false } }
    });
  }
  handleMouseUp(e: MouseEvent): void {
    if (!this.isActive() || !this.dragging) return;
    this.dragging = false;
    this.ogma.setOptions({
      interactions: { pan: { enabled: this.ogmaPanningOption } }
    });
  }

  private _detectHandle(e: MouseEvent) {
    const annotation = this.annotation!;
    const mousePoint = this.clientToCanvas(e);
    const size = getBoxSize(annotation);
    const matrix = getTransformMatrix(annotation, { angle: 0 }, false);
    const margin = 5;
    const xs = { x: 1, y: 0 };
    const ys = { x: 0, y: 1 };
    const hovered = (
      [
        {
          edge: "top",
          min: { x: matrix.x, y: matrix.y },
          max: { x: matrix.x + size.width, y: matrix.y },
          axis: xs,
          norm: ys
        },
        {
          edge: "right",
          min: { x: matrix.x + size.width, y: matrix.y },
          max: { x: matrix.x + size.width, y: matrix.y + size.height },
          axis: ys,
          norm: xs
        },
        {
          edge: "bottom",
          min: { x: matrix.x, y: matrix.y + size.height },
          max: { x: matrix.x + size.width, y: matrix.y + size.height },
          axis: xs,
          norm: ys
        },
        {
          edge: "left",
          min: { x: matrix.x, y: matrix.y },
          max: { x: matrix.x, y: matrix.y + size.height },
          axis: ys,
          norm: xs
        }
      ] as Handle[]
    ).find(({ min, max, norm }) => {
      const dist = dot(norm, {
        x: mousePoint.x - min.x,
        y: mousePoint.y - min.y
      });
      return (
        Math.abs(dist) < margin &&
        mousePoint.x >= min.x - margin &&
        mousePoint.x <= max.x + margin &&
        mousePoint.y >= min.y - margin &&
        mousePoint.y <= max.y + margin
      );
    });
    this.hoveredHandle = hovered;
  }
  private _drag(e: MouseEvent) {
    if (!this.dragStartPoint || !this.hoveredHandle) return;
    e.stopPropagation();
    e.stopImmediatePropagation();

    const annotation = this.annotation!;
    const mousePoint = this.clientToCanvas(e);
    const delta = {
      x: mousePoint.x - this.dragStartPoint.x,
      y: mousePoint.y - this.dragStartPoint.y
    };
    const handle = this.hoveredHandle;
    // TODO: snapping and min size
    const movement = dot(handle.norm, delta);
    const original = this.dragStartAnnotation!;
    const points = {
      top: [0, 1],
      right: [1, 2],
      bottom: [2, 3],
      left: [3, 0]
    };
    points[handle.edge].forEach((i) => {
      annotation.geometry.coordinates[0][i] = [
        original.geometry.coordinates[0][i][0] + handle.norm.x * movement,
        original.geometry.coordinates[0][i][1] + handle.norm.y * movement
      ];
    });
    updateBbox(annotation);
    this.dispatchEvent(
      new CustomEvent("dragging", {
        detail: {}
      })
    );
  }
  cancelEdit(): void {}
}
