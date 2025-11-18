import type Ogma from "@linkurious/ogma";
import { MouseButtonEvent } from "@linkurious/ogma";
import EventEmitter from "eventemitter3";
import { Position } from "geojson";
import {
  EVT_ADD,
  EVT_CANCEL_DRAWING,
  EVT_COMPLETE_DRAWING,
  EVT_HISTORY,
  EVT_REMOVE,
  EVT_SELECT,
  EVT_UNSELECT
} from "./constants";
import { AnnotationEditor } from "./handlers";
import { ArrowHandler } from "./handlers/arrow";
import { CommentDrawingHandler } from "./handlers/commentDrawing";
import { PolygonHandler } from "./handlers/polygon";
import { TextHandler } from "./handlers/text";
import { InteractionController } from "./interaction";
import { Index } from "./interaction/spatialIndex";
import { Links } from "./links";
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
  isAnnotationCollection
} from "./types";
import { migrateBoxOrTextIfNeeded } from "./utils";

// Default send button icon (paper plane)
const DEFAULT_SEND_ICON = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const defaultOptions: ControllerOptions = {
  magnetColor: "#3e8",
  detectMargin: 2,
  magnetHandleRadius: 5,
  magnetRadius: 10,
  textPlaceholder: "Type here",
  showSendButton: true,
  sendButtonIcon: DEFAULT_SEND_ICON,
  arrowHandleSize: 3.5,
  textHandleSize: 3.5,
  minArrowHeight: 20,
  maxArrowHeight: 30
};

interface RendererMap {
  shapes: Shapes;
  handles: Handles;
}

export class Control extends EventEmitter<FeatureEvents> {
  private ogma: Ogma;
  private options: ControllerOptions;
  private store = createStore();

  private renderers = {} as RendererMap;
  private interactions: InteractionController;
  private editor: AnnotationEditor;
  // TODO: maybe links should be part of the store?
  private links: Links;
  private index = new Index(this.store);

  // Track pending drawing listener to clean up on cancel
  private pendingDrawingListener:
    | (<T extends MouseButtonEvent<unknown, unknown>>(evt: T) => void)
    | null = null;

  constructor(ogma: Ogma, options: Partial<ControllerOptions> = {}) {
    super();
    this.options = this.setOptions({ ...defaultOptions, ...options });
    this.ogma = ogma;

    // Store options in state for access by handlers
    this.store.setState({
      options: {
        showSendButton: this.options.showSendButton,
        sendButtonIcon: this.options.sendButtonIcon
      }
    });

    this.links = new Links(this.ogma, this.store);
    this.interactions = new InteractionController(
      this.ogma,
      this.store,
      this.index,
      this.links,
      this.options.detectMargin
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
    this.ogma.events.on("rotate", this.onRotate).on("zoom", this.onZoom);
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
            if (!prev[id]) this.emit(EVT_ADD, { id });
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

  private onZoom = () =>
    this.store.getState().setZoom(this.ogma.view.getZoom());

  /**
   * Set the options for the controller
   * @param options new Options
   * @returns the updated options
   */
  public setOptions(options: Partial<ControllerOptions> = {}) {
    this.options = {
      ...(this.options || {}),
      ...options
    } as ControllerOptions;
    return this.options;
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
   * Enable arrow drawing mode - listens for next mousedown to start drawing
   * @param style Arrow style options
   * @returns this for chaining
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
   * Enable text drawing mode - listens for next mousedown to start drawing
   * @param style Text style options
   * @returns this for chaining
   */
  public enableTextDrawing(style?: Partial<Text["properties"]["style"]>): this {
    return this.enableDrawingMode((x, y) => {
      const text = createText(x, y, 0, 0, undefined, style);
      this.startText(x, y, text);
    });
  }

  /**
   * Enable box drawing mode - listens for next mousedown to start drawing
   * @param style Box style options
   * @returns this for chaining
   */
  public enableBoxDrawing(style?: Partial<Box["properties"]["style"]>): this {
    return this.enableDrawingMode((x, y) => {
      const box = createBox(x, y, 0, 0, style);
      this.startBox(x, y, box);
    });
  }

  /**
   * Enable polygon drawing mode - listens for next mousedown to start drawing
   * @param style Polygon style options
   * @returns this for chaining
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
   * Enable comment drawing mode - listens for next mousedown to start drawing
   * Click: Creates comment at offset from click point with arrow
   * Drag: Creates arrow dynamically, places comment at release point
   * @param options Drawing options including offsets and styles
   * @returns this for chaining
   */
  public enableCommentDrawing(options?: {
    offsetX?: number;
    offsetY?: number;
    commentStyle?: Partial<CommentProps>;
    arrowStyle?: Partial<ArrowProperties>;
  }): this {
    return this.enableDrawingMode((x, y) => {
      const comment = createComment(x, y, "", options?.commentStyle);
      this.startCommentDrawing(x, y, comment, options);
    });
  }

  /**
   * Start adding a comment/text annotation at a position
   * @param _x X coordinate
   * @param _y Y coordinate
   * @param _text The text annotation to add (currently not implemented)
   */
  public startComment(_x: number, _y: number, _text: Annotation) {}

  /**
   * Start drawing a box annotation
   * @param x X coordinate for the box origin
   * @param y Y coordinate for the box origin
   * @param box The box annotation to add (optional, will be created if not provided)
   * @returns this for chaining
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
   * Start drawing an arrow annotation
   * @param x X coordinate for the arrow start
   * @param y Y coordinate for the arrow start
   * @param arrow The arrow annotation to add (optional, will be created if not provided)
   * @returns this for chaining
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
   * Start drawing a text annotation
   * @param x X coordinate for the text
   * @param y Y coordinate for the text
   * @param text The text annotation to add (optional, will be created if not provided)
   * @returns this for chaining
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
   * Start drawing a polygon annotation (freehand)
   * @param x X coordinate to start drawing
   * @param y Y coordinate to start drawing
   * @param polygon The polygon annotation to add (optional, will be created if not provided)
   * @returns this for chaining
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
   * Start drawing a comment annotation with arrow
   * @param x X coordinate to start drawing
   * @param y Y coordinate to start drawing
   * @param comment The comment annotation to add
   * @param options Drawing options including offsets and styles
   * @returns this for chaining
   */
  public startCommentDrawing(
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
      this.editor.getSnapping(),
      this.links,
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
}
