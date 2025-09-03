import type { Point } from "@linkurious/ogma";
import { nanoid as getId } from "nanoid";
import {
  Handler,
  InteractionController,
  SpatialIndex,
  SnapEngine
} from "./Handler";
import { store } from "../store";
import { Arrow } from "../types";
import {
  clientToContainerPosition,
  getArrowStart,
  getArrowEnd,
  getArrowEndPoints,
  setArrowStart,
  setArrowEnd
} from "../utils";
import {
  dot,
  length,
  normalize,
  subtract,
  cross,
  rotateRadians,
  divScalar
} from "../vec";

export class ArrowHandler extends Handler {
  private state: "idle" | "drawing" | "editing" = "idle";
  private drawingStart?: Point;
  private editingFeature?: string;
  private tempFeatureId?: string;
  private draggedHandle = -1;
  private startDragPoint: Point = { x: 0, y: 0 };
  private originalArrow?: Arrow;

  constructor(
    interaction: InteractionController,
    spatialIndex: SpatialIndex,
    snapEngine: SnapEngine,
    private ogma: any // TODO: Type this properly with Ogma
  ) {
    super(interaction, spatialIndex, snapEngine);
  }

  activate(mode: "draw" | "edit") {
    this.isActive = true;
    this.state = mode === "draw" ? "idle" : "editing";

    // Disable selection while this handler is active
    this.interaction.setMode(mode);
  }

  deactivate() {
    this.isActive = false;
    this.state = "idle";
    this.drawingStart = undefined;
    this.editingFeature = undefined;
    this.draggedHandle = -1;

    // Clean up any temporary features
    if (this.tempFeatureId) {
      store.getState().removeFeature(this.tempFeatureId);
      this.tempFeatureId = undefined;
    }

    // Re-enable selection
    this.interaction.setMode("select");
  }

  handleMouseDown(e: MouseEvent) {
    if (!this.isActive) return;

    const point = this.clientToCanvas(e);

    if (this.state === "idle") {
      // Start drawing new arrow
      this.drawingStart = this.findSnapPoint(point) || point;
      this.state = "drawing";
      this.tempFeatureId = `temp-arrow-${getId()}`;

      // Create initial temp feature (zero-length arrow)
      const tempArrow = this.createArrowFeature(
        this.drawingStart,
        this.drawingStart
      );
      store.getState().addFeature({
        ...tempArrow,
        id: this.tempFeatureId,
        properties: {
          ...tempArrow.properties,
          isTemporary: true
        }
      } as Arrow);

      // Start live preview
      store.getState().startLiveUpdate([this.tempFeatureId]);
    } else if (this.state === "editing" && this.editingFeature) {
      // Handle editing an existing arrow
      this.startDragPoint = point;
      this.originalArrow = store
        .getState()
        .getFeature(this.editingFeature) as Arrow;
      if (this.originalArrow) {
        store.getState().startLiveUpdate([this.editingFeature]);
      }
    }
  }

  handleMouseMove(e: MouseEvent) {
    if (!this.isActive) return;

    const point = this.clientToCanvas(e);
    const snappedPoint = this.findSnapPoint(point) || point;

    if (this.state === "drawing" && this.drawingStart && this.tempFeatureId) {
      // Update live preview of new arrow
      const updatedArrow = this.createArrowFeature(
        this.drawingStart,
        snappedPoint
      );

      store.getState().applyLiveUpdate(this.tempFeatureId, {
        geometry: updatedArrow.geometry,
        properties: { ...updatedArrow.properties, isTemporary: true }
      });
    } else if (
      this.state === "editing" &&
      this.editingFeature &&
      this.originalArrow
    ) {
      // Update existing arrow during drag
      const dx = point.x - this.startDragPoint.x;
      const dy = point.y - this.startDragPoint.y;

      const start = getArrowStart(this.originalArrow);
      const end = getArrowEnd(this.originalArrow);

      let newStart = start;
      let newEnd = end;

      // Determine what part of the arrow is being dragged
      if (this.draggedHandle === 0) {
        // Dragging the whole arrow
        newStart = { x: start.x + dx, y: start.y + dy };
        newEnd = { x: end.x + dx, y: end.y + dy };
      } else if (this.draggedHandle === 1) {
        // Dragging start point
        newStart = { x: start.x + dx, y: start.y + dy };
      } else if (this.draggedHandle === 2) {
        // Dragging end point
        newEnd = { x: end.x + dx, y: end.y + dy };
      } else {
        // Default to moving the whole arrow
        newStart = { x: start.x + dx, y: start.y + dy };
        newEnd = { x: end.x + dx, y: end.y + dy };
      }

      // Apply snapping
      const snappedStart = this.findSnapPoint(newStart) || newStart;
      const snappedEnd = this.findSnapPoint(newEnd) || newEnd;

      const updatedArrow = this.createArrowFeature(snappedStart, snappedEnd);
      store.getState().applyLiveUpdate(this.editingFeature, {
        geometry: updatedArrow.geometry
      });
    }
  }

