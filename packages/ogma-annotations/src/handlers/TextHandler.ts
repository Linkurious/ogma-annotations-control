import type { Point } from "@linkurious/ogma";
import { nanoid as getId } from "nanoid";
import {
  Handler,
  InteractionController,
  SpatialIndex,
  SnapEngine
} from "./Handler";
import { store } from "../store";
import { Text } from "../types";
import { clientToContainerPosition } from "../utils";

export class TextHandler extends Handler {
  private state: "idle" | "drawing" | "editing" = "idle";
  private drawingStart?: Point;
  private editingFeature?: string;
  private tempFeatureId?: string;
  private placeholder = "Type your text here...";

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
      // Start drawing new text box
      this.drawingStart = this.findSnapPoint(point) || point;
      this.state = "drawing";
      this.tempFeatureId = `temp-text-${getId()}`;

      // Create initial temp feature with minimal size
      const tempText = this.createTextFeature(
        this.drawingStart,
        this.drawingStart,
        ""
      );
      store.getState().addFeature({
        ...tempText,
        id: this.tempFeatureId,
        properties: {
          ...tempText.properties,
          isTemporary: true,
          content: this.placeholder
        }
      } as Text);

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
        width: Math.max(Math.abs(snappedPoint.x - this.drawingStart.x), 100), // Minimum width
        height: Math.max(Math.abs(snappedPoint.y - this.drawingStart.y), 50) // Minimum height
      };

      const updatedText = this.createTextFeature(
        { x: bounds.x, y: bounds.y },
        { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
        this.placeholder
      );

      store.getState().applyLiveUpdate(this.tempFeatureId, {
        geometry: updatedText.geometry,
        properties: {
          ...updatedText.properties,
          isTemporary: true,
          content: this.placeholder
        }
      });
    }
  }

  handleMouseUp(e: MouseEvent) {
    if (!this.isActive || this.state !== "drawing") return;

    const point = this.clientToCanvas(e);
    const snappedPoint = this.findSnapPoint(point) || point;

    if (this.drawingStart && this.tempFeatureId) {
      const bounds = {
        x: Math.min(this.drawingStart.x, snappedPoint.x),
        y: Math.min(this.drawingStart.y, snappedPoint.y),
        width: Math.max(Math.abs(snappedPoint.x - this.drawingStart.x), 100),
        height: Math.max(Math.abs(snappedPoint.y - this.drawingStart.y), 50)
      };

      // Create actual text feature with empty content (user will type)
      const feature = this.createTextFeature(
        { x: bounds.x, y: bounds.y },
        { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
        ""
      );

      // Clean up temp feature and add real one
      store.getState().cancelLiveUpdates();
      store.getState().removeFeature(this.tempFeatureId);
      store.getState().addFeature(feature);

      // Reset state
      this.state = "idle";
      this.drawingStart = undefined;
      this.tempFeatureId = undefined;

      // TODO: Focus on the text input for editing
      // This would require access to the DOM overlay/editor
      this.startTextEditing(feature.id);
    }
  }

  startEdit(featureId: string, point: Point) {
    this.editingFeature = featureId;
    this.state = "editing";
    this.startTextEditing(featureId);
  }

  cancelEdit() {
    this.editingFeature = undefined;
    this.state = "idle";
    // TODO: Hide text editing UI
  }

  protected clientToCanvas(e: MouseEvent): Point {
    if (!this.ogma) return { x: e.clientX, y: e.clientY };

    const containerPos = clientToContainerPosition(e, this.ogma.getContainer());
    return this.ogma.view.screenToGraphCoordinates(containerPos);
  }

  private createTextFeature(start: Point, end: Point, content: string): Text {
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const width = Math.abs(end.x - start.x);
    const height = Math.abs(end.y - start.y);

    return {
      id: getId(),
      type: "Feature",
      properties: {
        type: "text",
        content,
        style: {
          font: "sans-serif",
          fontSize: 18,
          color: "#505050",
          background: "#f5f5f5",
          strokeWidth: 0,
          borderRadius: 8,
          padding: 16,
          strokeType: "solid"
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
    } as Text;
  }

  private startTextEditing(featureId: string) {
    // TODO: This should show a text input overlay for editing
    // In the new architecture, this would likely emit an event
    // that the AnnotationEditor can listen to and show the appropriate UI

    // For now, we'll just select the feature
    store.getState().setSelectedFeatures([featureId]);

    // In a complete implementation, this would:
    // 1. Create/show a textarea overlay positioned over the text
    // 2. Set the textarea content to the current text content
    // 3. Focus the textarea for immediate editing
    // 4. Handle text input changes and update the feature
    // 5. Handle blur/escape to finish editing
  }

  // Text-specific methods that might be called from the UI
  public updateTextContent(featureId: string, content: string) {
    store.getState().updateFeature(featureId, {
      properties: { content }
    } as Partial<Text>);
  }

  public setPlaceholder(placeholder: string) {
    this.placeholder = placeholder;
  }
}
