import Ogma from "@linkurious/ogma";
import { Handler } from "./base";
import { Snap, Snapping } from "./snapping";
import { createCommentWithArrow, CommentTarget } from "../commentHelpers";
import { cursors } from "../constants";
import { Links } from "../links";
import { Store } from "../store";
import {
  Comment,
  Arrow,
  Id,
  ClientMouseEvent,
  CommentProps,
  ArrowProperties
} from "../types";

/**
 * Handler for drawing comments with arrows
 *
 * This handler manages the special drawing interaction for comments:
 * - Click: Creates comment at offset from click point
 * - Drag: Creates arrow dynamically, places comment at release point
 *
 * After drawing completes, TextHandler takes over for editing.
 */
export class CommentDrawingHandler extends Handler<Comment, never> {
  private snapping: Snapping;
  private links: Links;
  private snap: Snap | null = null;
  private arrow: Arrow | null = null;
  private commentStyle?: Partial<CommentProps>;
  private arrowStyle?: Partial<ArrowProperties>;
  private offsetX: number;
  private offsetY: number;

  constructor(
    ogma: Ogma,
    store: Store,
    snapping: Snapping,
    links: Links,
    options?: {
      offsetX?: number;
      offsetY?: number;
      commentStyle?: Partial<CommentProps>;
      arrowStyle?: Partial<ArrowProperties>;
    }
  ) {
    super(ogma, store);
    this.snapping = snapping;
    this.links = links;
    this.offsetX = options?.offsetX ?? 100;
    this.offsetY = options?.offsetY ?? -50;
    this.commentStyle = options?.commentStyle;
    this.arrowStyle = options?.arrowStyle;
  }

  protected detectHandle(_evt: MouseEvent, _zoom: number): void {
    // No handle detection during drawing
  }

  protected onDrag(evt: MouseEvent): void {
    if (!this.dragStartPoint || !this.isActive()) return;

    evt.stopPropagation();
    evt.stopImmediatePropagation();

    const mousePoint = this.clientToCanvas(evt);
    const annotation = this.getAnnotation()!;

    // Update snap
    this.snap = this.snapping.snap(mousePoint);
    const endPoint = this.snap?.point || mousePoint;

    // Update comment position to follow mouse
    this.store.getState().applyLiveUpdate(annotation.id, {
      ...annotation,
      geometry: {
        type: "Point",
        coordinates: [endPoint.x, endPoint.y]
      }
    });

    // Update arrow endpoint
    if (this.arrow) {
      this.store.getState().applyLiveUpdate(this.arrow.id, {
        ...this.arrow,
        geometry: {
          type: "LineString",
          coordinates: [
            this.arrow.geometry.coordinates[0], // Keep start point
            [endPoint.x, endPoint.y] // Update end point
          ]
        }
      });
    }
  }

  protected onDragStart(evt: ClientMouseEvent): boolean {
    if (!super.onDragStart(evt)) return false;

    const mousePoint = this.clientToCanvas(evt);
    const annotation = this.getAnnotation()!;

    // Check for snap at start point
    this.snap = this.snapping.snap(mousePoint);
    const startPoint = this.snap?.point || mousePoint;

    // Create the arrow (will be updated during drag)
    const target: CommentTarget = this.snap
      ? {
          type: this.snap.type === "node" ? "node" : "annotation",
          id: this.snap.id,
          magnet: this.snap.magnet
        }
      : {
          type: "coordinate",
          coordinate: startPoint
        };

    // Create comment + arrow
    const state = this.store.getState();
    const result = createCommentWithArrow(
      state,
      startPoint.x,
      startPoint.y,
      "", // Empty content initially
      target,
      {
        commentStyle: this.commentStyle,
        arrowStyle: this.arrowStyle
      }
    );

    this.arrow = result.arrow;

    // Store the arrow (comment is already in store as this.annotation)
    this.store.getState().addFeature(this.arrow);

    // If we have a snap, add the link
    if (this.snap) {
      this.links.add(
        this.arrow,
        "start",
        this.snap.id,
        this.snap.type,
        this.snap.magnet
      );
    }

    // Start live update for both features
    this.store.getState().startLiveUpdate([annotation.id, this.arrow.id]);

    return true;
  }

  protected onDragEnd(evt: ClientMouseEvent): boolean {
    if (!super.onDragEnd(evt)) return false;

    const mousePoint = this.clientToCanvas(evt);
    const annotation = this.getAnnotation()!;

    // Check if this was a click (minimal drag) or actual drag
    const dx = mousePoint.x - (this.dragStartPoint?.x || 0);
    const dy = mousePoint.y - (this.dragStartPoint?.y || 0);
    const dragDistance = Math.sqrt(dx * dx + dy * dy);

    if (dragDistance < 5) {
      // Click: position comment at offset
      const startPoint = this.clientToCanvas({
        clientX: this.dragStartPoint!.x,
        clientY: this.dragStartPoint!.y
      } as MouseEvent);
      const commentX = startPoint.x + this.offsetX;
      const commentY = startPoint.y + this.offsetY;

      // Update comment position
      this.store.getState().applyLiveUpdate(annotation.id, {
        ...annotation,
        geometry: {
          type: "Point",
          coordinates: [commentX, commentY]
        }
      });

      // Update arrow to point to comment
      if (this.arrow) {
        this.store.getState().applyLiveUpdate(this.arrow.id, {
          ...this.arrow,
          geometry: {
            type: "LineString",
            coordinates: [
              this.arrow.geometry.coordinates[0],
              [commentX, commentY]
            ]
          }
        });

        // Add link for arrow end (pointing to comment)
        this.links.add(
          this.arrow,
          "end",
          annotation.id,
          "comment",
          { x: 0, y: -0.5 } // Top center magnet
        );
      }
    } else {
      // Drag: comment already at mouse position, just add link
      if (this.arrow) {
        this.links.add(
          this.arrow,
          "end",
          annotation.id,
          "comment",
          { x: 0, y: -0.5 } // Top center magnet
        );
      }

      // If we ended on a snap point, update the link
      if (this.snap) {
        if (this.arrow) {
          this.links.add(
            this.arrow,
            "end",
            this.snap.id,
            this.snap.type,
            this.snap.magnet
          );
        }
      }
    }

    // Clear drawing flag BEFORE committing
    const state = this.store.getState();
    if (state.drawingFeature === annotation.id) {
      this.store.setState({ drawingFeature: null });
    }

    this.commitChange();
    this.clearDragState();

    this.snap = null;
    this.arrow = null;

    return true;
  }

  protected onClick(_evt: ClientMouseEvent): void {
    // No-op, handled in dragEnd
  }

  public startDrawing(id: Id, x: number, y: number): void {
    this.annotation = id;
    this.setCursor(cursors.crosshair);

    // Initialize drag tracking
    this.dragging = true;
    const pos = this.ogma.view.graphToScreenCoordinates({ x, y });
    this.dragStartPoint = pos;

    // Disable ogma panning
    this.disablePanning();

    // Start the drag
    this.onDragStart({ clientX: pos.x, clientY: pos.y } as MouseEvent);
  }
}
