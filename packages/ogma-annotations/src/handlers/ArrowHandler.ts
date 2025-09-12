import Ogma, { Point } from "@linkurious/ogma";
import { Handler } from "./Handler";
import { Snap, Snapping } from "./snapping";
import { Links } from "../links";
import { Arrow } from "../types";
import { Store } from "../store";
import { handleDetectionThreshold } from "../constants";

type Handle = {
  type: "start" | "end";
  point: Point;
};

export class ArrowHandler extends Handler<Arrow, Handle> {
  private snapping: Snapping;
  private links: Links;
  private snap: Snap | null = null;

  constructor(ogma: Ogma, store: Store, snapping: Snapping, links: Links) {
    super(ogma, store);
    this.snapping = snapping;
    this.links = links;
  }

  protected _detectHandle(evt: MouseEvent, zoom: number) {
    const annotation = this.annotation!;
    const mousePoint = this.clientToCanvas(evt);
    const margin = handleDetectionThreshold; // Larger margin for easier arrow endpoint selection

    const startPoint = annotation.geometry.coordinates[0];
    const endPoint = annotation.geometry.coordinates[1];

    const startDistance = Math.sqrt(
      Math.pow(mousePoint.x - startPoint[0], 2) +
        Math.pow(mousePoint.y - startPoint[1], 2)
    );

    const endDistance = Math.sqrt(
      Math.pow(mousePoint.x - endPoint[0], 2) +
        Math.pow(mousePoint.y - endPoint[1], 2)
    );

    if (startDistance < margin) {
      this.hoveredHandle = {
        type: "start",
        point: { x: startPoint[0], y: startPoint[1] }
      };
      this.store.setState({ hoveredHandle: 0 });
    } else if (endDistance < margin) {
      this.hoveredHandle = {
        type: "end",
        point: { x: endPoint[0], y: endPoint[1] }
      };
      this.store.setState({ hoveredHandle: 1 });
      this.setCursor("move");
    } else {
      this.store.setState({ hoveredHandle: -1 });
      this.hoveredHandle = undefined;
    }
  }

  protected _drag(evt: MouseEvent) {
    if (!this.dragStartPoint || !this.hoveredHandle || !this.annotation) return;

    evt.stopPropagation();
    evt.stopImmediatePropagation();

    const mousePoint = this.clientToCanvas(evt);
    const handle = this.hoveredHandle;
    this.snap = this.snapping.snap(this.annotation, mousePoint);
    const point = this.snap?.point || mousePoint;

    // Create updated coordinates
    const newCoordinates = [...this.annotation.geometry.coordinates];
    if (handle.type === "start") {
      newCoordinates[0] = [point.x, point.y];
    } else if (handle.type === "end") {
      newCoordinates[1] = [point.x, point.y];
    }

    // Apply live update to store instead of direct mutation
    this.store.getState().applyLiveUpdate(this.annotation.id, {
      id: this.annotation.id,
      properties: this.annotation.properties,
      geometry: {
        type: this.annotation.geometry.type,
        coordinates: newCoordinates
      }
    });

    this.dispatchEvent(
      new CustomEvent("dragging", {
        detail: {
          point,
          annotation: this.annotation,
          handle
        }
      })
    );
  }
  protected _dragStart() {
    if (!this.annotation) return;
    // Start live update tracking for this annotation
    this.store.getState().startLiveUpdate([this.annotation.id]);
  }

  protected _dragEnd() {
    if (!this.annotation) return;

    // Commit all live updates to create a single history entry
    this.store.getState().commitLiveUpdates();

    // Handle snapping if applicable
    if (this.snap && this.hoveredHandle) {
      const handle = this.hoveredHandle;
      this.links.add(
        this.annotation,
        handle.type,
        this.snap.id,
        this.snap.type,
        this.snap.magnet
      );
    }

    this.snap = null;
  }
}
