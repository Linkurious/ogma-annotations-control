import Ogma, { Point } from "@linkurious/ogma";
import { Handler } from "./base";
import { TextArea } from "./textArea";
import { EVT_DRAG, cursors, handleRadius } from "../constants";
import { Links } from "../links";
import { Store } from "../store";
import { ClientMouseEvent, Cursor, Id, Text, isBox } from "../types";
import { getBoxCenter, getBoxSize } from "../utils";
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
    let updatedFeature: Text | null = null;

    if (handle.type === HandleType.CORNER) {
      // Corner handle: resize from the corner
      updatedFeature = this.dragCorner(original, delta, handle.corner);
    } else if (handle.type === HandleType.EDGE && handle.edge) {
      // Edge handle: move the edge
      updatedFeature = this.dragEdge(original, delta, handle);
    } else if (handle.type === HandleType.BODY) {
      // Body drag: move the entire box
      updatedFeature = this.dragBody(original, delta);
    }

    if (updatedFeature) {
      const update = updatedFeature as Text;
      // Apply live update to store instead of direct mutation
      this.store.getState().applyLiveUpdate(annotation.id, update);
      const displacement = subtract(
        getBoxCenter(update),
        getBoxCenter(original)
      );
      this.links.updateLinkedArrowsDuringDrag(annotation.id, displacement);
      if (this.textEditor) this.textEditor.update();
    }

    this.dispatchEvent(
      new CustomEvent(EVT_DRAG, {
        detail: {
          point: mousePoint,
          annotation: this.annotation,
          handle
        }
      })
    );
  }

  private dragBody(original: Text, delta: Point) {
    const center = getBoxCenter(original);
    return {
      type: original.type,
      id: original.id,
      properties: original.properties,
      geometry: {
        type: original.geometry.type,
        coordinates: [center.x + delta.x, center.y + delta.y] as [
          number,
          number
        ]
      }
    };
  }

  private dragCorner(original: Text, delta: Point, cornerIndex: number) {
    const isTop = cornerIndex === 0 || cornerIndex === 1;
    const isLeft = cornerIndex === 0 || cornerIndex === 3;
    const isRight = cornerIndex === 1 || cornerIndex === 2;
    const isBottom = cornerIndex === 2 || cornerIndex === 3;

    const { width, height } = getBoxSize(original);

    const state = this.store.getState();
    let { revSin: sin, revCos: cos } = state;

    // box is rotated with the view
    if (isBox(original)) {
      sin = 0;
      cos = 1;
    }

    const localDeltaX = delta.x * cos - delta.y * sin;
    const localDeltaY = delta.x * sin + delta.y * cos;

    let desiredDeltaWidth = 0;
    let desiredDeltaHeight = 0;

    if (isLeft) desiredDeltaWidth = -localDeltaX;
    else if (isRight) desiredDeltaWidth = localDeltaX;

    if (isTop) desiredDeltaHeight = -localDeltaY;
    else if (isBottom) desiredDeltaHeight = localDeltaY;

    const newWidth = Math.max(0, width + desiredDeltaWidth);
    const newHeight = Math.max(0, height + desiredDeltaHeight);

    const center = getBoxCenter(original);

    // update the center in such a way that only the bottom left corner would move
    const newCenterX = center.x + delta.x / 2;
    const newCenterY = center.y + delta.y / 2;

    return {
      type: original.type,
      id: original.id,
      properties: {
        ...original.properties,
        width: newWidth,
        height: newHeight
      },
      geometry: {
        type: original.geometry.type,
        coordinates: [newCenterX, newCenterY]
      }
    };
  }

  private dragEdge(original: Text, delta: Point, handle: Handle) {
    const { width, height } = getBoxSize(original);
    const center = getBoxCenter(original);

    // Get rotation from store for counter-rotation
    const state = this.store.getState();
    let { revSin: sin, revCos: cos } = state;

    // box is rotated with the view
    if (isBox(original)) {
      sin = 0;
      cos = 1;
    }

    // Transform delta to box's local (screen-aligned) coordinate system
    const localDeltaX = delta.x * cos - delta.y * sin;
    const localDeltaY = delta.x * sin + delta.y * cos;

    let newWidth = width;
    let newHeight = height;
    let localCenterOffsetX = 0;
    let localCenterOffsetY = 0;

    switch (handle.edge) {
      case EdgeType.TOP:
        newHeight = Math.max(0, height - localDeltaY);
        localCenterOffsetY = localDeltaY / 2;
        break;
      case EdgeType.BOTTOM:
        newHeight = Math.max(0, height + localDeltaY);
        localCenterOffsetY = localDeltaY / 2;
        break;
      case EdgeType.LEFT:
        newWidth = Math.max(0, width - localDeltaX);
        localCenterOffsetX = localDeltaX / 2;
        break;
      case EdgeType.RIGHT:
        newWidth = Math.max(0, width + localDeltaX);
        localCenterOffsetX = localDeltaX / 2;
        break;
    }

    // Transform local center offset back to global coordinates
    const centerOffsetX = localCenterOffsetX * cos + localCenterOffsetY * sin;
    const centerOffsetY = -localCenterOffsetX * sin + localCenterOffsetY * cos;

    return {
      type: original.type,
      id: original.id,
      properties: {
        ...original.properties,
        width: newWidth,
        height: newHeight
      },
      geometry: {
        type: original.geometry.type,
        coordinates: [center.x + centerOffsetX, center.y + centerOffsetY] as [
          number,
          number
        ]
      }
    };
  }

  protected onDragStart(evt: ClientMouseEvent) {
    if (!super.onDragStart(evt)) return false;
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

    // Clear drawing flag if this was the feature being drawn
    const state = this.store.getState();
    if (state.drawingFeature === this.annotation) {
      this.store.setState({ drawingFeature: null });
    }

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
        return cursors.nsResize; // vertical resize
      case EdgeType.LEFT:
      case EdgeType.RIGHT:
        return cursors.ewResize; // horizontal resize
      default:
        return cursors.default;
    }
  }

  public stopEditing(): void {
    super.stopEditing();
    if (this.textEditor) this.textEditor.destroy();
    this.commitChange();
    this.textEditor = null;
  }

  public startDrawing(id: Id, x: number, y: number) {
    this.annotation = id;
    // Set up to drag the bottom-right corner (corner index 2)
    this.hoveredHandle = {
      type: HandleType.CORNER,
      corner: 2
    };
    this.store.setState({ hoveredHandle: 2 });
    this.dragging = true;
    const pos = this.ogma.view.graphToScreenCoordinates({ x, y });
    this.dragStartPoint = pos;
    // Disable ogma panning
    this.disablePanning();

    // Start live update
    this.onDragStart({ clientX: pos.x, clientY: pos.y } as MouseEvent);
  }
}
