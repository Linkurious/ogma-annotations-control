import Ogma from "@linkurious/ogma";
import { Index } from "./spatialIndex";
import { cursors } from "../constants";
import { Links } from "../links";
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
import { clientToContainerPosition } from "../utils";

export class InteractionController {
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
    private index: Index,
    private links: Links,
    private threshold: number = 0.5
  ) {
    // use native mousemove event to detect hover,
    // so that we can allow interactivity in the
    // SVG and DOM layers
    this.ogma.getContainer()?.addEventListener("mousemove", this.onMouseMove, {
      passive: true,
      capture: true
    });

    // Add click event for selection
    this.ogma.getContainer()?.addEventListener("click", this.onMouseClick, {
      passive: true,
      capture: true
    });
    this.ogma.getContainer()?.addEventListener("mousedown", this.onMouseDown, {
      passive: true,
      capture: true
    });
    this.ogma.getContainer()?.addEventListener("mouseup", this.onMouseUp, {
      passive: true,
      capture: true
    });

    this.ogma.events.on("rotate", () => this.links.update());
  }

  detect(x: number, y: number, thresholdOverride?: number): Annotation | null {
    let result: Annotation | null = null;
    const state = this.store.getState();
    const threshold = thresholdOverride ?? this.threshold;
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
    if (Date.now() < this.suppressClickUntil) return;

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

    // If clicking on an already-selected annotation, don't change selection yet
    // (allows dragging multiple selected items)
    const state = this.store.getState();
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
    }

    this.mouseDownState = null;
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
