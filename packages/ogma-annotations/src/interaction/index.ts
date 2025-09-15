import Ogma from "@linkurious/ogma";
import { Index } from "./spatialIndex";
import { Links } from "../links";
import { Store } from "../store";
import {
  Annotation,
  detectArrow,
  Box,
  detectBox,
  Cursor,
  isArrow
} from "../types";
import { clientToContainerPosition } from "../utils";

export class InteractionController {
  private query = {
    minX: Infinity,
    minY: Infinity,
    maxX: Infinity,
    maxY: Infinity
  };
  private suppressClickUntil = 0;
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
    this.ogma.events.on("rotate", () => this.links.update());
  }

  detect(x: number, y: number, angle: number): Annotation | null {
    let result: Annotation | null = null;
    const threshold = this.threshold;
    this.query.minX = x - threshold;
    this.query.minY = y - threshold;
    this.query.maxX = x + threshold;
    this.query.maxY = y + threshold;
    // broad phase
    const hit = this.index.search(this.query);
    if (hit.length === 0) return null;
    // narrow phase
    for (const item of hit) {
      if (isArrow(item)) {
        if (detectArrow(item, { x, y }, threshold)) {
          result = item;
          break;
        }
      } else {
        if (detectBox(item as Box, { x, y }, angle, threshold)) {
          result = item;
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
    if (state.isDragging) return;
    const { x, y } = this.ogma.view.screenToGraphCoordinates(screenPoint);
    const annotation = this.detect(x, y, this.ogma.view.getAngle());

    // Update hover state
    const newHoveredId = annotation?.id ?? null;
    const currentHoveredId = state.hoveredFeature;
    if (newHoveredId !== currentHoveredId)
      state.setHoveredFeature(newHoveredId);

    this.setCursor(newHoveredId ? "pointer" : "default");
  };

  private onMouseClick = (evt: MouseEvent) => {
    // Ignore clicks that occur shortly after drag operations
    if (Date.now() < this.suppressClickUntil) return;

    const screenPoint = clientToContainerPosition(
      evt,
      this.ogma.getContainer()
    );
    const { x, y } = this.ogma.view.screenToGraphCoordinates(screenPoint);
    const annotation = this.detect(x, y, this.ogma.view.getAngle());

    const state = this.store.getState();
    if (annotation) {
      if (evt.ctrlKey || evt.metaKey) {
        // Multi-select with Ctrl/Cmd
        state.toggleSelection(annotation.id);
      } else {
        // Single select
        state.setSelectedFeatures([annotation.id]);
      }
    } else if (!evt.ctrlKey && !evt.metaKey) {
      // Clear selection when clicking empty space (unless multi-selecting)
      state.clearSelection();
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
      this.setCursor("crosshair");
    } else if (mode === "rotate") {
      this.setCursor("alias");
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
