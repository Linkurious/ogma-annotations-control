import { Ogma } from "@linkurious/ogma";
import { ArrowHandler } from "./arrow";
import { Handler } from "./base";
import { Links } from "./links";
import { PolygonHandler } from "./polygon";
import { Snapping } from "./snapping";
import { TextHandler } from "./text";
import { EVT_DRAG_END, EVT_DRAG_START, EVT_MOUSEDOWN_ANNOTATION } from "../constants";
import { InteractionController } from "../interaction/index";
import { Store } from "../store";
import { Annotation, AnnotationType, Id, Text } from "../types";
export { handleDrag } from "./dragging";

export class AnnotationEditor extends EventTarget {
  private handlers = new Map<AnnotationType, Handler<Annotation, unknown>>();
  private activeHandler?: Handler<Annotation, unknown>;
  private interaction: InteractionController;
  private ogma: Ogma;
  private snapping: Snapping;
  private store: Store;

  constructor(
    ogma: Ogma,
    store: Store,
    snapping: Snapping,
    links: Links,
    interactions: InteractionController
  ) {
    super();
    this.ogma = ogma;
    this.store = store;
    this.snapping = snapping;
    this.interaction = interactions;
    this.handlers.set("box", new TextHandler(this.ogma, this.store, links));
    this.handlers.set("text", new TextHandler(this.ogma, this.store, links));
    this.handlers.set("comment", new TextHandler(this.ogma, this.store, links)); // Comments use same handler as text
    this.handlers.set(
      "arrow",
      new ArrowHandler(this.ogma, this.store, this.snapping, links)
    );
    this.handlers.set(
      "polygon",
      new PolygonHandler(this.ogma, this.store, links)
    );

    this.handlers.forEach((handler) => {
      handler.addEventListener("dragstart", ((evt: CustomEvent) => {
        this.dispatchEvent(new CustomEvent(EVT_DRAG_START, {
          detail: {
            ...evt.detail
          }
        })
        );
        this.store.setState({ isDragging: true });
        this.interaction.setMode("edit");
      }) as unknown as EventListener);
      handler.addEventListener("dragend", ((evt: CustomEvent) => {
        this.dispatchEvent(new CustomEvent(EVT_DRAG_END, {
          detail: {
            ...evt.detail
          }
        })
        );
        this.store.setState({ isDragging: false });
        // Suppress clicks briefly after drag ends to prevent accidental deselection
        this.interaction.suppressClicksTemporarily();
      }) as unknown as EventListener);
    });
    // A type's handler instance is shared by every annotation of that type,
    // so it tracks only one id at a time - see the comment at this event's
    // dispatch site. Re-arm on every annotation mousedown, not just newly
    // selected ones: clicking an already-selected sibling to drag it
    // doesn't change selectedFeatures at all, so the subscription below
    // (which only fires on newly selected/unselected ids) would otherwise
    // never see it.
    this.interaction.addEventListener(EVT_MOUSEDOWN_ANNOTATION, ((
      evt: CustomEvent<{ id: Id }>
    ) => {
      const id = evt.detail.id;
      const feature = this.store.getState().features[id];
      if (!feature) return;
      const handler = this.handlers.get(feature.properties.type);
      if (handler && !handler.isAnnotation(id)) {
        this.setActiveHandler(feature.properties.type);
        handler.setAnnotation(feature as Text);
      }
    }) as EventListener);

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

  public stopEditingFeature(id: Id) {
    const feature = this.store.getState().features[id];
    if (!feature) return;

    // Get handler for this feature type
    const handlerType = feature.properties.type;
    const handler = this.handlers.get(handlerType);

    // A same-type handler instance is shared across annotations of that
    // type (see the constructor). If it's currently armed on a *different*
    // still-selected sibling - e.g. deselecting one of two selected texts -
    // stopping it here would wrongly kill that sibling's active editing
    // state instead of the one actually being deselected.
    if (handler && handler.isAnnotation(id)) handler.stopEditing();
  }

  public editFeature(id: Id) {
    const feature = this.store.getState().features[id];
    if (!feature) return;
    // Get handler for this feature type
    this.setActiveHandler(feature.properties.type);
    this.activeHandler?.setAnnotation(feature as Text);
  }

  getSnapping() {
    return this.snapping;
  }

  getArrowHandler(): ArrowHandler {
    return this.handlers.get("arrow") as ArrowHandler;
  }

  getActiveHandler() {
    return this.activeHandler;
  }

  setActiveHandler(handler: AnnotationType) {
    const handlerInstance = this.handlers.get(handler);
    if (!handlerInstance)
      throw new Error(`Handler for type ${handler} not found`);
    this.activeHandler = handlerInstance;
    return this;
  }

  destroy() {
    return;
  }
}
