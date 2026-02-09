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

// Type guard to check if event target is the Ogma container element
// Note: HTMLTextAreaElement is intentionally excluded - textarea events should be
// handled natively by the textarea (for text selection, scrolling, etc.)
function isOgmaContainerElement(
  element: EventTarget | null
): element is HTMLElement {
  return element instanceof HTMLCanvasElement;
}

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
  }

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

    // narrow phase
    for (const item of hit) {
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
    if (!isOgmaContainerElement(evt.target)) return;
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

  private onMouseDown = (evt: MouseEvent) => {
    if (
      !isOgmaContainerElement(evt.target) ||
      Date.now() < this.suppressClickUntil
    )
      return;

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

    // Store mouse press state globally for handlers
    const state = this.store.getState();
    this.store.setState({
      mousePressed: true,
      mousePressPoint: { x, y }
    });

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
    if (!isOgmaContainerElement(evt.target)) return;

    const state = this.store.getState();

    // Clear global mouse press state
    this.store.setState({
      mousePressed: false,
      mousePressPoint: null
    });

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

  private setCursor(cursor: Cursor) {
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
      container.removeEventListener("mousemove", this.onMouseMove);
      container.removeEventListener("click", this.onMouseClick);
    }
  }
}
