import Ogma from "@linkurious/ogma";
import { ArrowHandler } from "./arrow";
import { Handler } from "./handler";
import { Snapping } from "./snapping";
import { TextHandler } from "./text";
import { InteractionController } from "../interaction/index";
import { Index } from "../interaction/spatialIndex";
import { Links } from "../links";
import { Store } from "../store";
import { Annotation, Id, Text } from "../types";
import { getBrowserWindow } from "../utils";

export class AnnotationEditor extends EventTarget {
  private handlers = new Map<string, Handler<Annotation, unknown>>();
  private activeHandler?: Handler<Annotation, unknown>;
  private currentTool: string = "select";
  private interaction: InteractionController;
  private ogma: Ogma;
  private snapping: Snapping;
  private store: Store;

  constructor(
    ogma: Ogma,
    store: Store,
    index: Index,
    links: Links,
    interactions: InteractionController
  ) {
    super();
    this.ogma = ogma;
    this.store = store;
    this.interaction = interactions;
    this.snapping = new Snapping(
      ogma,
      { detectMargin: 10, magnetRadius: 10 },
      index
    );
    this.handlers.set("box", new TextHandler(this.ogma, this.store));
    this.handlers.set("text", new TextHandler(this.ogma, this.store));
    this.handlers.set(
      "arrow",
      new ArrowHandler(this.ogma, this.store, this.snapping, links)
    );

    this.handlers.forEach((handler) => {
      handler.addEventListener("dragstart", () => {
        this.dispatchEvent(new Event("dragstart"));
        this.store.setState({ isDragging: true });
        this.interaction.setMode("edit");
      });
      handler.addEventListener("dragend", () => {
        this.dispatchEvent(new Event("dragend"));
        this.store.setState({ isDragging: false });
        // Suppress clicks briefly after drag ends to prevent accidental deselection
        this.interaction.suppressClicksTemporarily();
      });

      handler.addEventListener("dragging", (e) => {
        this.dispatchEvent(new CustomEvent("dragging", e));
        this.store.setState({ isDragging: true });
      });
    });
    this.store.subscribe(
      (state) => state.selectedFeatures,
      (current, previous) => {
        const selected = Array.from(current.keys()).filter(
          (f) => !previous.has(f)
        );
        const unselected = Array.from(previous.keys()).filter(
          (f) => !current.has(f)
        );

        if (!selected.length && !unselected.length) return;

        unselected.forEach((f) => this.stopEditingFeature(f));
        selected.forEach((f) => this.editFeature(f));
      }
    );
  }

  stopEditingFeature(id: Id) {
    const feature = this.store.getState().features[id];
    if (!feature) return;

    // Get handler for this feature type
    const handlerType = feature.properties.type;
    const handler = this.handlers.get(handlerType);

    if (!handler) return;
    handler.stopEditing();
    const container = this.ogma.getContainer()!;
    const win = getBrowserWindow() || container;
    win.removeEventListener("mousemove", handler.handleMouseMove);
    win.removeEventListener("mouseup", handler.handleMouseUp);
    container.removeEventListener("mousedown", handler.handleMouseDown);
  }

  editFeature(id: Id) {
    const feature = this.store.getState().features[id];
    if (!feature) return;
    // Get handler for this feature type
    const handlerType = feature.properties.type;
    const handler = this.handlers.get(handlerType);

    if (!handler) return;
    this.activeHandler = handler;
    handler.setAnnotation(feature as Text);
    const container = this.ogma.getContainer()!;
    const win = getBrowserWindow() || container;
    win.addEventListener("mousemove", handler.handleMouseMove);
    win.addEventListener("mouseup", handler.handleMouseUp, true);
    container.addEventListener("mousedown", handler.handleMouseDown);
  }

  getCurrentTool(): string {
    return this.currentTool;
  }

  getActiveHandler() {
    return this.activeHandler;
  }

  destroy() {
    return;
  }
}
