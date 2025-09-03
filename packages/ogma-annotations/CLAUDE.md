# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Development

- `npm run dev` - Start development server for the demo web application
- `npm start` - Alias for `npm run dev`
- `npm run build` - Build the library for production
- `npm run build:demo` - Build the demo web application
- `npm run types` - Generate TypeScript declaration files

### Testing

- `npm run test` - Run all unit tests
- `npm run test:unit` - Run unit tests only
- `npm run test:watch` - Run unit tests in watch mode
- `npm run test:e2e` - Run end-to-end tests
- `npm run test:e2e:watch` - Run end-to-end tests in watch mode

### Code Quality

- `npm run lint` - Run ESLint on source code
- `npm run lint:ci` - Run ESLint with checkstyle output for CI

### Documentation

- `npm run docs:build` - Generate API documentation with TypeDoc

## Architecture Overview

This is a TypeScript library that provides annotation capabilities for Ogma graph visualizations. The architecture follows a headless design pattern with clear separation of concerns:

**⚠️ Note: This codebase is currently undergoing a major refactoring. Some files represent the old architecture while others have been updated to the new structure.**

### New Architecture (In Progress)

**Core (`src/core/`)**:

- `AnnotationEditor.ts` - Main orchestrator that coordinates all components

**Handlers (`src/handlers/`)**:

- `Handler.ts` - Base handler interface defining feature-specific editing behaviors
- `BoxHandler.ts` - Box annotation editing logic
- `ArrowHandler.ts` - Arrow annotation editing logic
- `TextHandler.ts` - Text annotation editing logic
- `CommentHandler.ts` - Comment annotation editing logic

**Interaction Services (`src/interaction/`)**:

- `SpatialIndex.ts` - Spatial queries and collision detection, shared by all features
- `InteractionController.ts` - Selection management and interaction mode coordination
- `SnapEngine.ts` - Snapping logic for connecting annotations

### Legacy Components (Being Refactored)

**Control Class (`src/Control.ts`)**: Original main entry point that orchestrates all other components. Extends EventEmitter and provides the public API for adding, removing, and managing annotations.

**State Management (`src/store/index.ts`)**: Uses Zustand with temporal middleware for undo/redo functionality. Implements live updates pattern for smooth dragging without creating excessive history entries. Features are stored in a normalized format with separate live update tracking.

**Rendering System (`src/renderer/`)**: Split into shapes and handles renderers. Shapes render the actual annotations (arrows, text boxes) while handles render the control points for resizing and manipulation.

**Links System (`src/links.ts`)**: Manages connections between arrows and other annotations (nodes or text boxes), enabling snapping behavior.

### Feature Types

The system supports two main annotation types defined in `src/types/features/`:

- **Text** (`Text.ts`): Rectangular text boxes with positioning, sizing, and rich styling properties
- **Arrow** (`Arrow.ts`): Directional arrows that can connect to nodes or other annotations, with customizable styling and link endpoints

### Editor Components (`src/Editor/`)

Each annotation type has its own editor in the Editor folder:

- `Arrows/`: Arrow creation, manipulation, and rendering logic
- `Texts/`: Text box creation, editing, and styling
- `Box/`: Base functionality for rectangular annotations

### Key Patterns

**Live Updates**: During dragging operations, changes are applied to a separate `liveUpdates` state to avoid creating excessive undo history entries. Changes are committed as a single history entry when the operation completes.

**Spatial Queries**: Hit detection uses a two-phase approach - broad phase using R-tree spatial index, then narrow phase with precise geometric calculations.

**Event System**: Uses EventEmitter3 for communication between components, with events for drag operations, selection changes, and feature lifecycle.

**GeoJSON Compliance**: Annotations follow GeoJSON Feature/FeatureCollection format for interoperability.

### Testing Structure

- **Unit tests** (`test/unit/`): Test individual components and utilities
- **E2E tests** (`test/e2e/`): Test user interactions using Playwright
- **Test fixtures** (`test/fixtures/`): JSON data for testing annotation loading/saving

### Demo Application (`web/`)

Contains a sample implementation showing how to integrate the annotations library with Ogma, including UI controls and interaction patterns.

# to memorize

## Handlers structure:

```ts
// handlers/Handler.ts
export abstract class Handler {
  protected isActive = false;

  constructor(
    protected interactionController: InteractionController,
    protected spatialIndex: SpatialIndex,
    protected snapEngine: SnapEngine
  ) {}

  // Lifecycle
  abstract activate(mode: "draw" | "edit"): void;
  abstract deactivate(): void;

  // Mouse events
  abstract handleMouseDown(e: MouseEvent): void;
  abstract handleMouseMove(e: MouseEvent): void;
  abstract handleMouseUp(e: MouseEvent): void;

  // Keyboard events
  handleKeyDown?(e: KeyboardEvent): void;
  handleKeyUp?(e: KeyboardEvent): void;

  // Edit existing feature
  abstract startEdit(featureId: string, point: Point): void;
  abstract cancelEdit(): void;

  // Utilities all handlers can use
  protected clientToCanvas(e: MouseEvent): Point {
    // Convert client coordinates to canvas coordinates
  }

  protected findSnapPoint(point: Point): Point | null {
    return this.snapEngine.snap(point);
  }
}
```

