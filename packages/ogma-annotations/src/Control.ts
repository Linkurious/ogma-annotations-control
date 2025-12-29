import type { Ogma } from "@linkurious/ogma";
import { MouseButtonEvent } from "@linkurious/ogma";
import EventEmitter from "eventemitter3";
import { Position } from "geojson";
import {
  COMMENT_MODE_COLLAPSED,
  COMMENT_MODE_EXPANDED,
  DEFAULT_SEND_ICON,
  EVT_ADD,
  EVT_CANCEL_DRAWING,
  EVT_COMPLETE_DRAWING,
  EVT_HISTORY,
  EVT_REMOVE,
  EVT_SELECT,
  EVT_UNSELECT,
  EVT_UPDATE,
  EVT_LINK,
  SIDE_END,
  TARGET_TYPES
} from "./constants";
import { AnnotationEditor } from "./handlers";
import { ArrowHandler } from "./handlers/arrow";
import { CommentDrawingHandler } from "./handlers/commentDrawing";
import { Links } from "./handlers/links";
import { PolygonHandler } from "./handlers/polygon";
import { TextHandler } from "./handlers/text";
import { InteractionController } from "./interaction";
import { Index } from "./interaction/spatialIndex";
import { Handles } from "./renderer/handles";
import { Shapes } from "./renderer/shapes";
import { createStore } from "./store";
import {
  Annotation,
  AnnotationCollection,
  Arrow,
  ArrowProperties,
  Box,
  Comment,
  CommentProps,
  ControllerOptions,
  FeatureEvents,
  Id,
  Polygon,
  Text,
  createArrow,
  createBox,
  createComment,
  createPolygon,
  createText,
  isArrow,
  isBox,
  isText,
  isAnnotationCollection,
  isComment,
  DeepPartial,
  Side
} from "./types";
import { findPlace } from "./utils/place-finder";
import { migrateBoxOrTextIfNeeded } from "./utils/utils";

const defaultOptions: ControllerOptions = {
  detectMargin: 2,
  magnetHandleRadius: 5,
  magnetRadius: 10,
  textPlaceholder: "Type here",
  showSendButton: true,
  sendButtonIcon: DEFAULT_SEND_ICON,
  minArrowHeight: 20,
  maxArrowHeight: 30
};

interface RendererMap {
  shapes: Shapes;
  handles: Handles;
}

/**
 * Main controller class for managing annotations.
 * It manages rendering and editing of annotations.
 */
export class Control extends EventEmitter<FeatureEvents> {
  private ogma: Ogma;
  private store: ReturnType<typeof createStore>;

  private renderers = {} as RendererMap;
  private interactions: InteractionController;
  private editor: AnnotationEditor;
  // TODO: maybe links should be part of the store?
  private links: Links;
  private index: Index;

  // Track pending drawing listener to clean up on cancel
  private pendingDrawingListener:
    | (<T extends MouseButtonEvent<unknown, unknown>>(evt: T) => void)
    | null = null;

  constructor(ogma: Ogma, options: Partial<ControllerOptions> = {}) {
    super();
    this.ogma = ogma;

    // Create store with merged options
    const mergedOptions = { ...defaultOptions, ...options };
    this.store = createStore(mergedOptions);
    this.index = new Index(this.store);

    this.links = new Links(this.ogma, this.store, (arrow, link) => {
      this.emit(EVT_LINK, { arrow, link });
    });
    this.interactions = new InteractionController(
      this.ogma,
      this.store,
      this.index
    );
    this.editor = new AnnotationEditor(
      this.ogma,
      this.store,
      this.index,
      this.links,
      this.interactions
    );

    this.initializeRenderers();
    this.setupEvents();
  }

  private initializeRenderers() {
    this.renderers.shapes = new Shapes(this.ogma, this.store);
    this.renderers.handles = new Handles(this.ogma, this.store);
  }

