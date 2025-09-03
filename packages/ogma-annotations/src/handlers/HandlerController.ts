import type { Ogma, Point } from "@linkurious/ogma";
import { store } from "../store";
import { Annotation, Id } from "../types";
import {
  Handler,
  InteractionController,
  SpatialIndex,
  SnapEngine,
  BoxHandler,
  ArrowHandler,
  TextHandler,
  CommentHandler
} from "./";

export type Tool = "select" | "box" | "arrow" | "text" | "comment";
export type Mode = "select" | "draw" | "edit";

export interface HandlerControllerOptions {
  ogma: Ogma;
  interaction: InteractionController;
  spatialIndex: SpatialIndex;
  snapEngine: SnapEngine;
}

export class HandlerController {
  private handlers = new Map<string, Handler>();
  private activeHandler?: Handler;
  private currentTool: Tool = "select";
  private currentMode: Mode = "select";
  private unsubscribe?: () => void;

  constructor(private options: HandlerControllerOptions) {
    this.initializeHandlers();
    this.setupEventListeners();
    this.subscribeToStateChanges();
  }

  private initializeHandlers() {
    const { ogma, interaction, spatialIndex, snapEngine } = this.options;

    // Create all handlers with shared dependencies
    this.handlers.set(
      "box",
      new BoxHandler(interaction, spatialIndex, snapEngine, ogma)
    );

    this.handlers.set(
      "arrow",
      new ArrowHandler(interaction, spatialIndex, snapEngine, ogma)
    );

    this.handlers.set(
      "text",
      new TextHandler(interaction, spatialIndex, snapEngine, ogma)
    );

    this.handlers.set(
      "comment",
      new CommentHandler(interaction, spatialIndex, snapEngine, ogma)
    );
  }

  private setupEventListeners() {
    const container = this.options.ogma.getContainer();
    if (!container) return;

    // Route mouse events to active handler
    container.addEventListener("mousedown", this.handleMouseDown);
    container.addEventListener("mousemove", this.handleMouseMove);
    container.addEventListener("mouseup", this.handleMouseUp);

    // Route keyboard events to active handler
    document.addEventListener("keydown", this.handleKeyDown);
    document.addEventListener("keyup", this.handleKeyUp);
  }

  private subscribeToStateChanges() {
    // Subscribe to store changes to watch for selected features
    this.unsubscribe = store.subscribe(
      (state) => ({
        selectedFeatures: state.selectedFeatures,
        hoveredFeature: state.hoveredFeature,
        features: state.features
      }),
      (state, prevState) => {
        this.handleStateChange(state, prevState);
      }
    );
  }

  private handleStateChange(
    state: {
      selectedFeatures: Set<Id>;
      hoveredFeature: Id | null;
      features: Record<Id, Annotation>;
    },
    prevState: {
      selectedFeatures: Set<Id>;
      hoveredFeature: Id | null;
      features: Record<Id, Annotation>;
    }
  ) {
    // Check if selection changed
    const selectionChanged =
      state.selectedFeatures.size !== prevState.selectedFeatures.size ||
      [...state.selectedFeatures].some(
        (id) => !prevState.selectedFeatures.has(id)
      );

    if (selectionChanged) {
      this.handleSelectionChange(state.selectedFeatures, state.features);
    }
  }

  private handleSelectionChange(
    selectedFeatures: Set<Id>,
    features: Record<Id, Annotation>
  ) {
    // If something is selected and we're in select mode, potentially switch to edit mode
    if (selectedFeatures.size === 1 && this.currentTool === "select") {
      const selectedId = [...selectedFeatures][0];
      const feature = features[selectedId];

      if (feature && this.shouldAutoEdit(feature)) {
        this.startEditingFeature(selectedId, feature);
      }
    } else if (selectedFeatures.size === 0 && this.currentMode === "edit") {
      // If nothing is selected and we were editing, go back to select mode
      this.setTool("select");
    }
  }

  private shouldAutoEdit(feature: Annotation): boolean {
    // Auto-edit text features when selected (for immediate text editing)
    return feature.properties.type === "text";
  }

