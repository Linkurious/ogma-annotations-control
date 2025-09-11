import Ogma from "@linkurious/ogma";
import { ArrowHandler } from "./ArrowHandler";
import { Handler } from "./Handler";
import { Snapping } from "./snapping";
import { TextHandler } from "./TextHandler";
import { InteractionController } from "../interaction/index";
import { Index } from "../interaction/spatialIndex";
import { Links } from "../links";
import { Store } from "../store";
import { Annotation, Text } from "../types";

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
    this.handlers.set("box", new TextHandler(this.ogma));
    this.handlers.set("text", new TextHandler(this.ogma));
    this.handlers.set(
      "arrow",
      new ArrowHandler(this.ogma, this.snapping, links)
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
        this.interaction.setMode("default");
      });

      handler.addEventListener("dragging", (e) => {
        this.dispatchEvent(new CustomEvent("dragging", e));
        this.store.setState({ isDragging: true });
      });
      handler.addEventListener("mouseenter", () => {
        this.store.setState({ hoveringHandle: true });
      });
      handler.addEventListener("mouseleave", () => {
        this.store.setState({ hoveringHandle: false });
      });
    });
    // TODO: use the right store subscription method
    this.store.subscribe((newState, oldState) => {
      const newlySelected = Array.from(newState.selectedFeatures.keys()).filter(
        (e) => !oldState.selectedFeatures.has(e)
      );
      const removedFromSelection = Array.from(oldState.selectedFeatures).filter(
        (e) => !newState.selectedFeatures.has(e)
      );
      if (!newlySelected.length && !removedFromSelection.length) return;
      removedFromSelection.forEach((e) => {
        this.stopEditingFeature(e);
      });
      newlySelected.forEach((e) => {
        this.editFeature(e);
      });
    });
  }

  stopEditingFeature(featureId: string) {
    const feature = this.store.getState().features[featureId];
    if (!feature) return;

    // Get handler for this feature type
    const handlerType = feature.properties.type;
    const handler = this.handlers.get(handlerType);

    if (!handler) return;
    handler.stopEditing();
    const container = this.ogma.getContainer()!;
    container.removeEventListener("mousemove", handler.handleMouseMove);
    container.removeEventListener("mouseup", handler.handleMouseUp);
    container.removeEventListener("mousedown", handler.handleMouseDown);
  }

  editFeature(featureId: string) {
    const feature = this.store.getState().features[featureId];
    if (!feature) return;
    // Get handler for this feature type
    const handlerType = feature.properties.type;
    const handler = this.handlers.get(handlerType);

    if (!handler) return;
    this.activeHandler = handler;
    handler.setAnnotation(feature as Text);
    const container = this.ogma.getContainer()!;
    container.addEventListener("mousemove", handler.handleMouseMove);
    container.addEventListener("mouseup", handler.handleMouseUp);
    container.addEventListener("mousedown", handler.handleMouseDown);
  }

  getCurrentTool(): string {
    return this.currentTool;
  }

  getActiveHandler(): TextHandler | undefined {
    return this.activeHandler;
  }

  destroy() {
    return;
  }
}