  private setupEvents() {
    this.ogma.events
      .on("rotate", this.onRotate)
      .on("zoom", this.onZoom)
      .on("layoutEnd", this.onLayout);
    this.store.temporal.subscribe((state) => {
      this.emit(EVT_HISTORY, {
        canUndo: state.pastStates.length > 0,
        canRedo: state.futureStates.length > 0
      });
    });
    this.store.subscribe(
      (state) => state.selectedFeatures,
      (selected, prev) => {
        const newlySelected = Array.from(selected).filter(
          (id) => !prev?.has(id)
        );
        if (newlySelected.length > 0)
          this.emit(EVT_SELECT, { ids: newlySelected });

        // we need to fire unselect events for features that were unselected
        if (prev) {
          const unselected = Array.from(prev).filter((id) => !selected.has(id));
          if (unselected.length > 0)
            this.emit(EVT_UNSELECT, { ids: unselected });
        }
      }
    );

    this.store.subscribe(
      (state) => state.drawingFeature,
      (curr, prev) => {
        if (curr === null && prev !== null) {
          this.emit(EVT_COMPLETE_DRAWING, { id: prev });
        }
      }
    );

    // when features are added or removed, emit an event
    this.store.subscribe(
      (state) => state.features,
      (curr, prev) => {
        if (prev) {
          // Check for added features
          for (const id of Object.keys(curr)) {
            if (!prev[id]) {
              this.emit(EVT_ADD, { id });
            } else if (prev[id] !== curr[id]) {
              // Feature was updated (reference changed)
              this.emit(EVT_UPDATE, curr[id]);
            }
          }
          // Check for removed features
          for (const id of Object.keys(prev)) {
            if (!curr[id]) this.emit(EVT_REMOVE, { id });
          }
        }
      }
    );
  }

  private onRotate = () =>
    this.store.getState().setRotation(this.ogma.view.getAngle());

  private onZoom = () => {
    const zoom = this.ogma.view.getZoom();
    this.store.getState().setZoom(zoom);

    // Auto-collapse/expand comments based on zoom threshold
    this.updateCommentModesForZoom(zoom);
  };

  private onLayout = () => {
    // Update positions of all annotations after layout
    this.links.update();
  };

  /**
   * Update comment modes based on current zoom level
   * Uses live updates to avoid creating undo/redo history entries
   * @param zoom Current zoom level
   */
  private updateCommentModesForZoom(zoom: number) {
    const state = this.store.getState();
    const features = state.features;

    Object.values(features).forEach((feature) => {
      if (isComment(feature)) {
        const comment = feature as Comment;

        // Get threshold - uses explicit value if set, otherwise computes from dimensions
        const threshold = this.getCommentZoomThreshold(comment);

        // Determine target mode based on zoom
        const targetMode =
          zoom < threshold ? COMMENT_MODE_COLLAPSED : COMMENT_MODE_EXPANDED;

        // Only update if mode needs to change
        if (comment.properties.mode !== targetMode) {
          // Use live updates to avoid history
          state.applyLiveUpdate(comment.id, {
            properties: {
              ...comment.properties,
              mode: targetMode
            }
          } as Partial<Comment>);
        }
      }
    });
  }

  /**
   * Get the effective zoom threshold for a comment
   * Uses explicit threshold if set, otherwise calculates from dimensions
   * @param comment Comment to get threshold for
   * @returns Zoom threshold
   */
  private getCommentZoomThreshold(comment: Comment): number {
    const style = { ...comment.properties.style };
    if (style.collapseZoomThreshold !== undefined) {
      return style.collapseZoomThreshold;
    }
    // Calculate based on dimensions: collapse when screen-space width < 80px
    const minReadableWidth = 80;
    const threshold = minReadableWidth / comment.properties.width;
    // Clamp between reasonable bounds
    return Math.max(0.1, Math.min(1.0, threshold));
  }

  /**
   * Set the options for the controller
   * @param options new Options
   * @returns the updated options
   */
  public setOptions(options: Partial<ControllerOptions> = {}) {
    this.store.getState().setOptions(options);
    return this.store.getState().options;
  }