  handleMouseUp(e: MouseEvent) {
    if (!this.isActive) return;

    if (this.state === "drawing") {
      const point = this.clientToCanvas(e);
      const snappedPoint = this.findSnapPoint(point) || point;

      if (this.drawingStart && this.tempFeatureId) {
        // Create actual feature
        const feature = this.createArrowFeature(
          this.drawingStart,
          snappedPoint
        );

        // Clean up temp feature and add real one
        store.getState().cancelLiveUpdates();
        store.getState().removeFeature(this.tempFeatureId);
        store.getState().addFeature(feature);

        // Reset state
        this.state = "idle";
        this.drawingStart = undefined;
        this.tempFeatureId = undefined;
      }
    } else if (this.state === "editing" && this.editingFeature) {
      // Commit the editing changes
      store.getState().commitLiveUpdates();
      this.draggedHandle = -1;
      this.originalArrow = undefined;
    }
  }

  startEdit(featureId: string, point: Point) {
    this.editingFeature = featureId;
    this.state = "editing";

    // Determine which handle/part should be dragged based on the click point
    const feature = store.getState().getFeature(featureId) as Arrow;
    if (feature) {
      const { start, end } = getArrowEndPoints(feature);
      const startDistance = length(subtract(point, start));
      const endDistance = length(subtract(point, end));

      // If close to start or end, drag that handle, otherwise drag the whole arrow
      if (startDistance < 10) {
        // TODO: Make this threshold configurable
        this.draggedHandle = 1;
      } else if (endDistance < 10) {
        this.draggedHandle = 2;
      } else {
        this.draggedHandle = 0; // Drag whole arrow
      }
    }
  }

  cancelEdit() {
    if (this.editingFeature) {
      store.getState().cancelLiveUpdates();
    }
    this.editingFeature = undefined;
    this.state = "idle";
    this.draggedHandle = -1;
    this.originalArrow = undefined;
  }

  protected clientToCanvas(e: MouseEvent): Point {
    if (!this.ogma) return { x: e.clientX, y: e.clientY };

    const containerPos = clientToContainerPosition(e, this.ogma.getContainer());
    return this.ogma.view.screenToGraphCoordinates(containerPos);
  }

  private createArrowFeature(start: Point, end: Point): Arrow {
    return {
      id: getId(),
      type: "Feature",
      properties: {
        type: "arrow",
        style: {
          strokeType: "solid",
          strokeColor: "#202020",
          strokeWidth: 1,
          head: "arrow",
          tail: "none"
        }
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [start.x, start.y],
          [end.x, end.y]
        ]
      }
    } as Arrow;
  }

  // Hit detection method similar to the original ArrowsEditor
  public detect(point: Point, margin = 0): Arrow | undefined {
    const features = store.getState().getAllFeatures();

    return features.find((feature) => {
      if (feature.properties.type !== "arrow") return false;

      const arrow = feature as Arrow;
      const { start, end } = getArrowEndPoints(arrow);

      // Vector from mouse pointer to start of arrow
      const p = subtract(point, start);
      const width = arrow.properties.style?.strokeWidth || 1;
      const vec = subtract(end, start);

      const lineLen = length(vec);
      const proj = dot(p, normalize(vec));

      return (
        proj > 0 &&
        proj < lineLen &&
        Math.abs(cross(p, normalize(vec))) < width / 2 + margin
      );
    }) as Arrow | undefined;
  }
}
