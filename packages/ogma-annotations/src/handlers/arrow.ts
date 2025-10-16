import Ogma, { Point } from "@linkurious/ogma";
import { Handler } from "./base";
import { Snap, Snapping } from "./snapping";
import {
  SIDE_END,
  SIDE_START,
  cursors,
  handleDetectionThreshold
} from "../constants";
import { Links } from "../links";
import { Store } from "../store";
import {
  Arrow,
  ArrowProperties,
  ClientMouseEvent,
  Id,
  Side,
  detectArrow
} from "../types";

enum HandleType {
  START = SIDE_START,
  END = SIDE_END,
  BODY = "body"
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

  protected detectHandle(evt: MouseEvent) {
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

    if (startDistance < margin)
      this.grabHandle(HandleType.START, startPoint[0], startPoint[1]);
    else if (endDistance < margin)
      this.grabHandle(HandleType.END, endPoint[0], endPoint[1]);
    else {
      // on the line?
      if (detectArrow(annotation, mousePoint, margin)) {
        this.setCursor(cursors.grab);
        this.hoveredHandle = {
          type: HandleType.BODY,
          point: mousePoint
        };
        this.store.setState({ hoveredHandle: 2 });
      } else {
        this.store.setState({ hoveredHandle: -1 });
        this.hoveredHandle = undefined;
      }
    }
  }

  private grabHandle(type: HandleType, x: number, y: number) {
    this.hoveredHandle = { type, point: { x, y } };
    this.store.setState({ hoveredHandle: type === HandleType.START ? 0 : 1 });
    this.setCursor(cursors.move);
  }

  protected onDrag(evt: MouseEvent) {
    if (!(this.dragStartPoint || !this.hoveredHandle) || !this.isActive())
      return;

    evt.stopPropagation();
    evt.stopImmediatePropagation();

    const mousePoint = this.clientToCanvas(evt);
    const handle = this.hoveredHandle!;
    const annotation = this.getAnnotation()!;
    this.snap = this.snapping.snap(annotation, mousePoint);
    const point = this.snap?.point || mousePoint;
    const link = annotation.properties.link || {};

    // Create updated coordinates
    const newCoordinates = [...annotation.geometry.coordinates];
    if (handle.type === HandleType.START) {
      newCoordinates[0] = [point.x, point.y];
      if (this.snap) {
        link.start = {
          side: handle.type,
          id: this.snap.id,
          type: this.snap.type,
          magnet: this.snap.magnet
        };
      }
    } else if (handle.type === HandleType.END) {
      newCoordinates[1] = [point.x, point.y];
      if (this.snap) {
        link.end = {
          side: handle.type,
          id: this.snap.id,
          type: this.snap.type,
          magnet: this.snap.magnet
        };
      }
    } else if (handle.type === HandleType.BODY) {
      // translate both points
      const dx = point.x - handle.point.x;
      const dy = point.y - handle.point.y;
      const start = annotation.geometry.coordinates[0];
      const end = annotation.geometry.coordinates[1];
      newCoordinates[0] = [start[0] + dx, start[1] + dy];
      newCoordinates[1] = [end[0] + dx, end[1] + dy];
    }

    // Apply live update to store instead of direct mutation
    this.store.getState().applyLiveUpdate(annotation.id, {
      id: annotation.id,
      properties: { ...annotation.properties, link } as ArrowProperties,
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
  protected onDragStart(evt: ClientMouseEvent) {
    if (!super.onDragStart(evt)) return false;
    // Start live update tracking for this annotation
    this.store.getState().startLiveUpdate([this.annotation!]);
    return true;
  }

  protected onDragEnd(evt: ClientMouseEvent) {
    if (!super.onDragEnd(evt)) return false;

    // Handle snapping if applicable
    if (this.snap && this.hoveredHandle) {
      const handle = this.hoveredHandle;
      if (handle.type !== HandleType.BODY)
        this.links.add(
          this.getAnnotation()!,
          handle.type,
          this.snap.id,
          this.snap.type,
          this.snap.magnet
        );
    } else if (this.snap === null && this.hoveredHandle) {
      const annotation = this.getAnnotation()!;
      const side = this.hoveredHandle.type as Side;
      if (annotation.properties.link && annotation.properties.link[side]) {
        this.links.remove(annotation, side);
        this.store.getState().applyLiveUpdate(annotation.id, {
          properties: {
            ...annotation.properties,
            link: { [side]: undefined }
          }
        });
      }
    }
    this.commitChange();
    this.clearDragState();

    this.snap = null;
    return true;
  }

  public startDrawing(id: Id, clientX: number, clientY: number) {
    const { x, y } = this.clientToCanvas({ clientX, clientY } as MouseEvent);
    this.grabHandle(HandleType.END, x, y);
    this.dragging = true;
    this.dragStartPoint = { x, y };

    // Start live update
    this.onDragStart({ clientX, clientY } as MouseEvent);

    // Disable ogma panning
    this.ogmaPanningOption = Boolean(
      this.ogma.getOptions().interactions?.pan?.enabled
    );
    this.ogma.setOptions({
      interactions: { pan: { enabled: false } }
    });
  }
}