  /**
   * Add an annotation to the controller
   * @param annotation The annotation to add
   */
  public add(annotation: Annotation | AnnotationCollection): this {
    if (isAnnotationCollection(annotation)) {
      for (const feature of annotation.features) this.add(feature);
    } else {
      // Migrate old Polygon format to new Point format for Box/Text
      const migrated = migrateBoxOrTextIfNeeded(annotation);
      this.store.getState().addFeature(migrated);
    }
    return this;
  }
  /**
   * Remove an annotation or an array of annotations from the controller
   * @param annotation The annotation(s) to remove
   */
  public remove(annotation: Annotation | AnnotationCollection): this {
    if (isAnnotationCollection(annotation)) {
      for (const feature of annotation.features) this.remove(feature);
    } else this.store.getState().removeFeature(annotation.id);
    return this;
  }
  /**
   * Undo the last change
   * @returns true if undo was successful, false if no changes to undo
   */
  public undo(): boolean {
    if (!this.canUndo()) return false;
    this.store.temporal.getState().undo();
    this.links.refresh();
    return true;
  }

  /**
   * Redo the last undone change
   * @returns true if redo was successful, false if no changes to redo
   */
  public redo(): boolean {
    if (!this.canRedo()) return false;
    this.store.temporal.getState().redo();
    this.links.refresh();
    return true;
  }

  /**
   * Check if there are changes to undo
   * @returns true if undo is possible
   */
  public canUndo(): boolean {
    return this.store.temporal.getState().pastStates.length > 0;
  }

  /**
   * Check if there are changes to redo
   * @returns true if redo is possible
   */
  public canRedo(): boolean {
    return this.store.temporal.getState().futureStates.length > 0;
  }

  /**
   * Clear the undo/redo history
   */
  public clearHistory() {
    this.store.temporal.getState().clear();
  }

  /**
   * Get all annotations in the controller
   * @returns A FeatureCollection containing all annotations
   */
  public getAnnotations(): AnnotationCollection {
    const features = this.store.getState().features;
    return {
      type: "FeatureCollection",
      features: Object.values(features)
    };
  }

  /**
   * Select one or more annotations by id
   * @param annotations The id(s) of the annotation(s) to select
   * @returns this for chaining
   */
  public select(annotations: Id | Id[]): this {
    const ids = Array.isArray(annotations) ? annotations : [annotations];
    this.store.getState().setSelectedFeatures(ids);
    return this;
  }

  /**
   * Unselect one or more annotations, or all if no ids provided
   * @param annotations The id(s) of the annotation(s) to unselect, or undefined to unselect all
   * @returns this for chaining
   */
  public unselect(annotations?: Id | Id[]): this {
    const ids = Array.isArray(annotations) ? annotations : [annotations];
    if (annotations === undefined)
      this.store.getState().setSelectedFeatures([]);
    else {
      const filter = new Set(ids);
      const toSelect = Array.from(
        this.store.getState().selectedFeatures
      ).filter((id) => !filter.has(id));
      this.store.getState().setSelectedFeatures(toSelect);
    }
    return this;
  }

  /**
   * Cancel the current drawing operation
   * @returns this for chaining
   */
  public cancelDrawing() {
    // Remove any pending drawing listener
    if (this.pendingDrawingListener) {
      this.ogma.events.off(this.pendingDrawingListener);
      this.pendingDrawingListener = null;
    }

    this.editor.getActiveHandler()?.cancelDrawing();
    this.emit(EVT_CANCEL_DRAWING);
    return this;
  }

  /**
   * Helper method to enable drawing mode with proper cleanup
   * @private
   */
  private enableDrawingMode(
    drawCallback: (x: number, y: number) => void
  ): this {
    this.unselect().cancelDrawing();

    const handler = (evt: MouseButtonEvent<unknown, unknown>) => {
      // Remove the listener and clear reference
      this.ogma.events.off(handler);
      this.pendingDrawingListener = null;

      const { x, y } = this.ogma.view.screenToGraphCoordinates(evt);
      drawCallback(x, y);
    };

    this.pendingDrawingListener = handler;
    this.ogma.events.once("mousedown", handler);
    return this;
  }

