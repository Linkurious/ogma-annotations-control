import { Ogma, type Point } from "@linkurious/ogma";
import { EVT_DRAG_END, EVT_DRAG, EVT_DRAG_START, cursors } from "../constants";
import { Store } from "../store";
import { Annotation, ClientMouseEvent, Cursor, Id } from "../types";
import { clientToContainerPosition, getBrowserWindow } from "../utils/utils";

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
    // Don't intercept events on textarea - let it handle text selection
    if ((evt as MouseEvent).target instanceof HTMLTextAreaElement) return;

    // compute the distance between the mouse and the edges of te box
    if (!this.isActive()) return;

    const state = this.store.getState();

    // Check if mouse was pressed before handler became active
    if (!this.dragging && state.mousePressed && state.mousePressPoint) {
      // We missed the mousedown event - simulate it if we have a hovered handle
      this.detectHandle(evt, this.ogma.view.getZoom());
      if (this.hoveredHandle) {
        this.dragStartPoint = state.mousePressPoint;
        this.onDragStart(evt);
        this.dispatchEvent(new Event(EVT_DRAG_START));
        this.disablePanning();
        return;
      }
    }

    if (!this.dragging) this.detectHandle(evt, this.ogma.view.getZoom());
    else if (this.dragStartPoint) this.onDrag(evt);
  };

  handleMouseDown = (evt: MouseEvent): void => {
    // Don't intercept events on textarea - let it handle text selection
    if (evt.target instanceof HTMLTextAreaElement) return;

    if (!this.isActive() || this.dragging) return;

    // Detect handle if not already set (e.g., when clicking without moving)
    if (!this.hoveredHandle) {
      this.detectHandle(evt, this.ogma.view.getZoom());
    }
    // if (!this.hoveredHandle) return;
    // evt.preventDefault();
    // evt.stopPropagation();
  };

  protected disablePanning = () => {
    this.ogmaPanningOption = Boolean(
      this.ogma.getOptions().interactions?.pan?.enabled
    );
    this.ogma.setOptions({
      interactions: { pan: { enabled: false }, drag: { enabled: false } }
    });
  };

  protected restorePanning = () => {
    this.ogma.setOptions({
      interactions: { pan: { enabled: true }, drag: { enabled: true } }
    });
  };

  handleMouseUp = (evt: MouseEvent): void => {
    if (!this.isActive()) return;
    if (!this.dragging) {
      return;
    }
    this.restorePanning();
    this.onDragEnd(evt);
    this.dispatchEvent(new Event(EVT_DRAG_END));
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
    this.restorePanning();
    this.setCursor(cursors.default);
  }

  protected commitChange() {
    if (!this.getAnnotation()) return;
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
  protected onDrag(_evt: ClientMouseEvent): void {
    this.dispatchEvent(new Event(EVT_DRAG));
  }

  protected onClick(_evt: ClientMouseEvent): void {
    // To be implemented by subclasses if needed
  }
  protected onDragStart(evt: ClientMouseEvent) {
    if (!this.isActive()) return false;
    this.dragging = true;
    this.dragStartPoint = this.clientToCanvas(evt);
    this.disablePanning();
    return true;
  }

  protected onDragEnd(_evt: ClientMouseEvent) {
    if (!this.isActive()) return false;
    this.restorePanning();
    this.dragging = false;
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
      // Guard against null container (e.g., in headless tests)
      const container: HTMLElement | null = this.ogma.getContainer();
      if (container) {
        const win = getBrowserWindow() || container;
        win.addEventListener("mousemove", this.handleMouseMove);
        win.addEventListener("mouseup", this.handleMouseUp, false);
        container.addEventListener("mousedown", this.handleMouseDown, true);
      }
      // const { x: clientX, y: clientY } = this.ogma.getPointerInformation();
      // this.handleMouseMove({ clientX, clientY });
    } else {
      // Guard against null container (e.g., in headless tests)
      const container: HTMLElement | null = this.ogma.getContainer();
      if (container) {
        const win = getBrowserWindow() || container;
        win.removeEventListener("mousemove", this.handleMouseMove);
        win.removeEventListener("mouseup", this.handleMouseUp);
        container.removeEventListener("mousedown", this.handleMouseDown);
      }
      this.clearDragState();
      this.setCursor(cursors.default);
    }
  }

  getAnnotation(withLiveUpdates?: boolean): T | undefined {
    const state = this.store.getState();
    const annotation = state.getFeature(this.annotation!);
    if (!withLiveUpdates) {
      return annotation as T | undefined;
    }
    const liveUpdates = state.liveUpdates[this.annotation!];
    if (annotation && liveUpdates) {
      return { ...annotation, ...liveUpdates } as T;
    }
    return annotation as T | undefined;
  }

  protected setCursor(cursor: Cursor) {
    const container = this.ogma.getContainer()?.firstChild;
    if (container) (container as HTMLElement).style.cursor = cursor;
  }

  stopEditing() {
    if (!this.isActive()) return;
    this.setAnnotation(null);
  }

  cancelDrawing() {
    if (!this.isActive()) return;
    // Only delete the annotation if it's being drawn (not an existing annotation being edited)
    const state = this.store.getState();
    if (state.drawingFeature === this.annotation)
      state.removeFeature(this.annotation!);
    this.stopEditing();
  }

  isActive() {
    return this.annotation !== null;
  }
}
