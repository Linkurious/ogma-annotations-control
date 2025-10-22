import Ogma, { Point } from "@linkurious/ogma";
import { Handler } from "./base";
import {
  cursors,
  EVT_DRAG,
  EVT_COMPLETE_DRAWING,
  handleDetectionThreshold,
  EVT_DRAG_START
} from "../constants";
import { Links } from "../links";
import { Store } from "../store";
import { ClientMouseEvent, Id, Polygon } from "../types";
import { detectPolygon } from "../types/features/Polygon";
import { updateBbox } from "../utils";
import {
  simplifyPolygon,
  translatePolygon,
  updatePolygonBbox
} from "../utils/polygon";

enum HandleType {
  VERTEX = "vertex",
  BODY = "body"
}

type Handle = {
  type: HandleType;
  point: Point;
  vertexIndex?: number; // For vertex handles
};

export class PolygonHandler extends Handler<Polygon, Handle> {
  private links: Links;
  private isDrawingMode = false;
  private simplificationTolerance = 5; // Graph units

  constructor(ogma: Ogma, store: Store, links: Links) {
    super(ogma, store);
    this.links = links;
  }

  /**
   * Start drawing a polygon (freehand mode)
   */
  public startDrawing(id: Id, x: number, y: number): this {
    this.annotation = id;
    this.isDrawingMode = true;
    // Start live update tracking
    this.store.getState().startLiveUpdate([id]);

    const pos = this.ogma.view.graphToScreenCoordinates({ x, y });
    this.dragStartPoint = pos;
    // Disable ogma panning
    this.disablePanning();

    // Start live update
    this.onDragStart({ clientX: pos.x, clientY: pos.y } as MouseEvent);
    return this;
  }

  /**
   * Cancel drawing mode
   */
  public cancelDrawing(): void {
    if (this.isDrawingMode) {
      this.isDrawingMode = false;
      if (this.annotation) {
        this.store.getState().removeFeature(this.annotation);
        this.annotation = null;
      }
    }
    this.restorePanning();
  }

  protected detectHandle(evt: MouseEvent, zoom: number = 1) {
    const polygon = this.getAnnotation();
    if (!polygon) return;
    const mousePoint = this.clientToCanvas(evt);
    const margin = handleDetectionThreshold / zoom;

    const coords = polygon.geometry.coordinates[0];

    // Check for vertex handles (don't check the last point as it's the same as first)
    for (let i = 0; i < coords.length - 1; i++) {
      const [vx, vy] = coords[i];
      const distance = Math.sqrt(
        Math.pow(mousePoint.x - vx, 2) + Math.pow(mousePoint.y - vy, 2)
      );

      if (distance < margin * 2) {
        // Larger hit area for vertices
        this.grabHandle(HandleType.VERTEX, vx, vy, i);
        return;
      }
    }

    // Check if inside polygon body
    if (detectPolygon(polygon, mousePoint, margin)) {
      this.setCursor(cursors.grab);
      this.hoveredHandle = {
        type: HandleType.BODY,
        point: mousePoint
      };
      this.store.setState({ hoveredHandle: 0 });
    } else {
      this.store.setState({ hoveredHandle: -1 });
      this.hoveredHandle = undefined;
    }
  }

  private grabHandle(
    type: HandleType,
    x: number,
    y: number,
    vertexIndex?: number
  ) {
    this.setCursor(type === HandleType.VERTEX ? cursors.pointer : cursors.grab);
    this.hoveredHandle = {
      type,
      point: { x, y },
      vertexIndex
    };
    this.store.setState({ hoveredHandle: vertexIndex ?? 0 });
  }

  handleMouseDown = (evt: MouseEvent): void => {
    console.log("Mouse down on polygon handler", this.isDrawingMode);
    if (!this.isActive() || this.dragging || !this.hoveredHandle) return;

    evt.preventDefault();
    evt.stopPropagation();

    // start resizing

    this.dragStartPoint = this.clientToCanvas(evt);
    this.onDragStart(evt);
    this.dispatchEvent(new Event(EVT_DRAG_START));
    this.disablePanning();
  };

  protected onDragStart(evt: ClientMouseEvent): boolean {
    // If in drawing mode, start collecting points
    if (this.isDrawingMode) {
      const point = this.clientToCanvas(evt);
      this.dragging = true;
      // Add the first point to the polygon geometry
      const polygon = this.getAnnotation();
      if (polygon) {
        const newCoords: [number, number][] = [
          [point.x, point.y],
          [point.x, point.y]
        ]; // Closed with duplicate
        this.store.getState().applyLiveUpdate(polygon.id, {
          ...polygon,
          geometry: {
            type: "Polygon",
            coordinates: [newCoords],
            bbox: [point.x, point.y, point.x, point.y]
          }
        });
      }

      this.dragStartPoint = point;
      return true;
    }

    // Normal manipulation mode
    if (!this.hoveredHandle) return false;
    this.dragging = true;
    this.setCursor(cursors.grabbing);
    // Start live update for manipulation
    this.store.getState().startLiveUpdate([this.annotation!]);
    return true;
  }

