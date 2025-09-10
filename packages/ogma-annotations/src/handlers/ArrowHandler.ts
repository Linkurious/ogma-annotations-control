import Ogma, { Point } from "@linkurious/ogma";
import { Handler } from "./Handler";
import { Arrow } from "../types";

type Handle = {
  type: "start" | "end";
  point: Point;
};

export class ArrowHandler extends Handler<Arrow, Handle> {
  constructor(ogma: Ogma) {
    super(ogma);
  }

  _detectHandle(e: MouseEvent) {
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

  _drag(e: MouseEvent) {
    if (!this.dragStartPoint || !this.hoveredHandle) return;

    e.stopPropagation();
    e.stopImmediatePropagation();

    const annotation = this.annotation!;
    const mousePoint = this.clientToCanvas(e);
    const handle = this.hoveredHandle;

    if (handle.type === "start") {
      annotation.geometry.coordinates[0] = [mousePoint.x, mousePoint.y];
    } else if (handle.type === "end") {
      annotation.geometry.coordinates[1] = [mousePoint.x, mousePoint.y];
    }

    this.dispatchEvent(
      new CustomEvent("dragging", {
        detail: {
          point: mousePoint,
          annotation,
          handle
        }
      })
    );
  }
}
