import { Ogma } from "@linkurious/ogma";
import { ArrowHandler } from "./arrow";
import { Handler } from "./base";
import { Links } from "./links";
import { Snapping } from "./snapping";
import { SIDE_END, SIDE_START, TARGET_TYPES } from "../constants";
import { Store } from "../store";
import { Comment, Id, ArrowProperties, isArrow } from "../types";
import { Arrow, createArrow, defaultArrowStyle } from "../types/features/Arrow";

/**
 * Meta-handler for drawing comments with arrows
 *
 * Drawing flow:
 * 1. Create arrow and delegate drawing to ArrowHandler
 * 2. ArrowHandler handles all mouse events, snapping, dragging
 * 3. On arrow completion: create comment and link to arrow
 * 4. Focus comment for text editing
 */
export class CommentDrawingHandler extends Handler<Comment, never> {
  private links: Links;
  private snapping: Snapping;
  private arrowHandler: ArrowHandler;
  private arrowStyle?: Partial<ArrowProperties>;
  private offsetX: number;
  private offsetY: number;
  private comment: Comment;
  private startX: number = 0;
  private startY: number = 0;

  constructor(
    ogma: Ogma,
    store: Store,
    links: Links,
    snapping: Snapping,
    arrowHandler: ArrowHandler,
    comment: Comment,
    options?: {
      offsetX?: number;
      offsetY?: number;
      arrowStyle?: Partial<ArrowProperties>;
    }
  ) {
    super(ogma, store);
    this.links = links;
    this.arrowHandler = arrowHandler;
    this.snapping = snapping;
    this.offsetX = options?.offsetX ?? 100;
    this.offsetY = options?.offsetY ?? -50;
    this.arrowStyle = options?.arrowStyle;
    this.comment = comment;
  }

  protected detectHandle(_evt: MouseEvent, _zoom: number): void {
    // No handle detection - ArrowHandler handles this
  }

  public startDrawing(_id: Id, x: number, y: number): void {
    this.startX = x;
    this.startY = y;

    // Create arrow with the desired style
    const arrow = createArrow(x, y, x, y, {
      ...defaultArrowStyle,
      head: "arrow",
      ...this.arrowStyle?.style
    });

    // Add arrow to store
    this.store.getState().addFeature(arrow);
    this.store.setState({ drawingFeature: arrow.id });

    // Listen for arrow completion
    this.arrowHandler.addEventListener("dragend", this.onArrowComplete);

    // Activate ArrowHandler by selecting the arrow
    this.store.getState().setSelectedFeatures([arrow.id]);

    // Start arrow drawing - ArrowHandler takes over
    const pos = this.ogma.view.graphToScreenCoordinates({ x, y });
    this.arrowHandler.startDrawing(arrow.id, pos.x, pos.y);
  }

  private snapArrowStart(arrow: Arrow, x: number, y: number) {
    const snap = this.snapping.snap({ x, y });
    if (snap) {
      arrow.geometry.coordinates[0] = [snap.point.x, snap.point.y];
      arrow.properties.link = {
        start: {
          side: SIDE_START,
          id: snap.id,
          type: snap.type,
          magnet: snap.magnet
        }
      };
      this.links.add(arrow, SIDE_START, snap.id, snap.type, snap.magnet);
    }
  }

  private onArrowComplete = () => {
    // Remove listener
    this.arrowHandler.removeEventListener("dragend", this.onArrowComplete);

    const state = this.store.getState();

    // Get the completed arrow
    const selectedIds = Array.from(state.selectedFeatures);
    if (selectedIds.length === 0) return;

    const arrow = state.getFeature(selectedIds[0]);
    if (!arrow || !isArrow(arrow)) return;

    // Get arrow endpoints
    const arrowStart = arrow.geometry.coordinates[0];
    const arrowEnd = arrow.geometry.coordinates[1];

    // Calculate drag distance to determine click vs drag
    const dx = arrowEnd[0] - this.startX;
    const dy = arrowEnd[1] - this.startY;
    const dragDistance = Math.sqrt(dx * dx + dy * dy);

    let commentX: number;
    let commentY: number;

    if (dragDistance < 5) {
      // Case 1: Click (small distance) - apply offset from start point
      commentX = this.startX + this.offsetX;
      commentY = this.startY + this.offsetY;
    } else {
      // Case 2: Drag - create comment at arrow end (where user released mouse)
      commentX = arrowEnd[0];
      commentY = arrowEnd[1];
    }

    // Position and add the comment
    const comment = this.comment;
    comment.geometry.coordinates = [commentX, commentY];
    state.addFeature(comment);

    this.store.setState({ drawingFeature: comment.id });

    // Calculate arrow start point at comment edge (bottom center)
    const commentHeight = comment.properties.height;
    const arrowFromCommentX = commentX;
    const arrowFromCommentY = commentY + commentHeight * 0.5;

    this.snapArrowStart(arrow, arrowStart[0], arrowStart[1]);
    const existingStartLink = arrow.properties.link?.start;

    // Update arrow to connect from comment edge to the original click point
    state.updateFeature(arrow.id, {
      ...arrow,
      geometry: {
        ...arrow.geometry,
        coordinates: [
          [arrowFromCommentX, arrowFromCommentY], // Start: comment bottom edge
          arrowStart // End: original mousedown point (with any snapping from ArrowHandler)
        ]
      },
      properties: {
        ...arrow.properties,
        link: {
          start: {
            side: SIDE_START,
            id: comment.id,
            type: TARGET_TYPES.COMMENT,
            magnet: { x: 0, y: 0.5 }
          },
          // If ArrowHandler snapped to something at the original start point,
          // that becomes the end point now
          end: existingStartLink
            ? {
                side: SIDE_END,
                id: existingStartLink.id,
                type: existingStartLink.type,
                magnet: existingStartLink.magnet
              }
            : undefined
        }
      }
    });

    // Set up links
    // Link arrow start to comment
    this.links.add(arrow, SIDE_START, comment.id, TARGET_TYPES.COMMENT, {
      x: 0,
      y: 0.5
    });

    // If there was a link at the original arrow start, it's now at the end
    if (existingStartLink && existingStartLink.magnet) {
      this.links.add(
        arrow,
        SIDE_END,
        existingStartLink.id,
        existingStartLink.type,
        existingStartLink.magnet
      );
    }

    // Select the comment for editing
    state.setSelectedFeatures([comment.id]);

    // Clear drawing state
    this.store.setState({ drawingFeature: null });
  };
}
