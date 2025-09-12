import Ogma, { Point } from "@linkurious/ogma";
import { Handler } from "./Handler";
import { Snap, Snapping } from "./snapping";
import { Links } from "../links";
import { Arrow } from "../types";
import { Store } from "../store";
import { handleDetectionThreshold } from "../constants";

enum HandleType {
  START = "start",
  END = "end"
}

type Handle = {
  type: HandleType;
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
    const annotation = this.getAnnotation()!;
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
        type: HandleType.START,
        point: { x: startPoint[0], y: startPoint[1] }
      };
      this.store.setState({ hoveredHandle: 0 });
    } else if (endDistance < margin) {
      this.hoveredHandle = {
        type: HandleType.END,
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
    const annotation = this.getAnnotation()!;
    this.snap = this.snapping.snap(annotation, mousePoint);
    const point = this.snap?.point || mousePoint;

    // Create updated coordinates
    const newCoordinates = [...annotation.geometry.coordinates];
    if (handle.type === HandleType.START) {
      newCoordinates[0] = [point.x, point.y];
    } else if (handle.type === HandleType.END) {
      newCoordinates[1] = [point.x, point.y];
    }

    // Apply live update to store instead of direct mutation
    this.store.getState().applyLiveUpdate(annotation.id, {
      id: annotation.id,
      properties: annotation.properties,
      geometry: {
        type: annotation.geometry.type,
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
    this.store.getState().startLiveUpdate([this.annotation]);
  }

  protected _dragEnd() {
    if (!this.annotation) return;

    this.commitChange();

    // Handle snapping if applicable
    if (this.snap && this.hoveredHandle) {
      const handle = this.hoveredHandle;
      this.links.add(
        this.getAnnotation()!,
        handle.type,
        this.snap.id,
        this.snap.type,
        this.snap.magnet
      );
    }

    this.snap = null;
  }
}
