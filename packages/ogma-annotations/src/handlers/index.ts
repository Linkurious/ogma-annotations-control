import Ogma from "@linkurious/ogma";
import { ArrowHandler } from "./ArrowHandler";
import { Handler } from "./Handler";
import { TextHandler } from "./TextHandler";
import { InteractionController } from "../interaction/index";
import { Store } from "../store";
import { Annotation, Text } from "../types";

export class AnnotationEditor extends EventTarget {
  private handlers = new Map<string, Handler<Annotation, unknown>>();
  private activeHandler?: Handler<Annotation, unknown>;
  private currentTool: string = "select";
  private interaction: InteractionController;
  private ogma: Ogma;
  private store: Store;
  constructor(ogma: Ogma, store: Store, interactions: InteractionController) {
    super();
    this.ogma = ogma;
    this.store = store;
    this.interaction = interactions;
    this.handlers.set("box", new TextHandler(this.ogma));
    this.handlers.set("text", new TextHandler(this.ogma));
    this.handlers.set("arrow", new ArrowHandler(this.ogma));
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
        const position = (e as CustomEvent).detail.point;
        const annotation = (e as CustomEvent).detail.annotation as Annotation;
        const handle = (e as CustomEvent).detail.handle;
        this.interaction.snapping.snap(annotation, position, handle.type);
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
    container.addEventListener(
      "mousemove",
      handler.handleMouseMove.bind(handler)
    );
    container.addEventListener("mouseup", handler.handleMouseUp.bind(handler));
    container.addEventListener(
      "mousedown",
      handler.handleMouseDown.bind(handler)
    );
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
