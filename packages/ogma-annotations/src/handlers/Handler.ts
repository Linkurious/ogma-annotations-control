import Ogma, { Point } from "@linkurious/ogma";
import { Annotation } from "../types";

export abstract class Handler<
  T extends Annotation,
  Handle
> extends EventTarget {
  protected annotation?: T;
  protected ogma: Ogma;
  protected dragging: boolean = false;
  protected dragStartPoint?: Point;
  protected dragStartAnnotation?: T;
  protected hoveredHandle?: Handle;
  protected ogmaPanningOption: boolean = false;
  constructor(ogma: Ogma) {
    super();
    this.ogma = ogma;
  }

  handleMouseMove(e: MouseEvent): void {
    // compute the distance between the mouse and the edges of te box
    if (!this.isActive()) return;
    if (!this.dragging) {
      return this._detectHandle(e);
    } else if (this.dragStartPoint) {
      this._drag(e);
    }
  }
  handleMouseDown(e: MouseEvent): void {
    if (!this.isActive() || this.dragging || !this.hoveredHandle) return;
    e.preventDefault();
    e.stopPropagation();
    // start resizing
    this.dragging = true;
    this.dragStartPoint = this.clientToCanvas(e);
    this.dragStartAnnotation = JSON.parse(JSON.stringify(this.annotation));
    this.ogmaPanningOption = Boolean(
      this.ogma.getOptions().interactions?.pan?.enabled
    );
    this.ogma.setOptions({
      interactions: { pan: { enabled: false } }
    });
  }
  handleMouseUp(e: MouseEvent): void {
    if (!this.isActive() || !this.dragging) return;
    this.dragging = false;
    this.ogma.setOptions({
      interactions: { pan: { enabled: this.ogmaPanningOption } }
    });
  }
  cancelEdit() {
    if (!this.isActive() || !this.annotation || !this.dragStartAnnotation)
      return;
    this.annotation.geometry = this.dragStartAnnotation?.geometry;
    this.annotation.bbox = this.dragStartAnnotation?.bbox;
    this.dragging = false;
    this.ogma.setOptions({
      interactions: { pan: { enabled: this.ogmaPanningOption } }
    });
  }
  // Keyboard events
  handleKeyDown?(e: KeyboardEvent): void;
  handleKeyUp?(e: KeyboardEvent): void;

  protected abstract _detectHandle(e: MouseEvent): void;
  protected abstract _drag(e: MouseEvent): void;

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
