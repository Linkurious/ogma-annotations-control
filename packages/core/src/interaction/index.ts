import { Ogma } from "@linkurious/ogma";
import { Index } from "./spatialIndex";
import { cursors, EVT_CLICK } from "../constants";
import { Store } from "../store";
import {
  Annotation,
  detectArrow,
  detectBox,
  detectComment,
  detectText,
  Cursor,
  isArrow,
  isBox,
  isComment,
  isPolygon,
  isText,
  Text
} from "../types";
import { detectPolygon } from "../types/features/Polygon";
import { clientToContainerPosition } from "../utils/utils";
import { isAnnotationLinkTarget } from "../utils/rendering";


export class InteractionController extends EventTarget {
  private query = {
    minX: Infinity,
    minY: Infinity,
    maxX: Infinity,
    maxY: Infinity
  };
  private suppressClickUntil = 0;

  // Track mousedown state for drag detection
  private mouseDownState: {
    annotation: Annotation | null;
    screenX: number;
    screenY: number;
    hasMoved: boolean;
  } | null = null;

  private readonly DRAG_THRESHOLD = 3; // pixels

  constructor(
    private ogma: Ogma,
    private store: Store,
    private index: Index
  ) {
    super();
    const container = this.ogma.getContainer();

    // use native mousemove event to detect hover,
    // so that we can allow interactivity in the
    // SVG and DOM layers

    if (container) {
      container.addEventListener("mousemove", this.onMouseMove, {
        passive: true,
        capture: true
      });
      // Add click event for selection
      container.addEventListener("click", this.onMouseClick, {
        passive: true,
        capture: true
      });
      // Two listeners, deliberately on different phases:
      //
      // - onMouseDownArm (capture:true, fires first): Ogma's own inner
      //   wrapper stops propagation on mousedown when it lands on a node or
      //   edge, so a bubble-phase listener on the (outer) container never
      //   sees that event at all. That silently broke every gesture that
      //   starts by grabbing an existing annotation handle sitting exactly
      //   on a node/edge - e.g. detaching a comment connector's node-side
      //   tip - since the "missed mousedown" recovery in
      //   Handler.handleMouseMove (base.ts) depends on the
      //   mousePressed/mousePressPoint state this arms. It does the bare
      //   minimum so it stays correct regardless of what Ogma does next.
      // - onMouseDown (capture:false, fires later, possibly not at all on a
      //   node/edge hit): does hit-testing and selection. This needs the
      //   *late* timing - e.g. sticky-note placement creates the note from
      //   Ogma's own internal mousedown handling, and this listener must
      //   run after that so the note already exists to be found/selected.
      container.addEventListener("mousedown", this.onMouseDownArm, {
        passive: true,
        capture: true
      });
      container.addEventListener("mousedown", this.onMouseDown, {
        passive: true,
        capture: false
      });
      container.addEventListener("mouseup", this.onMouseUp, {
        passive: true,
        capture: true
      });
      container.addEventListener("wheel", this.onWheel, {
        passive: false,
        capture: true
      });
    }

    // Ogma's own node dragging doesn't go through this controller's
    // mousedown/mousemove handling below, so isDragging (which gates hover
    // updates in onMouseMove) never got set for it - hover stayed live and
    // kept updating hoveredFeature for the whole gesture. Track native node
    // drags through Ogma's own events too, so hover - and anything gated on
    // isDragging - turns off for the duration, same as an annotation drag.
    this.ogma.events.on("nodesDragStart", this.onNativeDragStart);
    this.ogma.events.on("nodesDragEnd", this.onNativeDragEnd);
  }

  private onNativeDragStart = () => {
    this.store.getState().setHoveredFeature(null);
    this.store.setState({ isDragging: true });
  };

  private onNativeDragEnd = () => {
    this.store.setState({ isDragging: false });
  };

