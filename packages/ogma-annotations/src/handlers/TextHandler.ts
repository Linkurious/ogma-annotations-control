import Ogma, { Point } from "@linkurious/ogma";
import { Handler } from "./Handler";
import { getTransformMatrix } from "../renderer/shapes/utils";
import { Text } from "../types";
import { getBoxSize, updateBbox } from "../utils";
import { dot } from "../vec";
import { Store } from "../store";

type Handle = {
  edge: "top" | "right" | "bottom" | "left";
  min: Point;
  max: Point;
  axis: Point;
  norm: Point;
};
export class TextHandler extends Handler<Text, Handle> {
  constructor(ogma: Ogma, store: Store) {
    super(ogma, store);
  }

  _detectHandle(e: MouseEvent) {
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
  _drag(e: MouseEvent) {
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
        detail: {
          point: mousePoint,
          annotation,
          handle
        }
      })
    );

    // this.dispatchEvent(
    //   new CustomEvent("dragging", {
    //     detail: {}
    //   })
    // );
  }
  protected _dragStart() {}
  protected _dragEnd() {}
}
