import Ogma, { Point } from "@linkurious/ogma";
import { Handler } from "./base";
import { TextArea } from "./textArea";
import { handleRadius } from "../constants";
import { Links } from "../links";
import { Store } from "../store";
import { ClientMouseEvent, Cursor, Text, isBox } from "../types";
import { getBoxPosition, getBoxSize } from "../utils";
import { dot, subtract } from "../vec";

// Constants for edge detection
const AXIS_X = { x: 1, y: 0 } as const;
const AXIS_Y = { x: 0, y: 1 } as const;

enum HandleType {
  EDGE = "edge",
  CORNER = "corner",
  BODY = "body"
}

enum EdgeType {
  TOP = "top",
  RIGHT = "right",
  BOTTOM = "bottom",
  LEFT = "left"
}

// Edge template definitions: [edge, axis, norm, xStart, yStart, xEnd, yEnd]
const EDGE_TEMPLATES = [
  [EdgeType.TOP, AXIS_Y, 0, 0, 1, 0],
  [EdgeType.RIGHT, AXIS_X, 1, 0, 1, 1],
  [EdgeType.BOTTOM, AXIS_Y, 0, 1, 1, 1],
  [EdgeType.LEFT, AXIS_X, 0, 0, 0, 1]
] as const;

const points = {
  top: [0, 1],
  right: [1, 2],
  bottom: [2, 3],
  left: [3, 0]
};

// Corner handle positions (clockwise from top-left): [x, y] multipliers
// Handle Index Mapping:
// Corner handles (0-3):
// ┌─0─┬─1─┐  0: top-left
// │   │   │  1: top-right
// ├─3─┼─2─┤  2: bottom-right
// │   │   │  3: bottom-left
// └───┴───┘
//
// Edge handles (4-7):
// ┌─4─┬─5─┐  4: top edge
// │   │   │  5: right edge
// ├─7─┼─6─┤  6: bottom edge
// │   │   │  7: left edge
// └───┴───┘
const CORNER_HANDLES = [
  [0, 0], // top-left (index 0)
  [1, 0], // top-right (index 1)
  [1, 1], // bottom-right (index 2)
  [0, 1] // bottom-left (index 3)
] as const;

type Handle = {
  type: HandleType;
  edge?: EdgeType;
  corner?: number; // 0=top-left, 1=top-right, 2=bottom-right, 3=bottom-left
};

const cursors: Cursor[] = [
  "nw-resize", // top-left (0)
  "ne-resize", // top-right (1)
  "se-resize", // bottom-right (2)
  "sw-resize" // bottom-left (3)
];

export class TextHandler extends Handler<Text, Handle> {
  private links: Links;
  private textEditor: TextArea | null = null;

  constructor(ogma: Ogma, store: Store, links: Links) {
    super(ogma, store);
    this.links = links;
  }