  /**
   * Enable arrow drawing mode - the recommended way to add arrows.
   *
   * Call this method when the user clicks an "Add Arrow" button. The control will:
   * 1. Wait for the next mousedown event
   * 2. Create an arrow at that position with the specified style
   * 3. Start the interactive drawing process
   * 4. Clean up automatically when done
   *
   * **This is the recommended API for 99% of use cases.** Only use `startArrow()`
   * if you need to implement custom mouse handling or positioning logic.
   *
   * @example
   * ```ts
   * addArrowButton.addEventListener('click', () => {
   *   control.enableArrowDrawing({ strokeColor: '#3A03CF', strokeWidth: 2 });
   * });
   * ```
   *
   * @param style Arrow style options
   * @returns this for chaining
   * @see startArrow for low-level programmatic control
   */
  public enableArrowDrawing(
    style?: Partial<Arrow["properties"]["style"]>
  ): this {
    return this.enableDrawingMode((x, y) => {
      const arrow = createArrow(x, y, x, y, style);
      this.startArrow(x, y, arrow);
    });
  }

  /**
   * Enable text drawing mode - the recommended way to add text annotations.
   *
   * Call this method when the user clicks an "Add Text" button. The control will:
   * 1. Wait for the next mousedown event
   * 2. Create a text box at that position with the specified style
   * 3. Start the interactive drawing/editing process
   * 4. Clean up automatically when done
   *
   * **This is the recommended API for 99% of use cases.** Only use `startText()`
   * if you need to implement custom mouse handling or positioning logic.
   *
   * @example
   * ```ts
   * addTextButton.addEventListener('click', () => {
   *   control.enableTextDrawing({ color: '#3A03CF', fontSize: 24 });
   * });
   * ```
   *
   * @param style Text style options
   * @returns this for chaining
   * @see startText for low-level programmatic control
   */
  public enableTextDrawing(style?: Partial<Text["properties"]["style"]>): this {
    return this.enableDrawingMode((x, y) => {
      const text = createText(x, y, 0, 0, undefined, style);
      this.startText(x, y, text);
    });
  }

  /**
   * Enable box drawing mode - the recommended way to add boxes.
   *
   * Call this method when the user clicks an "Add Box" button. The control will:
   * 1. Wait for the next mousedown event
   * 2. Create a box at that position with the specified style
   * 3. Start the interactive drawing process (drag to size)
   * 4. Clean up automatically when done
   *
   * **This is the recommended API for 99% of use cases.** Only use `startBox()`
   * if you need to implement custom mouse handling or positioning logic.
   *
   * @example
   * ```ts
   * addBoxButton.addEventListener('click', () => {
   *   control.enableBoxDrawing({ background: '#EDE6FF', borderRadius: 8 });
   * });
   * ```
   *
   * @param style Box style options
   * @returns this for chaining
   * @see startBox for low-level programmatic control
   */
  public enableBoxDrawing(style?: Partial<Box["properties"]["style"]>): this {
    return this.enableDrawingMode((x, y) => {
      const box = createBox(x, y, 0, 0, style);
      this.startBox(x, y, box);
    });
  }

  /**
   * Enable polygon drawing mode - the recommended way to add polygons.
   *
   * Call this method when the user clicks an "Add Polygon" button. The control will:
   * 1. Wait for the next mousedown event
   * 2. Create a polygon starting at that position with the specified style
   * 3. Start the interactive drawing process (click points to draw shape)
   * 4. Clean up automatically when done
   *
   * **This is the recommended API for 99% of use cases.** Only use `startPolygon()`
   * if you need to implement custom mouse handling or positioning logic.
   *
   * @example
   * ```ts
   * addPolygonButton.addEventListener('click', () => {
   *   control.enablePolygonDrawing({ strokeColor: '#3A03CF', background: 'rgba(58, 3, 207, 0.15)' });
   * });
   * ```
   *
   * @param style Polygon style options
   * @returns this for chaining
   * @see startPolygon for low-level programmatic control
   */
  public enablePolygonDrawing(
    style?: Partial<Polygon["properties"]["style"]>
  ): this {
    return this.enableDrawingMode((x, y) => {
      const polygon = createPolygon([[[x, y]]], { style });
      this.startPolygon(x, y, polygon);
    });
  }