  private startEditingFeature(featureId: Id, feature: Annotation) {
    const handlerType = feature.properties.type;
    const handler = this.handlers.get(handlerType);

    if (handler) {
      // Deactivate current handler
      this.activeHandler?.deactivate();

      // Activate the appropriate handler in edit mode
      this.activeHandler = handler;
      this.currentMode = "edit";
      handler.activate("edit");

      // Start editing at the center of the feature (or last mouse position)
      const editPoint = this.getFeatureCenter(feature);
      handler.startEdit(featureId as string, editPoint);
    }
  }

  private getFeatureCenter(feature: Annotation): Point {
    // TODO: Implement proper center calculation based on feature geometry
    // For now, return origin - this should be calculated from the geometry
    if (feature.geometry.type === "Polygon") {
      const coords = (feature.geometry as any).coordinates[0];
      const x =
        coords.reduce((sum: number, coord: number[]) => sum + coord[0], 0) /
        coords.length;
      const y =
        coords.reduce((sum: number, coord: number[]) => sum + coord[1], 0) /
        coords.length;
      return { x, y };
    } else if (feature.geometry.type === "LineString") {
      const coords = (feature.geometry as any).coordinates;
      const x = (coords[0][0] + coords[1][0]) / 2;
      const y = (coords[0][1] + coords[1][1]) / 2;
      return { x, y };
    }

    return { x: 0, y: 0 };
  }

  // Event handlers
  private handleMouseDown = (e: MouseEvent) => {
    this.activeHandler?.handleMouseDown(e);
  };

  private handleMouseMove = (e: MouseEvent) => {
    this.activeHandler?.handleMouseMove(e);
  };

  private handleMouseUp = (e: MouseEvent) => {
    this.activeHandler?.handleMouseUp(e);
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    // Handle escape key to cancel current operation
    if (e.key === "Escape") {
      if (this.activeHandler && this.currentMode === "edit") {
        this.activeHandler.cancelEdit();
        this.setTool("select");
      } else if (this.activeHandler && this.currentMode === "draw") {
        // TODO: Cancel drawing operation
        this.setTool("select");
      }
      return;
    }

    // Route to active handler
    this.activeHandler?.handleKeyDown?.(e);
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.activeHandler?.handleKeyUp?.(e);
  };

  // Public API
  public setTool(tool: Tool) {
    if (tool === this.currentTool) return;

    // Deactivate previous handler
    this.activeHandler?.deactivate();

    if (tool === "select") {
      this.activeHandler = undefined;
      this.currentMode = "select";
      this.options.interaction.setMode("select");
    } else {
      this.activeHandler = this.handlers.get(tool);
      this.currentMode = "draw";
      this.activeHandler?.activate("draw");
    }

    this.currentTool = tool;
  }

  public getCurrentTool(): Tool {
    return this.currentTool;
  }

  public getCurrentMode(): Mode {
    return this.currentMode;
  }

  public getActiveHandler(): Handler | undefined {
    return this.activeHandler;
  }

  public editFeature(featureId: string) {
    const feature = store.getState().features[featureId];
    if (!feature) return;

    this.startEditingFeature(featureId, feature);
  }

  public cancelCurrentOperation() {
    if (this.activeHandler) {
      if (this.currentMode === "edit") {
        this.activeHandler.cancelEdit();
      }
      this.setTool("select");
    }
  }

  public destroy() {
    // Unsubscribe from state changes
    this.unsubscribe?.();

    // Deactivate current handler
    this.activeHandler?.deactivate();

    // Remove event listeners
    const container = this.options.ogma.getContainer();
    if (container) {
      container.removeEventListener("mousedown", this.handleMouseDown);
      container.removeEventListener("mousemove", this.handleMouseMove);
      container.removeEventListener("mouseup", this.handleMouseUp);
    }

    document.removeEventListener("keydown", this.handleKeyDown);
    document.removeEventListener("keyup", this.handleKeyUp);
  }
}
