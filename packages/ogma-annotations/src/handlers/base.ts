import Ogma, { Point } from "@linkurious/ogma";
import { Store } from "../store";
import { Annotation, ClientMouseEvent, Cursor, Id } from "../types";
import { clientToContainerPosition, getBrowserWindow } from "../utils";

export abstract class Handler<
  T extends Annotation,
  Handle
> extends EventTarget {
  protected annotation: Id | null = null;
  protected ogma: Ogma;
  protected dragging: boolean = false;
  protected dragStartPoint?: Point;
  protected hoveredHandle?: Handle;
  protected ogmaPanningOption: boolean = false;
  protected store: Store;
  protected draggingWasEnabled: boolean = true;
  protected isDragging = false;

  constructor(ogma: Ogma, store: Store) {
    super();
    this.store = store;
    this.ogma = ogma;
    this.store.subscribe(
      (state) => state.features,
      (curr) => {
        if (this.isActive() && !curr[this.annotation!]) this.stopEditing();
      }
    );
  }

  handleMouseMove = (evt: ClientMouseEvent): void => {
    // compute the distance between the mouse and the edges of te box
    if (!this.isActive()) return;
    //const wasHovered = Boolean(this.hoveredHandle);
    if (!this.dragging) this.detectHandle(evt, this.ogma.view.getZoom());
    else if (this.dragStartPoint) this.onDrag(evt);
  };

  handleMouseDown = (evt: MouseEvent): void => {
    if (!this.isActive() || this.dragging || !this.hoveredHandle) return;

    evt.preventDefault();
    evt.stopPropagation();

    // start resizing
    this.dragging = true;
    this.dragStartPoint = this.clientToCanvas(evt);
    this.onDragStart(evt);
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
    this.onDragEnd(evt);
    this.dispatchEvent(new Event("dragend"));
  };

  cancelEdit() {
    if (!this.isActive() || this.annotation === null) return;
    this.clearDragState();
  }

  // Keyboard events
  handleKeyDown?(evt: KeyboardEvent): void;
  handleKeyUp?(evt: KeyboardEvent): void;

  protected clearDragState() {
    this.dragging = false;
    this.dragStartPoint = undefined;
    this.hoveredHandle = undefined;
    this.ogma.setOptions({
      interactions: { pan: { enabled: this.ogmaPanningOption } }
    });
  }

  protected commitChange() {
    // Commit all live updates to create a single history entry
    this.store.getState().commitLiveUpdates();
  }

  /**
   * Detects which handle is being hovered over.
   * @param evt Mouse event
   */
  protected abstract detectHandle(evt: ClientMouseEvent, zoom: number): void;
  /**
   * Handles the dragging of the selected handle.
   * @param evt Mouse event
   */
  protected abstract onDrag(evt: ClientMouseEvent): void;

  protected onDragStart(_evt: ClientMouseEvent) {
    if (!this.isActive()) return false;
    this.isDragging = true;
    this.draggingWasEnabled =
      this.ogma.getOptions().interactions?.drag?.enabled ?? true;
    this.ogma.setOptions({ interactions: { drag: { enabled: false } } });
    return true;
  }

  protected onDragEnd(_evt: ClientMouseEvent) {
    if (!this.isActive()) return false;
    this.ogma.setOptions({
      interactions: { drag: { enabled: true } }
    });
    this.isDragging = false;
    return true;
  }

  protected clientToCanvas(evt: ClientMouseEvent): Point {
    const ogma = this.ogma;
    const screenPoint = clientToContainerPosition(evt, ogma.getContainer());
    return ogma.view.screenToGraphCoordinates(screenPoint);
  }

  setAnnotation(annotation: T | null): void {
    this.annotation = annotation ? annotation.id : null;
    if (this.annotation !== null) {
      const container = this.ogma.getContainer()!;
      const win = getBrowserWindow() || container;
      win.addEventListener("mousemove", this.handleMouseMove);
      win.addEventListener("mouseup", this.handleMouseUp, true);
      container.addEventListener("mousedown", this.handleMouseDown, true);
      const { x: clientX, y: clientY } = this.ogma.getPointerInformation();
      this.handleMouseMove({ clientX, clientY });
    }
  }

  getAnnotation(): T | undefined {
    return this.store.getState().getFeature(this.annotation!) as T;
  }

  protected setCursor(cursor: Cursor) {
    const container = this.ogma.getContainer()?.firstChild;
    if (container) (container as HTMLElement).style.cursor = cursor;
  }

  stopEditing() {
    if (!this.isActive()) return;
    const container = this.ogma.getContainer()!;
    const win = getBrowserWindow() || container;
    win.removeEventListener("mousemove", this.handleMouseMove);
    win.removeEventListener("mouseup", this.handleMouseUp);
    container.removeEventListener("mousedown", this.handleMouseDown);
    this.setAnnotation(null);
    this.clearDragState();
    this.annotation = null;
  }

  isActive() {
    return this.annotation !== null;
  }
}
