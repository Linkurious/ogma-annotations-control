import Ogma, { Point } from "@linkurious/ogma";
import { Annotation, Cursor, Id } from "../types";
import { Store } from "../store";
import { clientToContainerPosition } from "../utils";

export abstract class Handler<
  T extends Annotation,
  Handle
> extends EventTarget {
  protected annotation?: Id;
  protected ogma: Ogma;
  protected dragging: boolean = false;
  protected dragStartPoint?: Point;
  protected dragStartAnnotation?: T;
  protected hoveredHandle?: Handle;
  protected ogmaPanningOption: boolean = false;
  protected store: Store;

  constructor(ogma: Ogma, store: Store) {
    super();
    this.store = store;
    this.ogma = ogma;
  }

  handleMouseMove = (evt: MouseEvent): void => {
    // compute the distance between the mouse and the edges of te box
    if (!this.isActive()) return;
    const wasHovered = Boolean(this.hoveredHandle);
    if (!this.dragging) this._detectHandle(evt, this.ogma.view.getZoom());
    else if (this.dragStartPoint) this._drag(evt);

    const isHovered = Boolean(this.hoveredHandle);
    if (wasHovered !== isHovered) {
      if (isHovered) this.dispatchEvent(new Event("mouseenter"));
      else this.dispatchEvent(new Event("mouseleave"));
    }
  };

  handleMouseDown = (evt: MouseEvent): void => {
    if (!this.isActive() || this.dragging || !this.hoveredHandle) return;
    evt.preventDefault();
    evt.stopPropagation();
    // start resizing
    this.dragging = true;
    this.dragStartPoint = this.clientToCanvas(evt);
    this.dragStartAnnotation = JSON.parse(JSON.stringify(this.annotation));
    this._dragStart(evt);
    this.dispatchEvent(new Event("dragstart"));
    this.ogmaPanningOption = Boolean(
      this.ogma.getOptions().interactions?.pan?.enabled
    );
    this.ogma.setOptions({
      interactions: { pan: { enabled: false } }
    });
  };

  handleMouseUp = (evt: MouseEvent): void => {
    if (!this.isActive() || !this.dragging) return;
    this.dragging = false;
    this.ogma.setOptions({
      interactions: { pan: { enabled: this.ogmaPanningOption } }
    });
    this._dragEnd(evt);
    this.dispatchEvent(new Event("dragend"));
  };

  cancelEdit() {
    if (!this.isActive() || !this.annotation || !this.dragStartAnnotation)
      return;
    this.dragging = false;
    this.ogma.setOptions({
      interactions: { pan: { enabled: this.ogmaPanningOption } }
    });
  }

  // Keyboard events
  handleKeyDown?(evt: KeyboardEvent): void;
  handleKeyUp?(evt: KeyboardEvent): void;

  protected commitChange() {
    // Commit all live updates to create a single history entry
    this.store.getState().commitLiveUpdates();
  }

  /**
   * Detects which handle is being hovered over.
   * @param evt Mouse event
   */
  protected abstract _detectHandle(evt: MouseEvent, zoom: number): void;
  /**
   * Handles the dragging of the selected handle.
   * @param evt Mouse event
   */
  protected abstract _drag(evt: MouseEvent): void;

  protected abstract _dragStart(evt: MouseEvent): void;
  protected abstract _dragEnd(evt: MouseEvent): void;

  protected clientToCanvas(evt: MouseEvent): Point {
    const ogma = this.ogma;
    const screenPoint = clientToContainerPosition(evt, ogma.getContainer());
    return ogma.view.screenToGraphCoordinates(screenPoint);
  }

  setAnnotation(annotation: T): void {
    this.annotation = annotation.id;
  }

  getAnnotation(): T | undefined {
    return this.store.getState().getFeature(this.annotation!) as T;
  }

  protected setCursor(cursor: Cursor) {
    const container = this.ogma.getContainer()?.firstChild;
    if (container) {
      (container as HTMLElement).style.cursor = cursor;
    }
  }

  stopEditing() {
    this.annotation = undefined;
  }

  isActive() {
    return this.annotation !== undefined;
  }
}
