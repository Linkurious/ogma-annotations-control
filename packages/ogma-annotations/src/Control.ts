import type Ogma from "@linkurious/ogma";
import { MouseMoveEvent } from "@linkurious/ogma";
import EventEmitter from "eventemitter3";
import { HitDetector } from "./interaction/detect";
import { Renderer } from "./renderer/base";
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
import { clientToContainerPosition } from "./utils";

const defaultOptions: ControllerOptions = {
  magnetColor: "#3e8",
  detectMargin: 20,
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
  private renderers: Record<string, Renderer> = {};
  private hitDetector: HitDetector;

  constructor(ogma: Ogma, options: Partial<ControllerOptions> = {}) {
    super();
    this.options = this.setOptions({ ...defaultOptions, ...options });
    this.ogma = ogma;
    this.hitDetector = new HitDetector(this.options.detectMargin, this.store);
    this.initializeRenderers();
    this.setupEvents();
  }

  private initializeRenderers() {
    this.renderers.shapes = new Shapes(this.ogma, this.store);
    this.renderers.handles = new Handles(this.ogma, this.store);
  }

  private setupEvents() {
    this.ogma.events.on("mousemove", this._onMouseMove);
  }

  private _onMouseMove = (evt: MouseMoveEvent) => {
    if (evt.domEvent === null) return;
    const screenPoint = clientToContainerPosition(
      evt.domEvent,
      this.ogma.getContainer()
    );
    const pos = this.ogma.view.screenToGraphCoordinates(screenPoint);

    const hit = this.hitDetector.detect(pos.x, pos.y);
    if (hit) {
      console.log("Hit detected:", hit);
    }
  };

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
  public destroy() {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public updateStyle(_id: unknown, _s: unknown) {}
}