  detect(x: number, y: number, thresholdOverride?: number): Annotation | null {
    let result: Annotation | null = null;
    const state = this.store.getState();
    const threshold = thresholdOverride ?? state.options.detectMargin;
    this.query.minX = x - threshold;
    this.query.minY = y - threshold;
    this.query.maxX = x + threshold;
    this.query.maxY = y + threshold;
    // broad phase
    const hit = this.index.query(this.query);

    if (hit.length === 0) return null;

    // Thin/small targets (arrows, comments, texts) take priority over
    // area-filling ones (boxes, polygons) that happen to also match the
    // same point - e.g. an arrow endpoint sitting inside a polygon's body
    // must still resolve to the arrow, not the polygon underneath it,
    // otherwise clicking/dragging that endpoint is unreachable: the
    // polygon's much larger hit area wins by pure luck of spatial-index
    // ordering and steals the selection out from under the arrow.
    const DETECT_PRIORITY: Record<string, number> = {
      arrow: 0,
      comment: 1,
      text: 1,
      box: 2,
      polygon: 2
    };
    const ordered = [...hit].sort(
      (a, b) =>
        (DETECT_PRIORITY[a.properties.type] ?? 9) -
        (DETECT_PRIORITY[b.properties.type] ?? 9)
    );

    // narrow phase
    for (const item of ordered) {
      // spatial index is not reliable in regards to real geometries
      const feature = state.getFeature(item.id)!;
      if (isArrow(feature)) {
        if (detectArrow(feature, { x, y }, threshold)) {
          result = feature;
          break;
        }
      } else if (isBox(feature)) {
        if (detectBox(feature, { x, y }, 0, 1, threshold)) {
          result = feature;
          break;
        }
      } else if (isPolygon(feature)) {
        if (detectPolygon(feature, { x, y }, threshold)) {
          result = feature;
          break;
        }
      } else if (isComment(feature)) {
        if (
          detectComment(
            feature,
            { x, y },
            threshold,
            state.sin,
            state.cos,
            state.zoom
          )
        ) {
          result = feature;
          break;
        }
      } else if (isText(feature)) {
        // texts are screen aligned
        if (
          detectText(
            feature as Text,
            { x, y },
            threshold,
            state.revSin,
            state.revCos,
            state.zoom
          )
        ) {
          result = feature;
          break;
        }
      }
    }
    return result;
  }

  private onMouseMove = (evt: MouseEvent) => {
    const screenPoint = clientToContainerPosition(
      evt,
      this.ogma.getContainer()
    );
    const state = this.store.getState();

    // Handle drag detection
    if (this.mouseDownState && !state.isDragging) {
      const dx = evt.clientX - this.mouseDownState.screenX;
      const dy = evt.clientY - this.mouseDownState.screenY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > this.DRAG_THRESHOLD) {
        this.mouseDownState.hasMoved = true;
        // The handler will set isDragging=true via dragstart event
        // No need to do anything else here
      }
    }

    // Don't update hover during drag
    if (state.isDragging) return;

    const { x, y } = this.ogma.view.screenToGraphCoordinates(screenPoint);
    const annotation = this.detect(x, y);

    // Update hover state
    const newHoveredId = annotation?.id ?? null;
    const currentHoveredId = state.hoveredFeature;
    if (newHoveredId !== currentHoveredId) {
      state.setHoveredFeature(newHoveredId);
    }

