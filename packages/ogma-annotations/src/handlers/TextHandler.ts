import Ogma, { Point } from "@linkurious/ogma";
import { Handler } from "./Handler";
import { getTransformMatrix } from "../renderer/shapes/utils";
import { Cursor, Text } from "../types";
import { getBoxSize } from "../utils";
import { dot } from "../vec";
import { Store } from "../store";

// Constants for edge detection
const AXIS_X = { x: 1, y: 0 } as const;
const AXIS_Y = { x: 0, y: 1 } as const;

enum HandleType {
  EDGE = "edge",
  CORNER = "corner"
}

enum EdgeType {
  TOP = "top",
  RIGHT = "right",
  BOTTOM = "bottom",
  LEFT = "left"
}

// Edge template definitions: [edge, axis, norm, xStart, yStart, xEnd, yEnd]
const EDGE_TEMPLATES = [
  [EdgeType.TOP, AXIS_X, AXIS_Y, 0, 0, 1, 0],
  [EdgeType.RIGHT, AXIS_Y, AXIS_X, 1, 0, 1, 1],
  [EdgeType.BOTTOM, AXIS_X, AXIS_Y, 0, 1, 1, 1],
  [EdgeType.LEFT, AXIS_Y, AXIS_X, 0, 0, 0, 1]
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

// Get corner mapping: which corners to update for each dragged corner
const cornerMapping = [
  [0], // corner 0 (top-left): update corner 0
  [0, 1], // corner 1 (top-right): update corners 0, 1
  [0, 1, 2], // corner 2 (bottom-right): update corners 0, 1, 2
  [0, 3] // corner 3 (bottom-left): update corners 0, 3
];

type Handle = {
  type: HandleType;
  edge?: EdgeType;
  corner?: number; // 0=top-left, 1=top-right, 2=bottom-right, 3=bottom-left
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  axis: Point;
  norm: Point;
};

const cursors: Cursor[] = [
  "nw-resize", // top-left (0)
  "ne-resize", // top-right (1)
  "se-resize", // bottom-right (2)
  "sw-resize" // bottom-left (3)
];
export class TextHandler extends Handler<Text, Handle> {
  constructor(ogma: Ogma, store: Store) {
    super(ogma, store);
  }

  _detectHandle(evt: MouseEvent) {
    const annotation = this.annotation!;
    const { x, y } = this.clientToCanvas(evt);
    const size = getBoxSize(annotation);
    const matrix = getTransformMatrix(annotation, { angle: 0 }, false);
    const margin = 5;

    this.hoveredHandle = undefined;
    this.store.setState({ hoveredHandle: -1 });
    this.setCursor("default");

    // Check corner handles first (higher priority)
    for (let i = 0; i < CORNER_HANDLES.length; i++) {
      const [xOffset, yOffset] = CORNER_HANDLES[i];
      const cornerX = matrix.x + size.width * xOffset;
      const cornerY = matrix.y + size.height * yOffset;

      if (
        x >= cornerX - margin &&
        x <= cornerX + margin &&
        y >= cornerY - margin &&
        y <= cornerY + margin
      ) {
        this.hoveredHandle = {
          type: HandleType.CORNER,
          corner: i,
          minX: cornerX,
          minY: cornerY,
          maxX: cornerX,
          maxY: cornerY,
          axis: AXIS_X, // Default axis for corners
          norm: AXIS_Y // Default norm for corners
        };
        this.store.setState({ hoveredHandle: i });
        this.setCursor(this.getCornerCursor(i));
        return; // Exit early if corner handle found
      }
    }

    // Check edge handles if no corner handle was found
    for (const [
      edge,
      axis,
      norm,
      xStart,
      yStart,
      xEnd,
      yEnd
    ] of EDGE_TEMPLATES) {
      const minX = matrix.x + size.width * xStart;
      const minY = matrix.y + size.height * yStart;
      const maxX = matrix.x + size.width * xEnd;
      const maxY = matrix.y + size.height * yEnd;

      const dist = dot(norm, {
        x: x - minX,
        y: y - minY
      });

      if (
        Math.abs(dist) < margin &&
        x >= minX - margin &&
        x <= maxX + margin &&
        y >= minY - margin &&
        y <= maxY + margin
      ) {
        this.hoveredHandle = {
          type: HandleType.EDGE,
          edge,
          minX,
          minY,
          maxX,
          maxY,
          axis,
          norm
        };
        this.store.setState({ hoveredHandle: points[edge][0] + 4 }); // Offset edge handles
        this.setCursor(this.getEdgeCursor(edge));
        break;
      }
    }
  }

  _drag(evt: MouseEvent) {
    if (!this.dragStartPoint || !this.hoveredHandle || !this.annotation) return;
    evt.stopPropagation();
    evt.stopImmediatePropagation();

    const mousePoint = this.clientToCanvas(evt);
    const delta = {
      x: mousePoint.x - this.dragStartPoint.x,
      y: mousePoint.y - this.dragStartPoint.y
    };
    const handle = this.hoveredHandle;
    const original = this.dragStartAnnotation!;

    // Create updated geometry based on handle type
    let updatedGeometry;

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
    }

    if (updatedGeometry) {
      // Apply live update to store instead of direct mutation
      this.store.getState().applyLiveUpdate(this.annotation.id, {
        id: this.annotation.id,
        properties: this.annotation.properties,
        geometry: updatedGeometry
      });
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

  private calculateCornerDrag(
    original: Text,
    delta: Point,
    cornerIndex: number
  ) {
    const originalCoords = [...original.geometry.coordinates[0]];
    const newCoords = originalCoords.map((coord) => [...coord]);

    cornerMapping[cornerIndex].forEach((i: number) => {
      let deltaX = 0;
      let deltaY = 0;

      // Apply delta based on which corner is being dragged and which corner we're updating
      switch (cornerIndex) {
        case 0: // top-left
          if (i === 0) {
            deltaX = delta.x;
            deltaY = delta.y;
          }
          break;
        case 1: // top-right
          if (i === 0) {
            deltaY = delta.y;
          }
          if (i === 1) {
            deltaX = delta.x;
            deltaY = delta.y;
          }
          break;
        case 2: // bottom-right
          if (i === 1) {
            deltaX = delta.x;
          }
          if (i === 2) {
            deltaX = delta.x;
            deltaY = delta.y;
          }
          break;
        case 3: // bottom-left
          if (i === 0) {
            deltaY = delta.y;
          }
          if (i === 3) {
            deltaX = delta.x;
            deltaY = delta.y;
          }
          break;
      }

      newCoords[i] = [
        originalCoords[i][0] + deltaX,
        originalCoords[i][1] + deltaY
      ];
    });

    return {
      type: original.geometry.type,
      coordinates: [newCoords]
    };
  }

  private calculateEdgeDrag(original: Text, delta: Point, handle: Handle) {
    const originalCoords = [...original.geometry.coordinates[0]];
    const newCoords = originalCoords.map((coord) => [...coord]);
    const movement = dot(handle.norm, delta);

    points[handle.edge!].forEach((i: number) => {
      newCoords[i] = [
        originalCoords[i][0] + handle.norm.x * movement,
        originalCoords[i][1] + handle.norm.y * movement
      ];
    });

    return {
      type: original.geometry.type,
      coordinates: [newCoords]
    };
  }

  protected _dragStart() {
    if (!this.annotation) return;
    // Start live update tracking for this annotation
    this.store.getState().startLiveUpdate([this.annotation.id]);
  }

  protected _dragEnd() {
    if (!this.annotation) return;
    // Commit all live updates to create a single history entry
    this.store.getState().commitLiveUpdates();
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
}
