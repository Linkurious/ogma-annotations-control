import Ogma from "@linkurious/ogma";
import { Index } from "./spatialIndex";
import { Store } from "../store";
import { Annotation, Arrow, Box, isArrow, Point, Vector } from "../types";
import {
  clientToContainerPosition,
  getArrowEndPoints,
  getBoxPosition,
  getBoxSize
} from "../utils";
import { dot, length, subtract, normalize, cross, rotateRadians } from "../vec";

export class InteractionController {
  private query = {
    minX: Infinity,
    minY: Infinity,
    maxX: Infinity,
    maxY: Infinity
  };

  constructor(
    private ogma: Ogma,
    private store: Store,
    private index: Index,
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
        if (this.detectArrow(item, { x, y }, threshold)) {
          result = item;
          break;
        }
      } else {
        if (this.detectBox(item as Box, { x, y }, angle, threshold)) {
          result = item;
          break;
        }
      }
    }
    return result;
  }

  detectBox(a: Box, p: Point, angle: number, threshold: number): boolean {
    // check if the pointer is within the bounding box of the text
    const { x: tx, y: ty } = getBoxPosition(a);
    const { width, height } = getBoxSize(a);
    const origin = { x: tx, y: ty };
    const { x: dx, y: dy } = rotateRadians(subtract(p, origin), -angle);

    return (
      dx > -threshold &&
      dx < width + threshold &&
      dy > -threshold &&
      dy < height + threshold
    );
  }

  detectArrow(a: Arrow, point: Point, threshold: number): boolean {
    const { start, end } = getArrowEndPoints(a);
    // p is the vector from mouse pointer to the center of the arrow
    const p: Vector = subtract(point, start);
    // detect if point is ON the line between start and end.
    // line width is the arrow width
    const width = a.properties.style!.strokeWidth!;
    const vec = subtract(end, start);

    const lineLen = length(vec);
    const proj = dot(p, normalize(vec));
    return (
      proj > 0 &&
      proj < lineLen &&
      Math.abs(cross(p, normalize(vec))) < width / 2 + threshold
    );
  }

  private onMouseMove = (evt: MouseEvent) => {
    const screenPoint = clientToContainerPosition(
      evt,
      this.ogma.getContainer()
    );

    if (this.store.getState().isDragging) return;

    const { x, y } = this.ogma.view.screenToGraphCoordinates(screenPoint);
    const annotation = this.detect(x, y, this.ogma.view.getAngle());

    // Update hover state
    const newHoveredId = annotation?.id ?? null;
    const currentHoveredId = this.store.getState().hoveredFeature;
    if (newHoveredId !== currentHoveredId) {
      this.store.getState().setHoveredFeature(newHoveredId);
    }

    this.setCursor(annotation ? "pointer" : "default");

    const container = this.ogma.getContainer()?.firstChild;
    if (container) {
      (container as HTMLElement).style.cursor = annotation ? "pointer" : "";
    }
  };

  private onMouseClick = (evt: MouseEvent) => {
    const screenPoint = clientToContainerPosition(
      evt,
      this.ogma.getContainer()
    );
    const { x, y } = this.ogma.view.screenToGraphCoordinates(screenPoint);
    const annotation = this.detect(x, y, this.ogma.view.getAngle());

    if (annotation) {
      if (evt.ctrlKey || evt.metaKey) {
        // Multi-select with Ctrl/Cmd
        this.store.getState().toggleSelection(annotation.id);
      } else {
        // Single select
        this.store.getState().setSelectedFeatures([annotation.id]);
      }
    } else if (!evt.ctrlKey && !evt.metaKey) {
      // Clear selection when clicking empty space (unless multi-selecting)
      this.store.getState().clearSelection();
    }
  };

  private setCursor(cursor: string) {
    const container = this.ogma.getContainer()?.firstChild;
    if (container) (container as HTMLElement).style.cursor = cursor;
  }

  destroy() {
    const container = this.ogma.getContainer();
    if (container) {
      container.removeEventListener("mousemove", this.onMouseMove);
      container.removeEventListener("click", this.onMouseClick);
    }
  }
}