    this.setCursor(newHoveredId === null ? cursors.default : cursors.pointer);
  };

  private onMouseClick = () => {
    // Most click handling is now in mousedown/mouseup
    // Keep this for compatibility, but suppress it during/after drags
    if (Date.now() < this.suppressClickUntil) return;

    // Click event can be ignored if we're handling everything in mousedown/mouseup
  };

  // Capture-phase, fires before Ogma's own handling can stop propagation -
  // see the registration comment in the constructor. Kept intentionally
  // minimal: just the mousePressed/mousePressPoint state that
  // Handler.handleMouseMove (base.ts) needs to recognize a drag starting on
  // its own handle, even when that handle sits exactly on a node/edge.
  private onMouseDownArm = (evt: MouseEvent) => {
    if (Date.now() < this.suppressClickUntil) return;
    if (isAnnotationLinkTarget(evt.target)) return;

    const screenPoint = clientToContainerPosition(
      evt,
      this.ogma.getContainer()
    );
    const { x, y } = this.ogma.view.screenToGraphCoordinates(screenPoint);
    this.store.setState({
      mousePressed: true,
      mousePressPoint: { x, y }
    });
  };

  private onMouseDown = (evt: MouseEvent) => {
    if (Date.now() < this.suppressClickUntil)
      return;

    // A click on a URL inside text/comment content should open the link, not
    // select or edit the annotation. Skip hit-detection and selection entirely
    // and let the browser's native anchor navigation handle it.
    if (isAnnotationLinkTarget(evt.target)) {
      this.mouseDownState = null;
      return;
    }

    const screenPoint = clientToContainerPosition(
      evt,
      this.ogma.getContainer()
    );
    const { x, y } = this.ogma.view.screenToGraphCoordinates(screenPoint);
    const annotation = this.detect(x, y);

    // Record what was clicked, but don't select yet
    this.mouseDownState = {
      annotation,
      screenX: evt.clientX,
      screenY: evt.clientY,
      hasMoved: false
    };

    const state = this.store.getState();

    // If clicking on an already-selected annotation, don't change selection yet
    // (allows dragging multiple selected items)
    if (annotation && !state.selectedFeatures.has(annotation.id)) {
      // Not selected yet - select immediately to prepare for potential drag
      if (evt.ctrlKey || evt.metaKey) {
        state.toggleSelection(annotation.id);
      } else {
        state.setSelectedFeatures([annotation.id]);
      }
    }
  };

  private onMouseUp = (evt: MouseEvent) => {
    const state = this.store.getState();

    // Clear global mouse press state
    this.store.setState({
      mousePressed: false,
      mousePressPoint: null
    });

    // Releasing over a content link: don't select or emit a click. Native
    // anchor navigation handles it. (mouseDownState was already cleared in
    // onMouseDown for the matching press.)
    if (isAnnotationLinkTarget(evt.target)) {
      this.mouseDownState = null;
      return;
    }

    // Handle click (mousedown + mouseup without significant movement)
    if (
      this.mouseDownState &&
      !this.mouseDownState.hasMoved &&
      !state.isDragging
    ) {
      const annotation = this.mouseDownState.annotation;

      if (annotation) {
        // Handle selection on mouseup for already-selected items
        if (evt.ctrlKey || evt.metaKey) {
          state.toggleSelection(annotation.id);
        } else if (!state.selectedFeatures.has(annotation.id)) {
          state.setSelectedFeatures([annotation.id]);
        }
      } else if (!evt.ctrlKey && !evt.metaKey) {
        // Clicked empty space - clear selection
        state.clearSelection();
      }

      // Dispatch click event for UI components to respond
      this.dispatchEvent(new CustomEvent(EVT_CLICK, {
        detail: {
          id: annotation?.id ?? null, position: {
            x: evt.clientX,
            y: evt.clientY
          }
        }
      }));
    }

    this.mouseDownState = null;
  };

  private onWheel = (evt: WheelEvent) => {
    // Don't intercept wheel events on textarea - let it handle its own scrolling
    if (evt.target instanceof HTMLTextAreaElement) return;

    // Check if we're over a scrollable comment
    const screenPoint = clientToContainerPosition(
      evt,
      this.ogma.getContainer()
    );
    const { x, y } = this.ogma.view.screenToGraphCoordinates(screenPoint);
    const annotation = this.detect(x, y);

    if (!annotation || !isComment(annotation)) return;
    const maxHeight = annotation.properties.style?.maxHeight;
    const height = annotation.properties.height;

    // Check if comment has scrollable content
    if (!maxHeight || height <= maxHeight) return;
    // Find the comment's div element and scroll it
    const container = this.ogma.getContainer();
    const commentGroup = container?.querySelector(
      `[data-annotation="${annotation.id}"] .comment-box foreignObject div`
    ) as HTMLDivElement | null;

    if (commentGroup) {
      evt.stopPropagation();
      evt.preventDefault();
      commentGroup.scrollTop += evt.deltaY;
    }
  };

  public setCursor(cursor: Cursor) {
    const container = this.ogma.getContainer()?.firstChild;
    if (container) (container as HTMLElement).style.cursor = cursor;
  }

  public setMode(mode: "default" | "add" | "edit" | "link" | "rotate") {
    // TODO: implement mode switching
    // this.store.getState().setMode(mode);
    if (mode === "default") {
      this.setCursor(
        (this.ogma.getOptions().cursor?.default as Cursor) || "default"
      );
    } else if (mode === "add" || mode === "link") {
      this.setCursor(cursors.crosshair);
    } else if (mode === "rotate") {
      this.setCursor(cursors.alias);
    }
  }

  /**
   * Suppress click events for a brief period after drag operations
   * to prevent accidental deselection
   */
  public suppressClicksTemporarily(durationMs: number = 100) {
    this.suppressClickUntil = Date.now() + durationMs;
  }

  destroy() {
    const container = this.ogma.getContainer();
    if (container) {
      // removeEventListener only matches a listener registered with the
      // same capture flag - passing none here defaults to false, so the
      // capture:true listeners below were silently never actually removed
      // (a leak, and onMouseDownArm wasn't even attempted). Every flag here
      // must mirror its addEventListener call in the constructor above.
      container.removeEventListener("mousemove", this.onMouseMove, true);
      container.removeEventListener("click", this.onMouseClick, true);
      container.removeEventListener("mousedown", this.onMouseDownArm, true);
      container.removeEventListener("mousedown", this.onMouseDown, false);
      container.removeEventListener("mouseup", this.onMouseUp, true);
      container.removeEventListener("wheel", this.onWheel, true);
    }
    this.ogma.events.off(this.onNativeDragStart);
    this.ogma.events.off(this.onNativeDragEnd);
  }
}
