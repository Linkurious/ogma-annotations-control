import Ogma, { Point } from "@linkurious/ogma";
import { Handler } from "./Handler";
import { defaultStyle as defaultArrowStyle } from "../Editor/Arrows/defaults";
import { Arrow } from "../types";

type Handle = {
  type: "start" | "end";
  point: Point;
};

export class ArrowHandler extends Handler<Arrow> {
  private hoveredHandle?: Handle;

  constructor(ogma: Ogma) {
    super(ogma);
  }

  draw(ctx: CanvasRenderingContext2D, angle: number): void {
    if (!this.isActive()) return;

    const annotation = this.annotation!;
    const { strokeColor, strokeWidth, strokeType } =
      annotation.properties.style || defaultArrowStyle;

    const startPoint = annotation.geometry.coordinates[0];
    const endPoint = annotation.geometry.coordinates[1];

    if (strokeType && strokeType !== "none") {
      ctx.strokeStyle = strokeColor || "black";
      // TODO: this is thicker for debugging.
      ctx.lineWidth = 8 * (strokeWidth || 1);

      if (strokeType === "dashed") {
        ctx.setLineDash([5, 5]);
      } else {
        ctx.setLineDash([]);
      }

      // Draw handle circles at endpoints
      ctx.fillStyle = strokeColor || "black";
      ctx.beginPath();
      ctx.arc(startPoint[0], startPoint[1], 4, 0, 2 * Math.PI);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(endPoint[0], endPoint[1], 4, 0, 2 * Math.PI);
      ctx.fill();
    }
  }

  handleMouseMove(e: MouseEvent): void {
    if (!this.isActive()) return;

    if (!this.dragging) {
      return this._detectHandle(e);
    } else if (this.dragStartPoint) {
      this._drag(e);
    }
  }

  handleMouseDown(e: MouseEvent): void {
    if (!this.isActive() || this.dragging || !this.hoveredHandle) return;

    e.preventDefault();
    e.stopPropagation();

    // start dragging endpoint
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
    const margin = 10; // Larger margin for easier arrow endpoint selection

    const startPoint = annotation.geometry.coordinates[0];
    const endPoint = annotation.geometry.coordinates[1];

    const startDistance = Math.sqrt(
      Math.pow(mousePoint.x - startPoint[0], 2) +
        Math.pow(mousePoint.y - startPoint[1], 2)
    );

    const endDistance = Math.sqrt(
      Math.pow(mousePoint.x - endPoint[0], 2) +
        Math.pow(mousePoint.y - endPoint[1], 2)
    );

    if (startDistance < margin) {
      this.hoveredHandle = {
        type: "start",
        point: { x: startPoint[0], y: startPoint[1] }
      };
    } else if (endDistance < margin) {
      this.hoveredHandle = {
        type: "end",
        point: { x: endPoint[0], y: endPoint[1] }
      };
    } else {
      this.hoveredHandle = undefined;
    }
  }

  private _drag(e: MouseEvent) {
    if (!this.dragStartPoint || !this.hoveredHandle) return;

    e.stopPropagation();
    e.stopImmediatePropagation();

    const annotation = this.annotation!;
    const mousePoint = this.clientToCanvas(e);
    const snappedPoint = this.findSnapPoint(mousePoint) || mousePoint;

    const handle = this.hoveredHandle;

    if (handle.type === "start") {
      annotation.geometry.coordinates[0] = [snappedPoint.x, snappedPoint.y];
    } else if (handle.type === "end") {
      annotation.geometry.coordinates[1] = [snappedPoint.x, snappedPoint.y];
    }

    this.dispatchEvent(
      new CustomEvent("dragging", {
        detail: {}
      })
    );
  }

  cancelEdit(): void {}
}
