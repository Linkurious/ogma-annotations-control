import Ogma from "@linkurious/ogma";
import { Handler } from "./base";
import { Snap, Snapping } from "./snapping";
import { cursors } from "../constants";
import { Links } from "../links";
import { Store } from "../store";
import {
  Comment,
  Arrow,
  Id,
  ClientMouseEvent,
  ArrowProperties
} from "../types";
import { createArrow, defaultArrowStyle } from "../types/features/Arrow";

/**
 * Handler for drawing comments with arrows
 *
 * Drawing flow:
 * 1. Mousedown: Record target point (with snapping)
 * 2. Create dummy arrow from target to cursor
 * 3. Drag: Arrow follows mouse
 * 4. Mouseup:
 *    - Small distance: Apply offset, create comment at offset from target
 *    - Large distance: Create comment at mouse position
 *    - Update arrow to connect to comment edge
 * 5. Set up links
 * 6. Focus comment for text editing
 * 7. Commit after content added
 */
export class CommentDrawingHandler extends Handler<Comment, never> {
  private snapping: Snapping;
  private links: Links;
  private targetSnap: Snap | null = null; // Snap at mousedown (target point)
  private targetPoint: { x: number; y: number } | null = null; // Target point where arrow ends
  private arrow: Arrow | null = null;
  private arrowStyle?: Partial<ArrowProperties>;
  private offsetX: number;
  private offsetY: number;
  private comment: Comment;

  constructor(
    ogma: Ogma,
    store: Store,
    snapping: Snapping,
    links: Links,
    comment: Comment,
    options?: {
      offsetX?: number;
      offsetY?: number;
      arrowStyle?: Partial<ArrowProperties>;
    }
  ) {
    super(ogma, store);
    this.snapping = snapping;
    this.links = links;
    this.offsetX = options?.offsetX ?? 100;
    this.offsetY = options?.offsetY ?? -50;
    this.arrowStyle = options?.arrowStyle;
    this.comment = comment;
  }

  protected detectHandle(_evt: MouseEvent, _zoom: number): void {
    // No handle detection during drawing
  }

  protected onDrag(evt: MouseEvent): void {
    if (
      !this.dragStartPoint ||
      !this.isActive() ||
      !this.arrow ||
      !this.targetPoint
    )
      return;

    evt.stopPropagation();
    evt.stopImmediatePropagation();

    const mousePoint = this.clientToCanvas(evt);

    // Update arrow: start follows mouse, end stays at target
    this.store.getState().applyLiveUpdate(this.arrow.id, {
      ...this.arrow,
      geometry: {
        type: "LineString",
        coordinates: [
          [mousePoint.x, mousePoint.y], // Start: follows mouse (where comment will be)
          [this.targetPoint.x, this.targetPoint.y] // End: target point (fixed)
        ]
      }
    });
  }

  protected onMouseDown(evt: ClientMouseEvent): boolean {
    if (!super.onDragStart(evt)) return false;

    const mousePoint = this.clientToCanvas(evt);

    // Step 2: Check for snap at mousedown (this is the target point)
    this.targetSnap = this.snapping.snap(mousePoint);
    this.targetPoint = this.targetSnap?.point || mousePoint;

    // Step 3: Create dummy arrow (no links yet)
    // Arrow points FROM mouse TO target
    const state = this.store.getState();
    this.arrow = createArrow(
      mousePoint.x,
      mousePoint.y,
      this.targetPoint.x,
      this.targetPoint.y,
      {
        ...defaultArrowStyle,
        head: "arrow",
        ...this.arrowStyle?.style
      }
    );
    this.annotation = this.arrow.id;

    // Store the arrow
    state.addFeature(this.arrow);

    // Start live update for arrow only (comment doesn't exist yet)
    state.startLiveUpdate([this.arrow!.id]);
    this.store.setState({ drawingFeature: this.arrow.id });

    return true;
  }

  protected onMouseUp(evt: ClientMouseEvent): boolean {
    if (!super.onDragEnd(evt) || !this.arrow || !this.targetPoint) return false;

    const mousePoint = this.clientToCanvas(evt);
    const state = this.store.getState();

    // Step 4: Calculate distance to determine click vs drag
    const dx = mousePoint.x - this.dragStartPoint!.x;
    const dy = mousePoint.y - this.dragStartPoint!.y;
    const dragDistance = Math.sqrt(dx * dx + dy * dy);

    let commentX: number;
    let commentY: number;

    if (dragDistance < 5) {
      // Case 1: Click (small distance) - apply offset from target point
      commentX = this.targetPoint.x + this.offsetX;
      commentY = this.targetPoint.y + this.offsetY;
    } else {
      // Case 2: Drag - create comment at mouse position
      commentX = mousePoint.x;
      commentY = mousePoint.y;
    }

    // Position and add the comment
    const comment = this.comment;
    comment.geometry.coordinates = [commentX, commentY];
    state.addFeature(comment);

    this.store.setState({ drawingFeature: comment.id });

    // Update comment position
    state.applyLiveUpdate(comment.id, {
      ...comment,
      geometry: {
        type: comment.geometry.type,
        coordinates: [commentX, commentY]
      }
    });

    // Calculate arrow start point at comment edge (bottom center)
    const commentHeight = comment.properties.height || 60;
    const arrowStartX = commentX;
    const arrowStartY = commentY + commentHeight * 0.5;

    // Update arrow to connect from comment edge to target
    state.applyLiveUpdate(this.arrow.id, {
      ...this.arrow,
      geometry: {
        type: "LineString",
        coordinates: [
          [arrowStartX, arrowStartY], // Start: comment bottom edge
          [this.targetPoint.x, this.targetPoint.y] // End: target point
        ]
      }
    });

    // Step 5: Set up links
    // Link arrow start to comment
    this.links.add(
      this.arrow,
      "start",
      comment.id,
      "comment",
      { x: 0, y: 0.5 } // Bottom center magnet
    );

    // Link arrow end to target (if snapped)
    if (this.targetSnap) {
      this.links.add(
        this.arrow,
        "end",
        this.targetSnap.id,
        this.targetSnap.type,
        this.targetSnap.magnet
      );
    }

    // Step 6: Commit ALL changes in a single batch (arrow + comment + links)
    // This creates a single history entry instead of multiple
    state.batchUpdate(() => {
      this.commitChange();
    });

    this.clearDragState();

    // Clean up
    this.targetSnap = null;
    this.targetPoint = null;
    this.arrow = null;

    // Step 7: Commit live updates - this creates a single history entry
    return true;
  }

  protected onClick(_evt: ClientMouseEvent): void {
    // No-op, handled in dragEnd
  }

  public startDrawing(id: Id, x: number, y: number): void {
    this.annotation = id;
    this.setCursor(cursors.crosshair);

    // Mark that we're in drawing mode (prevents creating history entry yet)
    this.store.setState({ drawingFeature: id });

    // Initialize drag tracking
    const pos = this.ogma.view.graphToScreenCoordinates({ x, y });
    this.dragStartPoint = pos;

    // Disable ogma panning
    this.disablePanning();

    // Start the drag
    this.onMouseDown({ clientX: pos.x, clientY: pos.y });
    this.ogma.events.once("mouseup", (evt) => this.onMouseUp(evt.domEvent));
  }
}