  detectHandle(evt: MouseEvent, zoom: number) {
    const annotation = this.getAnnotation()!;
    const { x, y } = this.clientToCanvas(evt);
    const { width, height } = getBoxSize(annotation);
    // TODO: detection threshold (state)
    const margin = 3 / zoom;

    const origin = getBoxPosition(annotation);
    const state = this.store.getState();
    let { revSin: sin, revCos: cos } = state;

    if (isBox(annotation)) {
      sin = 0;
      cos = 1;
    }

    this.hoveredHandle = undefined;

    const handleSize = handleRadius * (1 / zoom);

    const dmx = x - origin.x;
    const dmy = y - origin.y;

    const mx = dmx * cos - dmy * sin;
    const my = dmx * sin + dmy * cos;

    // Check corner handles first (higher priority)
    for (let i = 0; i < CORNER_HANDLES.length; i++) {
      const [xOffset, yOffset] = CORNER_HANDLES[i];

      const cx = width * xOffset;
      const cy = height * yOffset;

      if (
        mx >= cx - handleSize - margin &&
        mx <= cx + handleSize + margin &&
        my >= cy - handleSize - margin &&
        my <= cy + handleSize + margin
      ) {
        this.hoveredHandle = {
          type: HandleType.CORNER,
          corner: i
        };
        this.store.setState({ hoveredHandle: i });
        this.setCursor(this.getCornerCursor(i));
        return; // Exit early if corner handle found
      }
    }

    // Check edge handles if no corner handle was found
    for (const [edge, norm, xStart, yStart, xEnd, yEnd] of EDGE_TEMPLATES) {
      const minX = width * xStart;
      const minY = height * yStart;
      const maxX = width * xEnd;
      const maxY = height * yEnd;

      const dist = dot(norm, { x: mx - minX, y: my - minY });

      if (
        Math.abs(dist) < margin &&
        mx >= minX - margin &&
        mx <= maxX + margin &&
        my >= minY - margin &&
        my <= maxY + margin
      ) {
        this.hoveredHandle = { type: HandleType.EDGE, edge };
        this.store.setState({ hoveredHandle: points[edge][0] + 4 }); // Offset edge handles
        this.setCursor(this.getEdgeCursor(edge));
        return;
      }
    }

    // detect if we are inside the box (for moving)
    if (
      mx >= margin &&
      mx <= width + margin &&
      my >= margin &&
      my <= height + margin
    ) {
      this.store.setState({ hoveredHandle: 8 }); // 8 = body
      // Treat body as edge for dragging
      this.hoveredHandle = { type: HandleType.BODY };
      this.setCursor("grab");
      return;
    }

    this.store.setState({ hoveredHandle: -1 });
    this.setCursor("default");
  }

  onDrag(evt: MouseEvent) {
    if (!this.dragStartPoint || !this.hoveredHandle || !this.isActive()) return;

    evt.stopPropagation();
    evt.stopImmediatePropagation();

    const annotation = this.getAnnotation()!;
    const mousePoint = this.clientToCanvas(evt);
    const delta = {
      x: mousePoint.x - this.dragStartPoint.x,
      y: mousePoint.y - this.dragStartPoint.y
    };
    const handle = this.hoveredHandle;
    const original = this.getAnnotation()!;

    // Create updated geometry based on handle type
    let updatedGeometry: Text["geometry"] | null = null;

    if (handle.type === HandleType.CORNER) {
      // Corner handle: resize from the corner
      updatedGeometry = this.calculateCornerDrag(
        original,
        delta,
        handle.corner!
      );
    } else if (handle.type === HandleType.EDGE && handle.edge) {
      // Edge handle: move the edge
      updatedGeometry = this.calculateEdgeDrag(original, delta, handle);
    } else if (handle.type === HandleType.BODY) {
      // Body drag: move the entire box
      updatedGeometry = this.calculateBodyDrag(original, delta);
    }

    if (updatedGeometry) {
      const update = {
        id: annotation.id,
        properties: annotation.properties,
        geometry: updatedGeometry
      } as Text;
      // Apply live update to store instead of direct mutation
      this.store.getState().applyLiveUpdate(annotation.id, update);
      const displacement = subtract(
        getBoxPosition(update),
        getBoxPosition(original)
      );
      this.links.updateLinkedArrowsDuringDrag(annotation.id, displacement);
      if (this.textEditor) this.textEditor.update();
    }

    this.dispatchEvent(
      new CustomEvent("dragging", {
        detail: {
          point: mousePoint,
          annotation: this.annotation,
          handle
        }
      })
    );
  }

  private calculateBodyDrag(original: Text, delta: Point) {
    const { x, y } = getBoxPosition(original);
    const { width, height } = getBoxSize(original);
    return {
      type: original.geometry.type,
      coordinates: [
        [
          [x + delta.x, y + delta.y],
          [x + delta.x + width, y + delta.y],
          [x + delta.x + width, y + delta.y + height],
          [x + delta.x, y + delta.y + height],
          [x + delta.x, y + delta.y]
        ]
      ]
    };
  }

