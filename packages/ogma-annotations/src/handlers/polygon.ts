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
  private simplificationTolerance = 3; // Graph units

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
    const state = this.store.getState();
    state.startLiveUpdate([id]);
    state.setDrawingPoints([]);

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
      this.store.setState({ hoveredHandle: -1 });
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
        // Closed with duplicate point
        const newCoords = [
          [point.x, point.y],
          [point.x, point.y]
        ];
        const state = this.store.getState();
        state.setDrawingPoints(newCoords);
        state.applyLiveUpdate(polygon.id, {
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
      //const currentCoords = polygon.geometry.coordinates[0];
      const currentCoords = state.drawingPoints!;
      // last point is duplicate of first
      const existingPoints = currentCoords.slice(0, -1);
      const closedPoints = [
        ...existingPoints,
        [point.x, point.y],
        existingPoints[0]
      ];

      state.setDrawingPoints(closedPoints);
      const simplifiedPoints = simplifyPolygon(
        closedPoints.slice(0, -1), // Exclude closing point
        this.simplificationTolerance,
        false
      );
      const finalPoints = [...simplifiedPoints, simplifiedPoints[0]];
      //const simplifiedPoints = closedPoints.slice(0, -1); // --- IGNORE ---

      // Ensure closed
      //const finalPoints = [...simplifiedPoints];

      // Update preview with accumulated points
      state.applyLiveUpdate(this.annotation!, {
        ...polygon,
        geometry: {
          type: "Polygon",
          coordinates: [finalPoints]
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
          ];
        }
        // Also update closing point if it matches
        if (
          i === polygon.geometry.coordinates[0].length - 1 &&
          this.hoveredHandle!.vertexIndex === 0
        ) {
          return [
            this.hoveredHandle!.point.x + dx,
            this.hoveredHandle!.point.y + dy
          ];
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

        //const liveUpdate = state.liveUpdates[this.annotation!];
        const points = state.drawingPoints!;

        // Not enough points, cancel
        if (points.length < 3) this.cancelDrawing();
        else {
          // Apply path simplification (cast to correct type)
          const simplifiedPoints = simplifyPolygon(
            points, // Exclude closing point
            this.simplificationTolerance,
            true
          );

          // Create final polygon
          const finalPolygon: Polygon = {
            ...polygon,
            geometry: {
              type: "Polygon",
              coordinates: [simplifiedPoints]
            }
          };
          updateBbox(finalPolygon);

          this.store.getState().applyLiveUpdate(polygon.id, finalPolygon);
          // Clear drawing flag BEFORE committing so the commit creates a history entry
          this.store.setState({ drawingFeature: null });
          // Update and commit
          this.commitChange();

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