  /**
   * Enable comment drawing mode - the recommended way to add comments.
   *
   * Call this method when the user clicks an "Add Comment" button. The control will:
   * 1. Wait for the next mousedown event
   * 2. Create a comment with an arrow pointing to that position
   * 3. Smart positioning: automatically finds the best placement for the comment box
   * 4. Start the interactive editing process
   * 5. Clean up automatically when done
   *
   * **This is the recommended API for 99% of use cases.** Only use `startComment()`
   * if you need to implement custom mouse handling or positioning logic.
   *
   * @example
   * ```ts
   * addCommentButton.addEventListener('click', () => {
   *   control.enableCommentDrawing({
   *     commentStyle: { color: '#3A03CF', background: '#EDE6FF' },
   *     arrowStyle: { strokeColor: '#3A03CF', head: 'halo-dot' }
   *   });
   * });
   * ```
   *
   * @param options Drawing options including offsets and styles
   * @param options.offsetX Manual X offset for comment placement (overrides smart positioning)
   * @param options.offsetY Manual Y offset for comment placement (overrides smart positioning)
   * @param options.commentStyle Style options for the comment box
   * @param options.arrowStyle Style options for the arrow
   * @returns this for chaining
   * @see startComment for low-level programmatic control
   */
  public enableCommentDrawing(
    options: {
      offsetX?: number;
      offsetY?: number;
      commentStyle?: Partial<CommentProps>;
      arrowStyle?: Partial<ArrowProperties>;
    } = {}
  ): this {
    return this.enableDrawingMode((x, y) => {
      let offsetX = options.offsetX;
      let offsetY = options.offsetY;

      if (offsetX === undefined && offsetY === undefined) {
        const bestPoint = findPlace(x, y, this.index, this.ogma);
        offsetX = bestPoint.x;
        offsetY = bestPoint.y;
      }
      const comment = createComment(x, y, "", options?.commentStyle);
      this.startComment(x, y, comment, { ...options, offsetX, offsetY });
    });
  }

  /**
   * **Advanced API:** Programmatically start drawing a comment at specific coordinates.
   *
   * This is a low-level method that gives you full control over the drawing process.
   * You must handle mouse events and create the comment object yourself.
   *
   * **For most use cases, use `enableCommentDrawing()` instead** - it handles all
   * mouse events and annotation creation automatically.
   *
   * Use this method only when you need:
   * - Custom mouse event handling (e.g., custom cursors, right-click menus)
   * - Programmatic placement without user interaction
   * - Integration with custom UI frameworks
   *
   * @example
   * ```ts
   * // Custom cursor example
   * ogma.setOptions({ cursor: { default: 'crosshair' } });
   * ogma.events.once('mousedown', (evt) => {
   *   const { x, y } = ogma.view.screenToGraphCoordinates(evt);
   *   const comment = createComment(x, y, 'My comment', { color: '#3A03CF' });
   *   control.startComment(x, y, comment);
   * });
   * ```
   *
   * @param x X coordinate to start drawing
   * @param y Y coordinate to start drawing
   * @param comment The comment annotation to add
   * @param options Drawing options including offsets and styles
   * @returns this for chaining
   * @see enableCommentDrawing for the recommended high-level API
   */
  public startComment(
    x: number,
    y: number,
    comment: Comment,
    options?: {
      offsetX?: number;
      offsetY?: number;
      commentStyle?: Partial<CommentProps>;
      arrowStyle?: Partial<ArrowProperties>;
    }
  ): this {
    // stop editing any current feature
    if (this.editor.getActiveHandler())
      this.editor.getActiveHandler()!.stopEditing();
    this.cancelDrawing();

    // Mark this feature as being drawn
    this.store.setState({ drawingFeature: comment.id });

    this.interactions.suppressClicksTemporarily(200);
    // Create and use the comment drawing handler
    const drawingHandler = new CommentDrawingHandler(
      this.ogma,
      this.store,
      this.links,
      this.editor.getSnapping(),
      this.editor.getArrowHandler(),
      comment,
      options
    );
    const onCommentCreated = (evt: { id: Id }) => {
      if (evt.id === comment.id) {
        this.select(evt.id);
        this.off(EVT_ADD, onCommentCreated);
        (this.editor.getActiveHandler() as TextHandler)?.startEditingText();
      }
    };
    this.on(EVT_ADD, onCommentCreated);

    drawingHandler.startDrawing(comment.id, x, y);
    return this;
  }

