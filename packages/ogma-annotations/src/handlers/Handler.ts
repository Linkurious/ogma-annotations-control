import type { Point } from "@linkurious/ogma";
import { InteractionController } from "../interaction";
import { Index } from "../interaction/spatialIndex";

export interface SnapEngine {
  snap(point: Point): Point | null;
}

export abstract class Handler {
  protected isActive = false;

  constructor(
    protected interaction: InteractionController,
    protected spatialIndex: Index,
    protected snapEngine: SnapEngine
  ) {}

  // Lifecycle
  abstract activate(mode: "draw" | "edit"): void;
  abstract deactivate(): void;

  // Mouse events
  abstract handleMouseDown(e: MouseEvent): void;
  abstract handleMouseMove(e: MouseEvent): void;
  abstract handleMouseUp(e: MouseEvent): void;

  // Keyboard events
  handleKeyDown?(e: KeyboardEvent): void;
  handleKeyUp?(e: KeyboardEvent): void;

  // Edit existing feature
  abstract startEdit(featureId: string, point: Point): void;
  abstract cancelEdit(): void;

  // Utilities all handlers can use
  protected clientToCanvas(e: MouseEvent): Point {
    // This should be implemented by getting the container and converting coordinates
    // For now, return the client coordinates - this will need to be properly implemented
    // with the actual Ogma instance reference
    return { x: e.clientX, y: e.clientY };
  }

  protected findSnapPoint(point: Point): Point | null {
    // return this.snapEngine.snap(point);
    return null;
  }
}