  private calculateCornerDrag(
    original: Text,
    delta: Point,
    cornerIndex: number
  ) {
    const isTop = cornerIndex === 0 || cornerIndex === 1;
    const isLeft = cornerIndex === 0 || cornerIndex === 3;
    const isRight = cornerIndex === 1 || cornerIndex === 2;
    const isBottom = cornerIndex === 2 || cornerIndex === 3;

    let { x, y } = getBoxPosition(original);
    let { width, height } = getBoxSize(original);

    // Resizing the box by dragging one of the corners
    if (isLeft && isTop) {
      x += delta.x;
      y += delta.y;
      width -= delta.x;
      height -= delta.y;
    } else if (isRight && isBottom) {
      width += delta.x;
      height += delta.y;
    } else if (isLeft && isBottom) {
      x += delta.x;
      width -= delta.x;
      height += delta.y;
    } else if (isRight && isTop) {
      y += delta.y;
      width += delta.x;
      height -= delta.y;
    }
    return {
      type: original.geometry.type,
      coordinates: [
        [
          [x, y],
          [x + width, y],
          [x + width, y + height],
          [x, y + height],
          [x, y]
        ]
      ]
    };
  }

  private calculateEdgeDrag(original: Text, delta: Point, handle: Handle) {
    let { x, y } = getBoxPosition(original);
    let { width, height } = getBoxSize(original);

    switch (handle.edge) {
      case EdgeType.TOP:
        y += delta.y;
        height = Math.max(0, height - delta.y);
        break;
      case EdgeType.BOTTOM:
        height = Math.max(0, height + delta.y);
        break;
      case EdgeType.LEFT:
        x += delta.x;
        width = Math.max(0, width - delta.x);
        break;
      case EdgeType.RIGHT:
        width = Math.max(0, width + delta.x);
        break;
    }
    return {
      type: original.geometry.type,
      coordinates: [
        [
          [x, y],
          [x + width, y],
          [x + width, y + height],
          [x, y + height],
          [x, y]
        ]
      ]
    };
  }

  protected onDragStart(evt: ClientMouseEvent) {
    if (!super.onDragEnd(evt)) return false;
    // Start live update tracking for this annotation
    this.store.getState().startLiveUpdate([this.annotation!]);
    return true;
  }

  protected onClick(_evt: ClientMouseEvent) {
    // show text editor
    if (this.textEditor === null) {
      this.textEditor = new TextArea(this.ogma, this.store, this.annotation!);
    }
  }

  protected onDragEnd(evt: ClientMouseEvent) {
    if (!super.onDragEnd(evt)) return false;
    const currentPos = this.clientToCanvas(evt);
    const dx = currentPos.x - (this.dragStartPoint?.x || 0);
    const dy = currentPos.y - (this.dragStartPoint?.y || 0);
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
      this.clearDragState();
      this.onClick(evt);
    } else this.commitChange();
    this.hoveredHandle = undefined;
    this.dragStartPoint = undefined;
    this.dragging = false;
    return true;
  }

  private getCornerCursor(cornerIndex: number): Cursor {
    // Return resize cursors based on corner position
    return cursors[cornerIndex];
  }

  private getEdgeCursor(edge: EdgeType): Cursor {
    // Return resize cursors based on edge direction
    switch (edge) {
      case EdgeType.TOP:
      case EdgeType.BOTTOM:
        return "ns-resize"; // vertical resize
      case EdgeType.LEFT:
      case EdgeType.RIGHT:
        return "ew-resize"; // horizontal resize
      default:
        return "default";
    }
  }

  public stopEditing(): void {
    super.stopEditing();
    if (this.textEditor) this.textEditor.destroy();
    this.commitChange();
    this.textEditor = null;
  }
}