  /**
   * **Advanced API:** Programmatically start drawing a box at specific coordinates.
   *
   * This is a low-level method that gives you full control over the drawing process.
   * You must handle mouse events and optionally create the box object yourself.
   *
   * **For most use cases, use `enableBoxDrawing()` instead** - it handles all
   * mouse events and annotation creation automatically.
   *
   * Use this method only when you need:
   * - Custom mouse event handling (e.g., custom cursors, right-click menus)
   * - Programmatic placement without user interaction
   * - Integration with custom UI frameworks
   *
   * @example
   * ```ts
   * // Custom cursor example
   * ogma.setOptions({ cursor: { default: 'crosshair' } });
   * ogma.events.once('mousedown', (evt) => {
   *   const { x, y } = ogma.view.screenToGraphCoordinates(evt);
   *   const box = createBox(x, y, 100, 50, { background: '#EDE6FF' });
   *   control.startBox(x, y, box);
   * });
   * ```
   *
   * @param x X coordinate for the box origin
   * @param y Y coordinate for the box origin
   * @param box The box annotation to add (optional, will be created if not provided)
   * @returns this for chaining
   * @see enableBoxDrawing for the recommended high-level API
   */
  public startBox(x: number, y: number, box: Box = createBox(x, y)) {
    // Mark this feature as being drawn
    this.store.setState({ drawingFeature: box.id });

    // Add the box annotation
    this.add(box);
    this.interactions.suppressClicksTemporarily(200);
    this.select(box.id);

    // // Get the text handler (box uses the same handler as text)
    const handler = this.editor.getActiveHandler()!;
    return (handler as TextHandler).startDrawing(box.id, x, y);
  }

  /**
   * **Advanced API:** Programmatically start drawing an arrow at specific coordinates.
   *
   * This is a low-level method that gives you full control over the drawing process.
   * You must handle mouse events and optionally create the arrow object yourself.
   *
   * **For most use cases, use `enableArrowDrawing()` instead** - it handles all
   * mouse events and annotation creation automatically.
   *
   * Use this method only when you need:
   * - Custom mouse event handling (e.g., custom cursors, right-click menus)
   * - Programmatic placement without user interaction
   * - Integration with custom UI frameworks
   *
   * @example
   * ```ts
   * // Custom cursor example
   * ogma.setOptions({ cursor: { default: 'crosshair' } });
   * ogma.events.once('mousedown', (evt) => {
   *   const { x, y } = ogma.view.screenToGraphCoordinates(evt);
   *   const arrow = createArrow(x, y, x, y, { strokeColor: '#3A03CF' });
   *   control.startArrow(x, y, arrow);
   * });
   * ```
   *
   * @param x X coordinate for the arrow start
   * @param y Y coordinate for the arrow start
   * @param arrow The arrow annotation to add (optional, will be created if not provided)
   * @returns this for chaining
   * @see enableArrowDrawing for the recommended high-level API
   */
  public startArrow(x: number, y: number, arrow: Arrow = createArrow(x, y)) {
    // stop editing any current feature
    if (this.editor.getActiveHandler())
      this.editor.getActiveHandler()!.stopEditing();
    this.cancelDrawing();
    // Mark this feature as being drawn
    this.store.setState({ drawingFeature: arrow.id });

    // Add the arrow annotation
    this.add(arrow);
    this.interactions.suppressClicksTemporarily(200);
    this.select(arrow.id);

    // Get the arrow handler
    const handler = this.editor.getActiveHandler()!;
    return (handler as ArrowHandler).startDrawing(arrow.id, x, y);
  }

