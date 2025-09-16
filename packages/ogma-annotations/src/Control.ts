import type Ogma from "@linkurious/ogma";
import EventEmitter from "eventemitter3";
import { AnnotationEditor } from "./handlers";
import { InteractionController } from "./interaction";
import { Index } from "./interaction/spatialIndex";
import { Links } from "./links";
import { Handles } from "./renderer/handles";
import { Shapes } from "./renderer/shapes";
import { store } from "./store";
import {
  Annotation,
  AnnotationCollection,
  ControllerOptions,
  FeatureEvents,
  isAnnotationCollection
} from "./types";

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
  private store = store;
  private index = new Index(this.store);
  private renderers = {} as RendererMap;
  private interactions: InteractionController;
  private editor: AnnotationEditor;
  // TODO: maybe links should be part of the store?
  private links: Links;

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
    this.ogma.events
      // @ts-expect-error private event
      .on("setMultipleAttributes", this.links.onSetMultipleAttributes)
      // TODO: Make it work
      .on("dragStart", (evt) => {
        if (!evt.target) return;
        // node/edge dragging might trigger liveUpdates in the links,
        // so we need to notify the state about it
        const state = this.store.getState();
        // if (!state.historyEnabled) return;
        // this.store.getState().toggleHistory();
      })
      .on("dragEnd", () => {
        const state = this.store.getState();
        // state.commitLiveUpdates();
        // if (state.historyEnabled) return;
        // state.toggleHistory();
      });
  }

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
    } else this.store.getState().addFeature(annotation);
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

  public getAnnotations(): AnnotationCollection {
    const features = this.store.getState().features;
    return {
      type: "FeatureCollection",
      features: Object.values(features)
    };
  }

  public cancelDrawing() {}

  public startComment(x: number, y: number, text: Annotation) {}
  public startBox(x: number, y: number, box: Annotation) {}
  public startArrow(x: number, y: number, arrow: Annotation) {}

  /**
   * Destroy the controller and its elements
   */
  public destroy() {
    this.interactions.destroy();
    this.editor.destroy();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public updateStyle(_id: unknown, _s: unknown) {}
}
