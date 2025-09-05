import Ogma, { Point } from "@linkurious/ogma";
import { Annotation } from "../types";

export abstract class Handler<T extends Annotation> extends EventTarget {
  protected annotation?: T;
  protected ogma: Ogma;
  protected dragging: boolean = false;
  protected dragStartPoint?: Point;
  protected dragStartAnnotation?: T;
  protected ogmaPanningOption: boolean = false;
  constructor(ogma: Ogma) {
    super();
    this.ogma = ogma;
  }

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

  protected clientToCanvas(e: MouseEvent): Point {
    return this.ogma.view.screenToGraphCoordinates({
      x: e.clientX,
      y: e.clientY
    });
  }

  protected findSnapPoint(point: Point): Point | null {
    // return this.snapEngine.snap(point);
    return null;
  }

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
