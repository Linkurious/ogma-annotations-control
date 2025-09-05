import { Point } from "@linkurious/ogma";
import { Annotation } from "../types";

export abstract class Handler<T extends Annotation> {
  protected annotation?: T;

  constructor() {}

  // Lifecycle
  // abstract activate(mode: "draw" | "edit"): void;
  // abstract deactivate(): void;

  // Mouse events
  abstract handleMouseDown(e: MouseEvent): void;
  abstract handleMouseMove(e: MouseEvent): void;
  abstract handleMouseUp(e: MouseEvent): void;

  // Keyboard events
  handleKeyDown?(e: KeyboardEvent): void;
  handleKeyUp?(e: KeyboardEvent): void;

  // Edit existing feature
  // abstract startEdit(featureId: string, point: Point): void;
  abstract cancelEdit(): void;

  // Utilities all handlers can use
  protected clientToCanvas(e: MouseEvent): Point {
    // Convert client coordinates to canvas coordinates
    // This would need to be implemented based on your canvas setup
    return { x: e.clientX, y: e.clientY };
  }

  protected findSnapPoint(point: Point): Point | null {
    // return this.snapEngine.snap(point);
    return null;
  }

  // Annotation management
  setAnnotation(annotation: T): void {
    this.annotation = annotation;
  }

  getAnnotation(): T | undefined {
    return this.annotation;
  }

  stopEditing() {
    this.annotation = undefined;
  }

  isActive() {
    return this.annotation !== undefined;
  }
}
