import type Ogma from "@linkurious/ogma";
import EventEmitter from "eventemitter3";
import {
  EVT_CANCEL_DRAWING,
  EVT_COMPLETE_DRAWING,
  EVT_HISTORY,
  EVT_SELECT,
  EVT_UNSELECT
} from "./constants";
import { AnnotationEditor } from "./handlers";
import { ArrowHandler } from "./handlers/arrow";
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
  Box,
  ControllerOptions,
  FeatureEvents,
  Id,
  Text,
  createArrow,
  createBox,
  createText,
  isAnnotationCollection
} from "./types";
import { migrateBoxOrTextIfNeeded } from "./utils";

const defaultOptions: ControllerOptions = {
  magnetColor: "#3e8",
  detectMargin: 2,
  magnetHandleRadius: 5,
  magnetRadius: 10,
  textPlaceholder: "Type here",
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

  constructor(ogma: Ogma, options: Partial<ControllerOptions> = {}) {
    super();
    this.options = this.setOptions({ ...defaultOptions, ...options });
    this.ogma = ogma;
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
    return true;
  }

  /**
   * Redo the last undone change
   * @returns true if redo was successful, false if no changes to redo
   */
  public redo(): boolean {
    if (!this.canRedo()) return false;
    this.store.temporal.getState().redo();
    return true;
  }

  public canUndo(): boolean {
    return this.store.temporal.getState().pastStates.length > 0;
  }

  public canRedo(): boolean {
    return this.store.temporal.getState().futureStates.length > 0;
  }

  public clearHistory() {
    this.store.temporal.getState().clear();
  }

  public getAnnotations(): AnnotationCollection {
    const features = this.store.getState().features;
    return {
      type: "FeatureCollection",
      features: Object.values(features)
    };
  }

  /**
   * Retrieve the annotation with the given id
   * @param id the id of the annotation to get
   * @returns The annotation with the given id
   */
  public getAnnotation = <T = Annotation>(id: Id) => {
    return this.store.getState().getFeature(id) as T | undefined;
  };

  public select(annotations: Id | Id[]): this {
    const ids = Array.isArray(annotations) ? annotations : [annotations];
    this.store.getState().setSelectedFeatures(ids);
    return this;
  }

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

  public cancelDrawing() {
    this.editor.getActiveHandler()?.cancelDrawing();
    this.emit(EVT_CANCEL_DRAWING);
    return this;
  }

  public startComment(_x: number, _y: number, _text: Annotation) {}

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

  public startArrow(x: number, y: number, arrow: Arrow = createArrow(x, y)) {
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
