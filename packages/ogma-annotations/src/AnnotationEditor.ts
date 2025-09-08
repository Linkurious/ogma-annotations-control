import Ogma, { CanvasLayer } from "@linkurious/ogma";
import { ArrowHandler } from "./handlers/ArrowHandler";
import { Handler } from "./handlers/Handler";
import { TextHandler } from "./handlers/TextHandler";
import { Store } from "./store";
import { Text } from "./types";
import { InteractionController } from "../interaction/InteractionController";

export class AnnotationEditor extends EventTarget {
  private handlers = new Map<string, Handler<unknown>>();
  private activeHandler?: Handler<unknown>;
  private currentTool: string = "select";
  private interactions: InteractionController;
  private lastMousePoint: { x: number; y: number } = { x: 0, y: 0 };
  private ogma: Ogma;
  private store: Store;
  private layer!: CanvasLayer;
  constructor(ogma: Ogma, store: Store, interactions: InteractionController) {
    super();
    this.ogma = ogma;
    this.store = store;
    this.interactions = interactions;
    // TODO: handle rotation on Ogma side
  }
  initRenderer() {
    this.layer = this.ogma.layers.addCanvasLayer((ctx) => this.draw(ctx), {
      // @ts-expect-error TODO: fix signature
      shouldRotate: false
    });
    this.layer.element.style.pointerEvents = "none";
    // Create all handlers with shared dependencies
    this.handlers.set("box", new TextHandler(this.ogma));
    this.handlers.set("text", new TextHandler(this.ogma));
    this.handlers.set("arrow", new ArrowHandler(this.ogma));
    this.handlers.forEach((handler) => {
      handler.addEventListener("dragging", () => {
        this.layer.refresh();
        this.dispatchEvent(new Event("dragging"));
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
      this.layer.refresh();
    });
  }

  draw(ctx: CanvasRenderingContext2D) {
    this.handlers.forEach((handler) => {
      handler.draw(ctx, 0);
    });
  }

  setTool(tool: string) {
    // Deactivate previous
    return;
    this.activeHandler?.deactivate();

    if (tool === "select") {
      this.activeHandler = undefined;
      this.interactionController.setMode("select");
    } else {
      this.activeHandler = this.handlers.get(tool);
      this.activeHandler?.activate("draw");
    }

    this.currentTool = tool;
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
    // this.activeHandler?.deactivate();
    this.activeHandler = handler;
    // handler.activate("edit");
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

    this.activeHandler?.deactivate();
    this.handlers.clear();
  }
}
