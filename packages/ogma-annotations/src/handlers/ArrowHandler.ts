import Ogma, { Point } from "@linkurious/ogma";
import { Handler } from "./Handler";
import { Snap, Snapping } from "./snapping";
import { Links } from "../links";
import { Arrow } from "../types";
type Handle = {
  type: "start" | "end";
  point: Point;
};

export class ArrowHandler extends Handler<Arrow, Handle> {
  private snapping: Snapping;
  private links: Links;
  private snap: Snap | null = null;
  constructor(ogma: Ogma, snapping: Snapping, links: Links) {
    super(ogma);
    this.snapping = snapping;
    this.links = links;
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
    this.snap = this.snapping.snap(annotation, mousePoint);
    const point = this.snap?.point || mousePoint;
    if (handle.type === "start") {
      annotation.geometry.coordinates[0] = [point.x, point.y];
    } else if (handle.type === "end") {
      annotation.geometry.coordinates[1] = [point.x, point.y];
    }

    this.dispatchEvent(
      new CustomEvent("dragging", {
        detail: {
          point,
          annotation,
          handle
        }
      })
    );
  }
  protected _dragEnd() {
    if (!this.snap || !this.annotation || !this.hoveredHandle) return;
    const handle = this.hoveredHandle;

    this.links.add(
      this.annotation,
      handle.type,
      this.snap.id,
      this.snap.type,
      this.snap.magnet
    );
  }
  protected _dragStart() {}
}
