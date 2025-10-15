import Ogma, { Point } from "@linkurious/ogma";
import { Handler } from "./base";
import { TextArea } from "./textArea";
import { cursors, handleRadius } from "../constants";
import { Links } from "../links";
import { Store } from "../store";
import { ClientMouseEvent, Cursor, Text, isBox } from "../types";
import { getBoxCenter, getBoxPosition, getBoxSize } from "../utils";
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
  [EdgeType.TOP, AXIS_Y, -0.5, -0.5, 0.5, -0.5],
  [EdgeType.RIGHT, AXIS_X, 0.5, -0.5, 0.5, 0.5],
  [EdgeType.BOTTOM, AXIS_Y, -0.5, 0.5, 0.5, 0.5],
  [EdgeType.LEFT, AXIS_X, -0.5, -0.5, -0.5, 0.5]
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
  [-0.5, -0.5], // top-left (index 0)
  [0.5, -0.5], // top-right (index 1)
  [0.5, 0.5], // bottom-right (index 2)
  [-0.5, 0.5] // bottom-left (index 3)
] as const;

type Handle = {
  type: HandleType;
  edge?: EdgeType;
  corner: number; // 0=top-left, 1=top-right, 2=bottom-right, 3=bottom-left
};

const cornerCursors: Cursor[] = [
  cursors.nwResize, // top-left (0)
  cursors.neResize, // top-right (1)
  cursors.seResize, // bottom-right (2)
  cursors.swResize // bottom-left (3)
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

    const origin = getBoxCenter(annotation);
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
        this.hoveredHandle = { type: HandleType.EDGE, edge, corner: -1 };
        this.store.setState({ hoveredHandle: points[edge][0] + 4 }); // Offset edge handles
        this.setCursor(this.getEdgeCursor(edge));
        return;
      }
    }

    // detect if we are inside the box (for moving)
    if (
      mx >= -width / 2 - margin &&
      mx <= width / 2 + margin &&
      my >= -height / 2 - margin &&
      my <= height / 2 + margin
    ) {
      this.store.setState({ hoveredHandle: 8 }); // 8 = body
      // Treat body as edge for dragging
      this.hoveredHandle = { type: HandleType.BODY, corner: -1 };
      this.setCursor(cursors.grab);
      return;
    }

    this.store.setState({ hoveredHandle: -1 });
    this.setCursor(cursors.default);
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
      updatedGeometry = this.dragCorner(original, delta, handle.corner);
    } else if (handle.type === HandleType.EDGE && handle.edge) {
      // Edge handle: move the edge
      updatedGeometry = this.dragEdge(original, delta, handle);
    } else if (handle.type === HandleType.BODY) {
      // Body drag: move the entire box
      updatedGeometry = this.dragBody(original, delta);
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

  private dragBody(original: Text, delta: Point) {
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

  private dragCorner(original: Text, delta: Point, cornerIndex: number) {
    const isTop = cornerIndex === 0 || cornerIndex === 1;
    const isLeft = cornerIndex === 0 || cornerIndex === 3;
    const isRight = cornerIndex === 1 || cornerIndex === 2;
    const isBottom = cornerIndex === 2 || cornerIndex === 3;

    const { x, y } = getBoxPosition(original);
    const { width, height } = getBoxSize(original);

    // Get rotation from store for counter-rotation
    const state = this.store.getState();
    const { revSin: sin, revCos: cos } = state;

    // Transform delta to box's local (screen-aligned) coordinate system
    // This accounts for the counter-rotation applied to keep text screen-aligned
    const localDeltaX = delta.x * cos - delta.y * sin;
    const localDeltaY = delta.x * sin + delta.y * cos;

    // Current center position
    const centerX = x + width / 2;
    const centerY = y + height / 2;

    // Calculate new dimensions in local space
    // When dragging a corner, the box grows/shrinks in both directions from center
    let desiredDeltaWidth = 0;
    let desiredDeltaHeight = 0;

    if (isLeft) {
      desiredDeltaWidth = -localDeltaX; // Moving left corner left increases width
    } else if (isRight) {
      desiredDeltaWidth = localDeltaX; // Moving right corner right increases width
    }

    if (isTop) {
      desiredDeltaHeight = -localDeltaY; // Moving top corner up increases height
    } else if (isBottom) {
      desiredDeltaHeight = localDeltaY; // Moving bottom corner down increases height
    }

    // New dimensions with minimum size constraint
    const newWidth = Math.max(0, width + desiredDeltaWidth);
    const newHeight = Math.max(0, height + desiredDeltaHeight);

    // ACTUAL size change after applying constraints
    const actualDeltaWidth = newWidth - width;
    const actualDeltaHeight = newHeight - height;

    // Center translation to keep opposite corner pinned
    // Center moves by half the ACTUAL size change
    const centerDeltaX = isLeft ? -actualDeltaWidth / 2 : actualDeltaWidth / 2;
    const centerDeltaY = isTop ? -actualDeltaHeight / 2 : actualDeltaHeight / 2;

    const newCenterX = centerX + centerDeltaX;
    const newCenterY = centerY + centerDeltaY;

    // Calculate new top-left corner from center
    const newX = newCenterX - newWidth / 2;
    const newY = newCenterY - newHeight / 2;

    const oppositeCornerX = isLeft ? x + width : x;
    const oppositeCornerY = isTop ? y + height : y;

    // rotate new corner back to original orientation
    const rotatedCorner = {
      x: oppositeCornerX * cos - oppositeCornerY * sin,
      y: oppositeCornerX * sin + oppositeCornerY * cos
    };
    console.log(this.ogma.view.graphToScreenCoordinates(rotatedCorner));
    // Sanity check: ensure corner being dragged does not cross opposite corner

    return {
      type: original.geometry.type,
      coordinates: [
        [
          [newX, newY],
          [newX + newWidth, newY],
          [newX + newWidth, newY + newHeight],
          [newX, newY + newHeight],
          [newX, newY]
        ]
      ]
    };
  }

  private dragEdge(original: Text, delta: Point, handle: Handle) {
    const { x, y } = getBoxPosition(original);
    const { width, height } = getBoxSize(original);

    // Get rotation from store for counter-rotation
    const state = this.store.getState();
    const { revSin: sin, revCos: cos } = state;

    // Transform delta to box's local (screen-aligned) coordinate system
    const localDeltaX = delta.x * cos - delta.y * sin;
    const localDeltaY = delta.x * sin + delta.y * cos;

    let newX = x;
    let newY = y;
    let newWidth = width;
    let newHeight = height;

    switch (handle.edge) {
      case EdgeType.TOP:
        newY = y + localDeltaY;
        newHeight = Math.max(10, height - localDeltaY);
        break;
      case EdgeType.BOTTOM:
        newHeight = Math.max(10, height + localDeltaY);
        break;
      case EdgeType.LEFT:
        newX = x + localDeltaX;
        newWidth = Math.max(10, width - localDeltaX);
        break;
      case EdgeType.RIGHT:
        newWidth = Math.max(10, width + localDeltaX);
        break;
    }

    return {
      type: original.geometry.type,
      coordinates: [
        [
          [newX, newY],
          [newX + newWidth, newY],
          [newX + newWidth, newY + newHeight],
          [newX, newY + newHeight],
          [newX, newY]
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
    return cornerCursors[cornerIndex];
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