  /**
   * **Advanced API:** Programmatically start drawing a text annotation at specific coordinates.
   *
   * This is a low-level method that gives you full control over the drawing process.
   * You must handle mouse events and optionally create the text object yourself.
   *
   * **For most use cases, use `enableTextDrawing()` instead** - it handles all
   * mouse events and annotation creation automatically.
   *
   * Use this method only when you need:
   * - Custom mouse event handling (e.g., custom cursors, right-click menus)
   * - Programmatic placement without user interaction
   * - Integration with custom UI frameworks
   *
   * @example
   * ```ts
   * // Custom cursor example
   * ogma.setOptions({ cursor: { default: 'crosshair' } });
   * ogma.events.once('mousedown', (evt) => {
   *   const { x, y } = ogma.view.screenToGraphCoordinates(evt);
   *   const text = createText(x, y, 0, 0, 'Hello', { color: '#3A03CF' });
   *   control.startText(x, y, text);
   * });
   * ```
   *
   * @param x X coordinate for the text
   * @param y Y coordinate for the text
   * @param text The text annotation to add (optional, will be created if not provided)
   * @returns this for chaining
   * @see enableTextDrawing for the recommended high-level API
   */
  public startText(x: number, y: number, text: Text = createText(x, y)) {
    // Mark this feature as being drawn
    this.store.setState({ drawingFeature: text.id });

    // Add the text annotation
    this.add(text);
    this.interactions.suppressClicksTemporarily(200);
    this.select(text.id);

    // Get the text handler
    const handler = this.editor.getActiveHandler()!;
    return (handler as TextHandler).startDrawing(text.id, x, y);
  }

  /**
   * **Advanced API:** Programmatically start drawing a polygon at specific coordinates.
   *
   * This is a low-level method that gives you full control over the drawing process.
   * You must handle mouse events and create the polygon object yourself.
   *
   * **For most use cases, use `enablePolygonDrawing()` instead** - it handles all
   * mouse events and annotation creation automatically.
   *
   * Use this method only when you need:
   * - Custom mouse event handling (e.g., custom cursors, right-click menus)
   * - Programmatic placement without user interaction
   * - Integration with custom UI frameworks
   *
   * @example
   * ```ts
   * // Custom cursor example
   * ogma.setOptions({ cursor: { default: 'crosshair' } });
   * ogma.events.once('mousedown', (evt) => {
   *   const { x, y } = ogma.view.screenToGraphCoordinates(evt);
   *   const polygon = createPolygon([[[x, y]]], { strokeColor: '#3A03CF' });
   *   control.startPolygon(x, y, polygon);
   * });
   * ```
   *
   * @param x X coordinate to start drawing
   * @param y Y coordinate to start drawing
   * @param polygon The polygon annotation to add
   * @returns this for chaining
   * @see enablePolygonDrawing for the recommended high-level API
   */
  public startPolygon(x: number, y: number, polygon: Polygon): this {
    // Mark this feature as being drawn
    this.store.setState({ drawingFeature: polygon.id });

    // Add the polygon annotation
    this.add(polygon);
    this.interactions.suppressClicksTemporarily(200);
    this.select(polygon.id);

    // Get the polygon handler
    const handler = this.editor.getActiveHandler()!;
    (handler as PolygonHandler).startDrawing(polygon.id, x, y);
    return this;
  }

  /**
   * Get the currently selected annotations as a collection
   * @returns A FeatureCollection of selected annotations
   */
  public getSelectedAnnotations(): AnnotationCollection {
    const state = this.store.getState();
    return {
      type: "FeatureCollection",
      features: Array.from(state.selectedFeatures).map(
        (id) => state.features[id]
      )
    };
  }

  /**
   * Get the first selected annotation (for backwards compatibility)
   * @returns The currently selected annotation, or null if none selected
   */
  public getSelected(): Annotation | null {
    const state = this.store.getState();
    const firstId = Array.from(state.selectedFeatures)[0];
    return firstId ? state.features[firstId] : null;
  }

  /**
   * Get a specific annotation by id
   * @param id The id of the annotation to retrieve
   * @returns The annotation with the given id, or undefined if not found
   */
  public getAnnotation<T = Annotation>(id: Id): T | undefined {
    return this.store.getState().getFeature(id) as T | undefined;
  }

