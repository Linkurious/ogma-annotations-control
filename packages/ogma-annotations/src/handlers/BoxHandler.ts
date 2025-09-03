import type { Point } from "@linkurious/ogma";
import { nanoid as getId } from "nanoid";
import {
  Handler,
  InteractionController,
  SpatialIndex,
  SnapEngine
} from "./Handler";
import { store } from "../store";
import { Box } from "../types";
import {
  getBoxPosition,
  getBoxSize,
  setBbox,
  clientToContainerPosition
} from "../utils";

export class BoxHandler extends Handler {
  private state: "idle" | "drawing" | "editing" = "idle";
  private drawingStart?: Point;
  private editingFeature?: string;
  private tempFeatureId?: string;

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
      // Start drawing new box
      this.drawingStart = this.findSnapPoint(point) || point;
      this.state = "drawing";
      this.tempFeatureId = `temp-box-${getId()}`;

      // Create initial temp feature
      const tempBox = this.createBoxFeature(
        this.drawingStart,
        this.drawingStart
      );
      store.getState().addFeature({
        ...tempBox,
        id: this.tempFeatureId,
        properties: {
          ...tempBox.properties,
          isTemporary: true
        }
      } as Box);

      // Start live preview
      store.getState().startLiveUpdate([this.tempFeatureId]);
    }
  }

  handleMouseMove(e: MouseEvent) {
    if (!this.isActive) return;

    const point = this.clientToCanvas(e);
    const snappedPoint = this.findSnapPoint(point) || point;

    if (this.state === "drawing" && this.drawingStart && this.tempFeatureId) {
      // Update live preview
      const bounds = {
        x: Math.min(this.drawingStart.x, snappedPoint.x),
        y: Math.min(this.drawingStart.y, snappedPoint.y),
        width: Math.abs(snappedPoint.x - this.drawingStart.x),
        height: Math.abs(snappedPoint.y - this.drawingStart.y)
      };

      const updatedBox = this.createBoxFeature(
        { x: bounds.x, y: bounds.y },
        { x: bounds.x + bounds.width, y: bounds.y + bounds.height }
      );

      store.getState().applyLiveUpdate(this.tempFeatureId, {
        geometry: updatedBox.geometry,
        properties: { ...updatedBox.properties, isTemporary: true }
      });
    }
  }

  handleMouseUp(e: MouseEvent) {
    if (!this.isActive || this.state !== "drawing") return;

    const point = this.clientToCanvas(e);
    const snappedPoint = this.findSnapPoint(point) || point;

    if (this.drawingStart && this.tempFeatureId) {
      // Create actual feature
      const feature = this.createBoxFeature(this.drawingStart, snappedPoint);

      // Clean up temp feature and add real one
      store.getState().cancelLiveUpdates();
      store.getState().removeFeature(this.tempFeatureId);
      store.getState().addFeature(feature);

      // Reset state
      this.state = "idle";
      this.drawingStart = undefined;
      this.tempFeatureId = undefined;
    }
  }

  startEdit(featureId: string, point: Point) {
    this.editingFeature = featureId;
    this.state = "editing";
    // TODO: Implement editing logic similar to the original BoxesEditor
  }

  cancelEdit() {
    this.editingFeature = undefined;
    this.state = "idle";
  }

  protected clientToCanvas(e: MouseEvent): Point {
    if (!this.ogma) return { x: e.clientX, y: e.clientY };

    const containerPos = clientToContainerPosition(e, this.ogma.getContainer());
    return this.ogma.view.screenToGraphCoordinates(containerPos);
  }

  private createBoxFeature(start: Point, end: Point): Box {
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const width = Math.abs(end.x - start.x);
    const height = Math.abs(end.y - start.y);

    return {
      id: getId(),
      type: "Feature",
      properties: {
        type: "box",
        style: {
          strokeColor: "#000000",
          strokeWidth: 1,
          strokeType: "plain",
          background: "transparent",
          padding: 0,
          borderRadius: 0
        }
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [x, y],
            [x + width, y],
            [x + width, y + height],
            [x, y + height],
            [x, y]
          ]
        ]
      }
    } as Box;
  }
}
