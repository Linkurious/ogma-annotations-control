import type Ogma from "@linkurious/ogma";
import EventEmitter from "eventemitter3";
import { AnnotationEditor } from "./AnnotationEditor";
import { InteractionController } from "./interaction";
import { Index } from "./interaction/spatialIndex";
import { Links } from "./links";
import { Renderer } from "./renderer/base";
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

export class Control extends EventEmitter<FeatureEvents> {
  private ogma: Ogma;
  private options: ControllerOptions;
  private store = store;
  private index = new Index(this.store);
  private renderers: Record<string, Renderer> = {};
  private interactions: InteractionController;
  private editor: AnnotationEditor;
  // TODO: maybe links should be part of the store?
  private links: Links;

  constructor(ogma: Ogma, options: Partial<ControllerOptions> = {}) {
    super();
    this.options = this.setOptions({ ...defaultOptions, ...options });
    this.ogma = ogma;
    this.links = new Links(this.ogma);
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
      this.interactions
    );
    // TODO: Use state mutations to trigger refresh instead of events?
    this.editor.addEventListener("dragging", () => {
      this.renderers.shapes.layer.refresh();
    });
    this.initializeRenderers();
    this.setupEvents();
  }

  private initializeRenderers() {
    this.renderers.shapes = new Shapes(this.ogma, this.store);
    this.editor.initRenderer();
  }

  private setupEvents() {
    this.ogma.events
      .on("dragStart", () => (this.store.getState().isDragging = true))
      .on("dragEnd", () => (this.store.getState().isDragging = false));
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
   * Destroy the controller and its elements
   */
  public destroy() {
    this.interactions.destroy();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public updateStyle(_id: unknown, _s: unknown) {}
}