```ts
// handlers/BoxHandler.ts
export class BoxHandler extends Handler {
  private state: "idle" | "drawing" | "editing" = "idle";
  private drawingStart?: Point;
  private editingFeature?: string;

  activate(mode: "draw" | "edit") {
    this.isActive = true;
    this.state = mode === "draw" ? "idle" : "editing";

    // Disable selection while this handler is active
    this.interactionController.setMode(mode);
  }

  deactivate() {
    this.isActive = false;
    this.state = "idle";
    this.drawingStart = undefined;
    this.editingFeature = undefined;

    // Re-enable selection
    this.interactionController.setMode("select");
  }

  handleMouseDown(e: MouseEvent) {
    if (!this.isActive) return;

    const point = this.clientToCanvas(e);

    if (this.state === "idle") {
      // Start drawing new box
      this.drawingStart = this.findSnapPoint(point) || point;
      this.state = "drawing";

      // Start live preview
      store.getState().startLiveUpdate(["temp-box"]);
    }
  }

  handleMouseMove(e: MouseEvent) {
    if (!this.isActive) return;

    const point = this.clientToCanvas(e);
    const snappedPoint = this.findSnapPoint(point) || point;

    if (this.state === "drawing" && this.drawingStart) {
      // Update live preview
      const bounds = {
        x: Math.min(this.drawingStart.x, snappedPoint.x),
        y: Math.min(this.drawingStart.y, snappedPoint.y),
        width: Math.abs(snappedPoint.x - this.drawingStart.x),
        height: Math.abs(snappedPoint.y - this.drawingStart.y)
      };

      store.getState().applyLiveUpdate("temp-box", {
        geometry: boundsToGeometry(bounds),
        properties: { type: "box", isTemporary: true }
      });
    }
  }

  handleMouseUp(e: MouseEvent) {
    if (!this.isActive || this.state !== "drawing") return;

    const point = this.clientToCanvas(e);
    const snappedPoint = this.findSnapPoint(point) || point;

    // Create actual feature
    const feature = this.createBoxFeature(this.drawingStart!, snappedPoint);
    store.getState().addFeature(feature);

    // Clean up
    store.getState().cancelLiveUpdates();
    this.state = "idle";
    this.drawingStart = undefined;
  }

  startEdit(featureId: string, point: Point) {
    this.editingFeature = featureId;
    this.state = "editing";
    // ... handle editing
  }

  cancelEdit() {
    this.editingFeature = undefined;
    this.state = "idle";
  }
}
```

```ts
// core/AnnotationEditor.ts
export class AnnotationEditor {
  private handlers = new Map<string, Handler>();
  private activeHandler?: Handler;
  private currentTool: string = "select";

  constructor(options: AnnotationEditorOptions) {
    // Create shared services
    const spatialIndex = new SpatialIndex();
    const snapEngine = new SnapEngine(spatialIndex);
    const interactionController = new InteractionController(
      spatialIndex,
      options.svgOverlay.getContainer()
    );

    // Create all handlers with shared dependencies
    this.handlers.set(
      "box",
      new BoxHandler(interactionController, spatialIndex, snapEngine)
    );

    this.handlers.set(
      "arrow",
      new ArrowHandler(interactionController, spatialIndex, snapEngine)
    );

    this.handlers.set(
      "text",
      new TextHandler(interactionController, spatialIndex, snapEngine)
    );

    // Route mouse events to active handler
    options.svgOverlay.getContainer().addEventListener("mousedown", (e) => {
      this.activeHandler?.handleMouseDown(e);
    });

    options.svgOverlay.getContainer().addEventListener("mousemove", (e) => {
      this.activeHandler?.handleMouseMove(e);
    });

    options.svgOverlay.getContainer().addEventListener("mouseup", (e) => {
      this.activeHandler?.handleMouseUp(e);
    });
  }

  setTool(tool: string) {
    // Deactivate previous
    this.activeHandler?.deactivate();

    if (tool === "select") {
      this.activeHandler = undefined;
      this.interactionController.setMode("select");
    } else {
      this.activeHandler = this.handlers.get(tool);
      this.activeHandler?.activate("draw");
    }

    this.currentTool = tool;
  }

  editFeature(featureId: string) {
    const feature = store.getState().features[featureId];
    if (!feature) return;

    // Get handler for this feature type
    const handlerType = feature.properties.type || "box";
    const handler = this.handlers.get(handlerType);

    if (handler) {
      this.activeHandler?.deactivate();
      this.activeHandler = handler;
      handler.activate("edit");
      handler.startEdit(featureId, this.lastMousePoint);
    }
  }
}
```
