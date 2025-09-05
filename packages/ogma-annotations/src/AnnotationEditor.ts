import Ogma from "@linkurious/ogma";
import { TextHandler } from "./handlers/TextHandler";
import { Store } from "./store";
import { isText, Text } from "./types";
import { InteractionController } from "../interaction/InteractionController";

export class AnnotationEditor {
  private handlers = new Map<string, TextHandler>();
  private activeHandler?: TextHandler;
  private currentTool: string = "select";
  private interactionController: InteractionController;
  private lastMousePoint: { x: number; y: number } = { x: 0, y: 0 };
  private ogma: Ogma;
  private store: Store;
  private layer: Ogma.CanvasLayer;
  constructor(ogma: Ogma, store: Store) {
    this.ogma = ogma;
    this.store = store;
    // TODO: handle rotation on Ogma side
    this.layer = ogma.layers.addCanvasLayer((ctx) => this.draw(ctx), {
      shouldRotate: false
    });
    // Create all handlers with shared dependencies
    this.handlers.set("box", new TextHandler());
    this.handlers.set("text", new TextHandler());
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
    // Route mouse events to active handler
    // options.svgOverlay.getContainer().addEventListener("mousedown", (e) => {
    //   this.activeHandler?.handleMouseDown(e);
    // });

    // options.svgOverlay.getContainer().addEventListener("mousemove", (e) => {
    //   this.lastMousePoint = { x: e.clientX, y: e.clientY };
    //   this.activeHandler?.handleMouseMove(e);
    // });

    // options.svgOverlay.getContainer().addEventListener("mouseup", (e) => {
    //   this.activeHandler?.handleMouseUp(e);
    // });

    // // Route keyboard events to active handler
    // document.addEventListener("keydown", (e) => {
    //   this.activeHandler?.handleKeyDown?.(e);
    // });

    // document.addEventListener("keyup", (e) => {
    //   this.activeHandler?.handleKeyUp?.(e);
    // });
  }

  draw(ctx: CanvasRenderingContext2D) {
    // ctx.save();
    // const angle = this.ogma.view.getAngle();
    // ctx.rotate(-angle);
    this.handlers.forEach((handler) => {
      handler.draw(ctx, 0);
    });
    // ctx.restore();
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
