import { Node, type Ogma } from "@linkurious/ogma";
import EventEmitter from "eventemitter3";
import { CommentManager } from "./api/comments";
import { Drawing } from "./api/drawing";
import { HistoryManager } from "./api/history";
import { SelectionManager } from "./api/selection";
import { UpdateManager } from "./api/update";
import {
  DEFAULT_SEND_ICON,
  EVT_ADD,
  EVT_CANCEL_DRAWING,
  EVT_CLICK,
  EVT_COMPLETE_DRAWING,
  EVT_DRAG_END,
  EVT_DRAG_START,
  EVT_HISTORY,
  EVT_REMOVE,
  EVT_SELECT,
  EVT_UNSELECT,
  EVT_UPDATE,
  EVT_LINK,
  SIDE_END,
  DEFAULT_EDIT_ICON
} from "./constants";
import { AnnotationEditor } from "./handlers";
import { Links } from "./handlers/links";

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
  DeepPartial,
  Side,
  ClickEvent
} from "./types";
import { Snapping } from "./handlers/snapping";

const defaultOptions: ControllerOptions = {
  detectMargin: 2,
  magnetHandleRadius: 5,
  magnetRadius: 10,
  textPlaceholder: "Type here",
  showSendButton: true,
  sendButtonIcon: DEFAULT_SEND_ICON,
  showEditButton: true,
  editButtonIcon: DEFAULT_EDIT_ICON,
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
  private drawing: Drawing;
  private snapping: Snapping;

  // API managers
  private selectionManager: SelectionManager;
  private historyManager: HistoryManager;
  private updateManager: UpdateManager;
  private commentManager: CommentManager;

  constructor(ogma: Ogma,
    options: Partial<ControllerOptions> = {}) {
    super();
    this.ogma = ogma;

    // Create store with merged options
    const mergedOptions = { ...defaultOptions, ...options };
    this.store = createStore(mergedOptions);
    this.index = new Index(this.store);

    this.snapping = new Snapping(this.ogma, {
      detectMargin: options.detectMargin === undefined ? 10 : options.detectMargin,
      magnetRadius: options.magnetRadius === undefined ? 10 : options.magnetRadius,
    }, this.index, this.store);
    this.links = new Links(this.ogma, this.snapping, this.store, (arrow, link) => {
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
      this.snapping,
      this.links,
      this.interactions
    );

    this.drawing = new Drawing(
      this.ogma,
      this.store,
      this.editor,
      this.interactions,
      this.links,
      this,
      this.index
    );

    // Initialize API managers
    this.selectionManager = new SelectionManager(this.store);
    this.historyManager = new HistoryManager(this.store, this.links);
    this.updateManager = new UpdateManager(this.store);
    this.commentManager = new CommentManager(this.store);

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

    // Forward drag events from editor to Control
    this.editor.addEventListener(EVT_DRAG_START, (evt) =>
      this.emit(EVT_DRAG_START, {
        id: (evt as CustomEvent).detail.id,
        position: (evt as CustomEvent).detail.position
      })
    );
    this.editor.addEventListener(EVT_DRAG_END, (evt) => this.emit(EVT_DRAG_END, {
      id: (evt as CustomEvent).detail.id,
      position: (evt as CustomEvent).detail.position
    }));

    // Forward click event from interaction controller
    this.interactions.addEventListener(EVT_CLICK, ((evt: CustomEvent<ClickEvent>) => this.emit(EVT_CLICK, {
      id: evt.detail.id, position: evt.detail.position
    })) as unknown as EventListener);

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
          if (curr[id]) continue;
          this.emit(EVT_REMOVE, { id });
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
    this.commentManager.updateCommentModesForZoom(zoom);
  };

  private onLayout = () => {
    // Update positions of all annotations after layout
    this.links.update();
  };

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
    this.updateManager.add(annotation);
    return this;
  }

  /**
   * Remove an annotation or an array of annotations from the controller
   * @param annotation The annotation(s) to remove
   */
  public remove(annotation: Annotation | AnnotationCollection): this {
    this.updateManager.remove(annotation);
    return this;
  }
  /**
   * Undo the last change
   * @returns true if undo was successful, false if no changes to undo
   */
  public undo(): boolean {
    return this.historyManager.undo();
  }

  /**
   * Redo the last undone change
   * @returns true if redo was successful, false if no changes to redo
   */
  public redo(): boolean {
    return this.historyManager.redo();
  }

  /**
   * Check if there are changes to undo
   * @returns true if undo is possible
   */
  public canUndo(): boolean {
    return this.historyManager.canUndo();
  }

  /**
   * Check if there are changes to redo
   * @returns true if redo is possible
   */
  public canRedo(): boolean {
    return this.historyManager.canRedo();
  }

  /**
   * Clear the undo/redo history
   */
  public clearHistory() {
    this.historyManager.clearHistory();
  }

  /**
   * Get all annotations in the controller
   * @returns A FeatureCollection containing all annotations
   */
  public getAnnotations(): AnnotationCollection {
    return this.updateManager.getAnnotations();
  }

  /**
   * Select one or more annotations by id
   * @param annotations The id(s) of the annotation(s) to select
   * @returns this for chaining
   */
  public select(annotations: Id | Id[]): this {
    this.selectionManager.select(annotations);
    return this;
  }

  /**
   * Unselect one or more annotations, or all if no ids provided
   * @param annotations The id(s) of the annotation(s) to unselect, or undefined to unselect all
   * @returns this for chaining
   */
  public unselect(annotations?: Id | Id[]): this {
    this.selectionManager.unselect(annotations);
    return this;
  }

  /**
   * Cancel the current drawing operation
   * @returns this for chaining
   */
  public cancelDrawing() {
    this.drawing.cancelPendingDrawing();
    this.editor.getActiveHandler()?.cancelDrawing();
    this.emit(EVT_CANCEL_DRAWING);
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
    this.drawing.enableArrowDrawing(style);
    return this;
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
    this.drawing.enableTextDrawing(style);
    return this;
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
    this.drawing.enableBoxDrawing(style);
    return this;
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
    this.drawing.enablePolygonDrawing(style);
    return this;
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
    this.drawing.enableCommentDrawing(options);
    return this;
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
    this.drawing.startComment(x, y, comment, options);
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
  public startBox(x: number, y: number, box?: Box) {
    this.drawing.startBox(x, y, box);
    return this;
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
  public startArrow(x: number, y: number, arrow?: Arrow) {
    this.drawing.startArrow(x, y, arrow);
    return this;
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
  public startText(x: number, y: number, text?: Text) {
    this.drawing.startText(x, y, text);
    return this;
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
    this.drawing.startPolygon(x, y, polygon);
    return this;
  }

  /**
   * Get the currently selected annotations as a collection
   * @returns A FeatureCollection of selected annotations
   */
  public getSelectedAnnotations(): AnnotationCollection {
    return this.selectionManager.getSelectedAnnotations();
  }

  /**
   * Get the first selected annotation (for backwards compatibility)
   * @returns The currently selected annotation, or null if none selected
   */
  public getSelected(): Annotation | null {
    return this.selectionManager.getSelected();
  }

  /**
   * Get a specific annotation by id
   * @param id The id of the annotation to retrieve
   * @returns The annotation with the given id, or undefined if not found
   */
  public getAnnotation<T = Annotation>(id: Id): T | undefined {
    return this.updateManager.getAnnotation<T>(id);
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
    this.updateManager.setScale(id, scale, ox, oy);
    return this;
  }

  /**
   * Toggle a comment between collapsed and expanded mode
   * @param id The id of the comment to toggle
   * @returns this for chaining
   */
  public toggleComment(id: Id): this {
    this.commentManager.toggleComment(id);
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
    this.updateManager.updateStyle<A>(id, style);
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
    this.updateManager.update(annotation);
    return this;
  }

  /**
   * Attach an arrow to a node at the specified side
   * @param arrowId
   * @param targetNode
   * @param side
   */
  public link(arrowId: Id, targetNode: Node, side: Side): this;
  /**
   * Attach an arrow to an annotation at the specified side
   * @param arrowId
   * @param target
   * @param side
   */
  public link(arrowId: Id, target: Id, side: Side): this;
  public link(arrowId: Id, target: Id | Node, side: Side = SIDE_END): this {
    const arrow = this.getAnnotation<Arrow>(arrowId);
    if (!arrow) throw new Error(`Arrow with id ${arrowId} not found`);
    this.editor.getArrowHandler().link(arrow, target, side);
    return this;
  }

  public isDrawing(): boolean {
    return this.drawing.isDrawing();
  }
}
