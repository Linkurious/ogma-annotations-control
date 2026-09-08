import { Ogma } from "@linkurious/ogma";
import { ArrowHandler } from "./arrow";
import { Handler } from "./base";
import { Links } from "./links";
import { PolygonHandler } from "./polygon";
import { Snapping } from "./snapping";
import { TextHandler } from "./text";
import { EVT_DRAG_END, EVT_DRAG_START } from "../constants";
import { EVT_MOUSEDOWN_ANNOTATION, InteractionController } from "../interaction/index";
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
    // Clicking an already-selected sibling to drag it doesn't change
    // selectedFeatures, so the subscription below wouldn't switch its
    // handler onto it on its own - do it here too. Only when actually
    // switching id: re-running this on a comment already tracked would
    // reset TextHandler's justActivated and break its double-click-to-edit
    // gate.
    this.interaction.addEventListener(EVT_MOUSEDOWN_ANNOTATION, ((
      evt: CustomEvent<{ id: Id }>
    ) => {
      const id = evt.detail.id;
      const feature = this.store.getState().features[id];
      const handler = feature && this.handlers.get(feature.properties.type);
      if (handler && !handler.isAnnotation(id)) this.editFeature(id);
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

    // Only stop it if it's still tracking this id - it may already be
    // tracking a different, still-selected same-type sibling instead.
    if (handler && handler.isAnnotation(id)) handler.stopEditing();
  }

  public editFeature(id: Id) {
    const feature = this.store.getState().features[id];
    if (!feature) return;
    // Get handler for this feature type
    this.setActiveHandler(feature.properties.type);
    // Selection stays independent of this - a non-editable feature is still selected, it just never gets a handler attached.
    if (!this.store.getState().options.isEditable(feature)) return;
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