  protected onDrag(evt: ClientMouseEvent): void {
    // If in drawing mode, collect points
    if (this.isDrawingMode && this.dragging) {
      const point = this.clientToCanvas(evt);
      const state = this.store.getState();

      // Get the live-updated version of the polygon (accumulated points)
      const basePolygon = this.getAnnotation();
      if (!basePolygon) return;

      const liveUpdate = state.liveUpdates[this.annotation!];
      const polygon = liveUpdate
        ? ({ ...basePolygon, ...liveUpdate } as Polygon)
        : basePolygon;

      // Get existing points (excluding the closing point) and add new one
      const currentCoords = polygon.geometry.coordinates[0];
      const existingPoints = currentCoords.slice(0, -1);
      const newPoints = [
        ...existingPoints,
        [point.x, point.y] as [number, number]
      ];
      const closedPoints = [...newPoints, newPoints[0]]; // Close the polygon

      // Calculate bbox
      const xs = newPoints.map((p) => p[0]);
      const ys = newPoints.map((p) => p[1]);
      const bbox: [number, number, number, number] = [
        Math.min(...xs),
        Math.min(...ys),
        Math.max(...xs),
        Math.max(...ys)
      ];

      // Update preview with accumulated points
      state.applyLiveUpdate(this.annotation!, {
        ...polygon,
        geometry: {
          type: "Polygon",
          coordinates: [closedPoints],
          bbox
        }
      });
      return;
    }

    // Normal manipulation mode
    if (!this.dragging || !this.dragStartPoint || !this.hoveredHandle) return;

    const currentPoint = this.clientToCanvas(evt);
    const dx = currentPoint.x - this.dragStartPoint.x;
    const dy = currentPoint.y - this.dragStartPoint.y;

    const polygon = this.getAnnotation();
    if (!polygon) return;

    if (this.hoveredHandle.type === HandleType.BODY) {
      // Move entire polygon
      const translatedPolygon = translatePolygon(polygon, dx, dy);

      // Apply live update
      this.store.getState().applyLiveUpdate(polygon.id, translatedPolygon);

      // Update linked arrows
      this.links.updateLinkedArrowsDuringDrag(polygon.id, { x: dx, y: dy });
    } else if (
      this.hoveredHandle.type === HandleType.VERTEX &&
      this.hoveredHandle.vertexIndex !== undefined
    ) {
      // Move specific vertex
      const newCoords = polygon.geometry.coordinates[0].map((coord, i) => {
        if (i === this.hoveredHandle!.vertexIndex) {
          return [
            this.hoveredHandle!.point.x + dx,
            this.hoveredHandle!.point.y + dy
          ] as [number, number];
        }
        // Also update closing point if it matches
        if (
          i === polygon.geometry.coordinates[0].length - 1 &&
          this.hoveredHandle!.vertexIndex === 0
        ) {
          return [
            this.hoveredHandle!.point.x + dx,
            this.hoveredHandle!.point.y + dy
          ] as [number, number];
        }
        return coord;
      });

      const updatedPolygon: Polygon = {
        ...polygon,
        geometry: {
          ...polygon.geometry,
          coordinates: [newCoords]
        }
      };

      updatePolygonBbox(updatedPolygon);

      // Apply live update
      this.store.getState().applyLiveUpdate(polygon.id, updatedPolygon);
    }

    this.dispatchEvent(new Event(EVT_DRAG));
  }

  protected onDragEnd(): boolean {
    // If in drawing mode, finish drawing
    if (this.isDrawingMode && this.dragging) {
      const state = this.store.getState();
      const polygon = this.getAnnotation();
      if (polygon) {
        // Get the points from the geometry (excluding the closing point)

        const liveUpdate = state.liveUpdates[this.annotation!];
        const points = liveUpdate.geometry?.coordinates[0] as [
          number,
          number
        ][];

        // Not enough points, cancel
        if (points.length < 3) this.cancelDrawing();
        else {
          // Apply path simplification (cast to correct type)
          const simplifiedPoints = simplifyPolygon(
            points,
            this.simplificationTolerance,
            true
          );

          // Ensure closed
          const closedPoints = [...simplifiedPoints, simplifiedPoints[0]];

          // Create final polygon
          const finalPolygon: Polygon = {
            ...polygon,
            geometry: {
              type: "Polygon",
              coordinates: [closedPoints]
            }
          };
          updateBbox(finalPolygon);

          this.store.getState().applyLiveUpdate(polygon.id, finalPolygon);
          // Update and commit
          this.commitChange();
          this.store.setState({ drawingFeature: null });

          // Clean up drawing mode
          this.isDrawingMode = false;
          this.dragging = false;
          this.restorePanning();

          // Dispatch complete event
          this.dispatchEvent(
            new CustomEvent(EVT_COMPLETE_DRAWING, { detail: finalPolygon })
          );
        }
      }
      return true;
    }

    // Normal manipulation mode
    if (!this.dragging) return false;
    this.dragging = false;
    this.dragStartPoint = undefined;

    const polygon = this.getAnnotation();
    if (!polygon) return false;

    // Commit live updates
    this.commitChange();

    this.setCursor(cursors.grab);
    return true;
  }

  public getAnnotation(): Polygon | undefined {
    if (!this.annotation) return undefined;
    return this.store.getState().getFeature(this.annotation) as Polygon;
  }
}
