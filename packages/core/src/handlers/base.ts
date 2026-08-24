import { Ogma, type Point } from "@linkurious/ogma";
import { EVT_DRAG_END, EVT_DRAG, EVT_DRAG_START, cursors } from "../constants";
import { Store } from "../store";
import { Annotation, ClientMouseEvent, Cursor, Id } from "../types";
import { clientToContainerPosition, getBrowserWindow } from "../utils/utils";
import { isAnnotationLinkTarget } from "../utils/rendering";

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
  private savedDetectOption?: { nodes?: boolean; edges?: boolean };

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
        this.dispatchEvent(
          new CustomEvent(EVT_DRAG_START, {
            detail: {
              id: this.annotation,
              position: {
                x: evt.clientX,
                y: evt.clientY
              }
            }
          })
        );
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
    // Don't intercept clicks on URL links inside annotation content - let the
    // browser open the link instead of starting selection/handle detection.
    if (isAnnotationLinkTarget(evt.target)) return;

    if (!this.isActive() || this.dragging) return;

    // Detect handle if not already set (e.g., when clicking without moving)
    if (!this.hoveredHandle) {
      this.detectHandle(evt, this.ogma.view.getZoom());
    }
  };

  protected disablePanning = () => {
    this.ogmaPanningOption = Boolean(
      this.ogma.getOptions().interactions?.pan?.enabled
    );
    // While we're dragging one of our own handles, Ogma should not detect
    // nodes/edges under the pointer at all - otherwise it keeps hovering
    // them (cursor change, highlight style) even though the drag has
    // nothing to do with them. options.detect.nodes/edges turns hit-testing
    // for them off outright (ogma.getHoveredElement() returns null while
    // it's off), which is cleaner than fighting the cursor/hover-style
    // options individually and, unlike those, is actually readable back via
    // getOptions() - so the host app's own detect config survives the drag
    // untouched.
    //
    // A single drag calls this twice (once from the base onDragStart below,
    // once more from the "missed mousedown" recovery in
    // Handler.handleMouseMove right after) - only snapshot on the first
    // call, or the second call would save our own override as if it were
    // the real options and "restore" to that instead.
    //
    // Take an explicit shallow copy rather than `?? {}` on its own: that
    // still leaves `undefined` (no detect config at all) and `{}` (an
    // explicitly empty one) indistinguishable, and restoring later by
    // spreading our own nodes/edges:false *over* this copy - instead of
    // trusting setOptions() to merge them into whatever detect config is
    // live at the time - means every other detect flag (nodeTexts,
    // nodeErrorMargin, ...) round-trips exactly regardless of how a given
    // Ogma version merges nested option objects internally.
    if (this.savedDetectOption === undefined) {
      this.savedDetectOption = { ...this.ogma.getOptions().detect };
    }
    this.ogma.setOptions({
      interactions: { pan: { enabled: false }, drag: { enabled: false } },
      detect: { ...this.savedDetectOption, nodes: false, edges: false }
    });
  };

  protected restorePanning = () => {
    this.ogma.setOptions({
      interactions: { pan: { enabled: true }, drag: { enabled: true } },
      ...(this.savedDetectOption ? { detect: this.savedDetectOption } : {})
    });
    this.savedDetectOption = undefined;
  };

  handleMouseUp = (evt: MouseEvent): void => {
    if (!this.isActive()) return;
    if (!this.dragging) {
      return;
    }
    this.restorePanning();
    this.onDragEnd(evt);
    this.dispatchEvent(
      new CustomEvent(EVT_DRAG_END, {
        detail: {
          id: this.annotation,
          position: {
            x: evt.clientX,
            y: evt.clientY
          }
        }
      })
    );
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

  protected onClick = (_evt: MouseEvent): void => {};
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
        win.addEventListener("click", this.onClick as EventListener, true);
      }
    } else {
      // Guard against null container (e.g., in headless tests)
      const container: HTMLElement | null = this.ogma.getContainer();
      if (container) {
        const win = getBrowserWindow() || container;
        win.removeEventListener("mousemove", this.handleMouseMove);
        win.removeEventListener("mouseup", this.handleMouseUp);
        container.removeEventListener("mousedown", this.handleMouseDown);
        win.removeEventListener("click", this.onClick as EventListener);
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
    if (state.drawingFeature === this.annotation) {
      state.removeFeature(this.annotation!);
      // Otherwise drawingFeature stays stuck on the now-deleted id and
      // isDrawing() keeps reporting true forever after a cancel.
      this.store.setState({ drawingFeature: null });
    }
    this.stopEditing();
  }

  isActive() {
    return this.annotation !== null;
  }
}
