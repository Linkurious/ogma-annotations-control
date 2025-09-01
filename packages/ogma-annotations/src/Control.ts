import type Ogma from "@linkurious/ogma";
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
  private renderers: Record<string, Renderer> = {};
  private hitDetector: HitDetector;

  constructor(ogma: Ogma, options: Partial<ControllerOptions> = {}) {
    super();
    this.options = this.setOptions({ ...defaultOptions, ...options });
    this.ogma = ogma;
    this.hitDetector = new HitDetector(this.store, this.options.detectMargin);
    this.initializeRenderers();
    this.setupEvents();
  }

  private initializeRenderers() {
    this.renderers.shapes = new Shapes(this.ogma, this.store);
    this.renderers.handles = new Handles(this.ogma, this.store);
  }

  private setupEvents() {
    // use native mousemove event to detect hover,
    // so that we can allow interactivity in the
    // SVG and DOM layers
    this.ogma.getContainer()?.addEventListener("mousemove", this._onMouseMove, {
      passive: true,
      capture: true
    });

    // Add click event for selection
    this.ogma.getContainer()?.addEventListener("click", this._onMouseClick, {
      passive: true,
      capture: true
    });

    this.ogma.events
      .on("dragStart", () => (this.store.getState().isDragging = true))
      .on("dragEnd", () => (this.store.getState().isDragging = false));
  }

  private _onMouseMove = (evt: MouseEvent) => {
    const screenPoint = clientToContainerPosition(
      evt,
      this.ogma.getContainer()
    );
    if (this.store.getState().isDragging) return;
    const { x, y } = this.ogma.view.screenToGraphCoordinates(screenPoint);
    const annotation = this.hitDetector.detect(x, y, this.ogma.view.getAngle());

    // Update hover state
    const newHoveredId = annotation?.id ?? null;
    const currentHoveredId = this.store.getState().hoveredFeature;
    if (newHoveredId !== currentHoveredId) {
      this.store.getState().setHoveredFeature(newHoveredId);
    }

    this.setCursor(
      annotation
        ? "pointer"
        : this.options.magnetColor === "default"
          ? "crosshair"
          : "default"
    );

    const container = this.ogma.getContainer()?.firstChild;
    if (container) {
      (container as HTMLElement).style.cursor = annotation ? "pointer" : "";
    }
  };

  /** TODO: move to selection handler */
  private _onMouseClick = (evt: MouseEvent) => {
    const screenPoint = clientToContainerPosition(
      evt,
      this.ogma.getContainer()
    );
    const { x, y } = this.ogma.view.screenToGraphCoordinates(screenPoint);
    const annotation = this.hitDetector.detect(x, y, this.ogma.view.getAngle());

    if (annotation) {
      if (evt.ctrlKey || evt.metaKey) {
        // Multi-select with Ctrl/Cmd
        this.store.getState().toggleSelection(annotation.id);
      } else {
        // Single select
        this.store.getState().setSelectedFeatures([annotation.id]);
      }
    } else if (!evt.ctrlKey && !evt.metaKey) {
      // Clear selection when clicking empty space (unless multi-selecting)
      this.store.getState().clearSelection();
    }
  };

  private setCursor(cursor: string) {
    const container = this.ogma.getContainer()?.firstChild;
    if (container) (container as HTMLElement).style.cursor = cursor;
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
    this.ogma
      .getContainer()
      ?.removeEventListener("mousemove", this._onMouseMove);
    this.ogma.getContainer()?.removeEventListener("click", this._onMouseClick);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public updateStyle(_id: unknown, _s: unknown) {}
}