  /**
   * Scale an annotation by a given factor around an origin point
   * @param id The id of the annotation to scale
   * @param scale The scale factor
   * @param ox Origin x coordinate
   * @param oy Origin y coordinate
   * @returns this for chaining
   */
  public setScale(id: Id, scale: number, ox: number, oy: number): this {
    const feature = this.store.getState().getFeature(id);
    if (!feature) return this;

    const state = this.store.getState();

    if (isArrow(feature)) {
      // Scale arrow coordinates around origin
      const coords = feature.geometry.coordinates.map(([x, y]) => {
        const dx = x - ox;
        const dy = y - oy;
        return [ox + dx * scale, oy + dy * scale] as Position;
      });

      state.updateFeature(id, {
        geometry: {
          ...feature.geometry,
          coordinates: coords
        }
      } as Partial<Annotation>);
    } else if (isText(feature) || isBox(feature)) {
      // Scale text/box dimensions and position around origin
      const [cx, cy] = feature.geometry.coordinates;
      const dx = cx - ox;
      const dy = cy - oy;
      const newCx = ox + dx * scale;
      const newCy = oy + dy * scale;

      const newWidth = (feature.properties as Box["properties"]).width * scale;
      const newHeight =
        (feature.properties as Box["properties"]).height * scale;

      state.updateFeature(id, {
        properties: {
          ...feature.properties,
          width: newWidth,
          height: newHeight
        },
        geometry: {
          ...feature.geometry,
          coordinates: [newCx, newCy]
        }
      } as Partial<Annotation>);
    }

    return this;
  }

  toggleComment(id: Id): this {
    const feature = this.store.getState().getFeature(id);
    if (!feature || !isComment(feature)) return this;
    const comment = feature as Comment;
    this.store.getState().updateFeature(id, {
      properties: {
        ...comment.properties,
        mode: comment.properties.mode === "collapsed" ? "expanded" : "collapsed"
      }
    } as Partial<Comment>);
    return this;
  }

  /**
   * Destroy the controller and its elements
   */
  public destroy() {
    this.ogma.events.off(this.onRotate).off(this.onZoom);
    this.links.destroy();
    Object.values(this.renderers).forEach((r) => r.destroy());
    this.interactions.destroy();
    this.editor.destroy();
  }

  /**
   * Update the style of the annotation with the given id
   * @param id The id of the annotation to update
   * @param style The new style
   */
  public updateStyle<A extends Annotation>(
    id: Id,
    style: A["properties"]["style"]
  ): this {
    const feature = this.store.getState().getFeature(id);
    if (!feature) return this;

    this.store.getState().updateFeature(id, {
      id,
      properties: {
        ...feature.properties,
        style: {
          ...feature.properties.style,
          ...style
        }
      }
    } as A);

    return this;
  }

  /**
   * Update an annotation with partial updates
   *
   * This method allows you to update any properties of an annotation, including
   * geometry, properties, and style. Updates are merged with existing data.
   *
   * @param annotation Partial annotation object with id and properties to update
   * @returns this for chaining
   *
   * @example
   * ```ts
   * // Update arrow geometry
   * controller.update({
   *   id: arrowId,
   *   geometry: {
   *     type: 'LineString',
   *     coordinates: [[0, 0], [200, 200]]
   *   }
   * });
   *
   * // Update text content and position
   * controller.update({
   *   id: textId,
   *   geometry: {
   *     type: 'Point',
   *     coordinates: [100, 100]
   *   },
   *   properties: {
   *     content: 'Updated text'
   *   }
   * });
   *
   * // Update style only (prefer updateStyle for style-only updates)
   * controller.update({
   *   id: boxId,
   *   properties: {
   *     style: {
   *       background: '#ff0000'
   *     }
   *   }
   * });
   * ```
   */
  public update<A extends Annotation>(
    annotation: DeepPartial<A> & { id: Id }
  ): this {
    const state = this.store.getState();
    const feature = state.getFeature(annotation.id);
    if (!feature) return this;

    state.updateFeature(annotation.id, {
      ...feature,
      ...annotation,
      properties: {
        ...feature.properties,
        ...annotation.properties,
        style: {
          ...feature.properties.style,
          ...annotation.properties?.style
        }
      },
      geometry: {
        ...feature.geometry,
        ...annotation.geometry
      }
    } as Annotation);
    return this;
  }

  public linkToNode(arrowId: Id, nodeId: Id, side: Side = SIDE_END): this {
    const arrow = this.getAnnotation<Arrow>(arrowId);
    if (!arrow) throw new Error(`Arrow with id ${arrowId} not found`);
    this.links.add(arrow, side, nodeId, TARGET_TYPES.NODE, {
      x: 0,
      y: 0
    });
    return this;
  }
}
