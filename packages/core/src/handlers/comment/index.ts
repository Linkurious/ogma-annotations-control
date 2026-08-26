import { Ogma } from "@linkurious/ogma";
import { ArrowHandler } from "../arrow";
import { Handler } from "../base";
import { Links } from "../links";
import { Snapping } from "../snapping";
import { SIDE_END, SIDE_START, TARGET_TYPES } from "../../constants";
import { Store } from "../../store";
import { Comment, Id, ArrowProperties, isArrow } from "../../types";
import { Arrow, createArrow, defaultArrowStyle } from "../../types/features/Arrow";

// Below this distance (in graph units) between the drag's start and end
// point, treat the gesture as a click rather than a drag.
const CLICK_VS_DRAG_THRESHOLD = 5;

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
    this.arrowHandler.startDrawing(arrow.id, x, y);
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

    if (dragDistance < CLICK_VS_DRAG_THRESHOLD) {
      // Case 1: Click (small distance) - apply offset from start point
      commentX = this.startX + this.offsetX;
      commentY = this.startY + this.offsetY;
    } else {
      // Case 2: Drag - create comment at arrow end (where user released mouse)
      commentX = arrowEnd[0];
      commentY = arrowEnd[1];
    }

    // Position the comment (not yet added to the store - see below).
    const comment = this.comment;
    comment.geometry.coordinates = [commentX, commentY];

    // Calculate arrow start point at comment edge (bottom center)
    // Comments have fixedSize: true, so pixel dimensions need to be
    // converted to graph space by dividing by zoom
    const commentHeight = comment.properties.height;
    const zoom = state.zoom;
    const graphHeight = commentHeight / zoom;
    const arrowFromCommentX = commentX;
    const arrowFromCommentY = commentY + graphHeight * 0.5;

    this.snapArrowStart(arrow, arrowStart[0], arrowStart[1]);
    const existingStartLink = arrow.properties.link?.start;

    // Connect the arrow from the comment edge to the original click point.
    const updatedArrow: Arrow = {
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
    };

    // Add the comment and correct the arrow's geometry/link together, as one
    // atomic state transition (equivalent to addFeature(comment) +
    // updateFeature(arrow.id, ...) + setState({drawingFeature}), merged into
    // a single set() call) - doing those as separate calls, in that order,
    // means the comment becomes visible via its own commit (and the Shapes
    // renderer's reactive re-render) for a frame or two *before* the arrow
    // catches up to point at it, showing the connector's free end still at
    // the raw, unlinked drag-release point instead.
    this.store.setState((s) => {
      const liveUpdates = { ...s.liveUpdates };
      // Mirrors updateFeature()'s own clearing of stale liveUpdates for the
      // feature being replaced - the arrow's in-progress drag position must
      // not linger and get merged back on top of its corrected geometry.
      delete liveUpdates[arrow.id];
      return {
        features: {
          ...s.features,
          [comment.id]: comment,
          [arrow.id]: updatedArrow
        },
        liveUpdates,
        drawingFeature: comment.id
      };
    });

    // Set up links
    // Link arrow start to comment
    this.links.add(arrow, SIDE_START, comment.id, TARGET_TYPES.COMMENT, {
      x: 0,
      y: 0.5
    });

    // If there was a link at the original arrow start, it's now at the end.
    // existingStartLink.magnet is already this class's own stored format
    // (for a polygon target, the bbox-relative fraction the add() call
    // inside snapArrowStart() above just computed) - magnetSource: "stored"
    // passes it straight through instead of re-running the absolute-point
    // conversion on an already-relative value, which would corrupt it (see
    // Links.add()'s MagnetSource doc comment).
    if (existingStartLink && existingStartLink.magnet) {
      this.links.add(
        arrow,
        SIDE_END,
        existingStartLink.id,
        existingStartLink.type,
        existingStartLink.magnet,
        "stored"
      );
    }

    // Select the comment for editing
    state.setSelectedFeatures([comment.id]);

    // Clear drawing state
    this.store.setState({ drawingFeature: null });
  };
}
