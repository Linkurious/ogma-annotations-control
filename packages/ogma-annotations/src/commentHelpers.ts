import { AnnotationState } from "./store";
import {
  Arrow,
  Comment,
  Id,
  ArrowProperties,
  CommentProps,
  isArrow,
  isComment,
  createComment,
  ExportedLink,
  TargetType
} from "./types";
import { createArrow, defaultArrowStyle } from "./types/features/Arrow";
import { Point } from "./types/geometry";
import { getBbox } from "./utils";

/**
 * Target types for comment arrows
 */
export type CommentTarget =
  | { type: "coordinate"; coordinate: Point }
  | { type: "node"; id: Id; magnet?: Point }
  | { type: "annotation"; id: Id; magnet?: Point };

/**
 * Default arrow style for comment arrows
 */
export const defaultCommentArrowStyle: Partial<ArrowProperties> = {
  style: {
    ...defaultArrowStyle,
    strokeColor: "#666",
    strokeWidth: 2,
    strokeType: "plain",
    head: "arrow", // Arrow points TO the comment
    tail: "none"
  }
};

/**
 * Stateless helper functions for managing comment-arrow lifecycle and relationships
 *
 * Key responsibilities:
 * - Ensure comments always have at least one arrow pointing TO them
 * - Prevent deletion of the last arrow on a comment
 * - Provide query methods for finding comment arrows
 * - Handle atomic creation and deletion of comments with their arrows
 */

/**
 * Find all arrows that originate FROM a comment
 * Searches for arrows where link.start.id === commentId
 *
 * @param state - Annotation state
 * @param commentId - ID of the comment
 * @returns Array of arrows originating from the comment
 */
export function getCommentArrows(
  state: AnnotationState,
  commentId: Id
): Arrow[] {
  const features = state.features;
  const arrows: Arrow[] = [];

  Object.values(features).forEach((feature) => {
    if (isArrow(feature)) {
      const arrow = feature as Arrow;
      // Check if arrow points FROM the comment (start)
      if (arrow.properties.link?.start?.id === commentId) {
        arrows.push(arrow);
      }
    }
  });

  return arrows;
}

/**
 * Get the primary arrow (first one created, or use as default)
 *
 * @param state - Annotation state
 * @param commentId - ID of the comment
 * @returns Primary arrow or null if no arrows exist
 */
export function getPrimaryCommentArrow(
  state: AnnotationState,
  commentId: Id
): Arrow | null {
  const arrows = getCommentArrows(state, commentId);
  return arrows[0] || null;
}

/**
 * Create comment + arrow atomically
 * Ensures arrow always points FROM the comment TO the target
 *
 * @param state - Annotation state
 * @param x - X position for the comment box
 * @param y - Y position for the comment box
 * @param content - Text content
 * @param target - Target (coordinate, node, or annotation) where arrow points TO
 * @param options - Optional styling for comment and arrow
 * @returns Object with comment and arrow features
 */
export function createCommentWithArrow(
  state: AnnotationState,
  x: number,
  y: number,
  content: string,
  target: CommentTarget,
  options?: {
    commentStyle?: Partial<CommentProps>;
    arrowStyle?: Partial<ArrowProperties>;
  }
): { comment: Comment; arrow: Arrow } {
  // Create comment
  const comment = createComment(x, y, content, options?.commentStyle);

  // Determine arrow start point (FROM comment, with magnet offset)
  // Arrow points FROM comment, so comment is at the START
  const startMagnet = { x: 0, y: 0.5 }; // Bottom center of comment box
  const startPoint: Point = {
    x: x,
    y: y + startMagnet.y * (options?.commentStyle?.height || 60)
  };

  // Determine arrow end point (TO target)
  const endPoint = getTargetPosition(state, target);

  // Create arrow pointing FROM comment TO target
  const arrow = createArrow(
    startPoint.x,
    startPoint.y,
    endPoint.x,
    endPoint.y,
    {
      ...defaultCommentArrowStyle.style,
      ...options?.arrowStyle?.style
    }
  );

  // Set up link properties
  arrow.properties.link = {
    start: {
      id: comment.id,
      side: "start",
      type: "comment",
      magnet: startMagnet
    },
    end: createTargetLink(state, target, "end")
  };

  return { comment, arrow };
}

/**
 * Add an additional arrow to an existing comment
 * Arrow points FROM comment TO target
 *
 * @param state - Annotation state
 * @param commentId - ID of the comment
 * @param target - Target (coordinate, node, or annotation) where arrow points TO
 * @param arrowStyle - Optional arrow styling
 * @returns New arrow feature
 */
export function addArrowToComment(
  state: AnnotationState,
  commentId: Id,
  target: CommentTarget,
  arrowStyle?: Partial<ArrowProperties>
): Arrow {
  const comment = state.getFeature(commentId)!;

  if (!isComment(comment)) {
    throw new Error(`Feature ${commentId} is not a comment`);
  }

  const commentX = comment.geometry.coordinates[0];
  const commentY = comment.geometry.coordinates[1];

  // Determine arrow start point (FROM comment, with magnet offset)
  const startMagnet = { x: 0, y: 0.5 }; // Bottom center of comment box
  const startPoint: Point = {
    x: commentX,
    y: commentY + startMagnet.y * comment.properties.height
  };

  // Determine arrow end point (TO target)
  const endPoint = getTargetPosition(state, target);

  // Create arrow
  const arrow = createArrow(
    startPoint.x,
    startPoint.y,
    endPoint.x,
    endPoint.y,
    {
      ...defaultCommentArrowStyle.style,
      ...arrowStyle?.style
    }
  );

  // Set up link properties
  arrow.properties.link = {
    start: {
      id: commentId,
      side: "start",
      type: "comment",
      magnet: startMagnet
    },
    end: createTargetLink(state, target, "end")
  };

  return arrow;
}

/**
 * Delete a single arrow from a comment
 * Prevents deletion if it's the last arrow
 *
 * @param state - Annotation state
 * @param arrowId - ID of the arrow to delete
 * @returns True if deletion was successful, false if prevented
 */
export function deleteArrowFromComment(
  state: AnnotationState,
  arrowId: Id
): boolean {
  const arrow = state.getFeature(arrowId)!;

  if (!isArrow(arrow)) return false;

  // Check if arrow originates FROM a comment (start side)
  const commentId =
    arrow.properties.link?.start?.type === "comment"
      ? arrow.properties.link.start.id
      : null;

  if (!commentId) {
    // Not a comment arrow, allow deletion
    return true;
  }

  // Check if this is the last arrow
  const arrows = getCommentArrows(state, commentId);
  if (arrows.length <= 1) {
    // eslint-disable-next-line no-console
    console.warn("Cannot delete last arrow attached to comment");
    return false;
  }

  // Safe to delete
  state.removeFeature(arrowId);
  return true;
}

/**
 * Delete comment and ALL its arrows together
 *
 * @param state - Annotation state
 * @param commentId - ID of the comment
 */
export function deleteCommentWithArrows(
  state: AnnotationState,
  commentId: Id
): void {
  const arrows = getCommentArrows(state, commentId);

  // Use batch update for atomic operation
  state.batchUpdate(() => {
    // Delete all arrows first
    arrows.forEach((arrow) => {
      state.removeFeature(arrow.id);
    });

    // Then delete comment
    state.removeFeature(commentId);
  });
}

/**
 * Validate that comment has at least one arrow pointing to it
 *
 * @param state - Annotation state
 * @param commentId - ID of the comment
 * @returns True if comment has at least one arrow
 */
export function validateComment(
  state: AnnotationState,
  commentId: Id
): boolean {
  const arrows = getCommentArrows(state, commentId);
  return arrows.length > 0;
}

/**
 * Check if an arrow can be safely deleted
 * Returns false if it's the last arrow on a comment
 *
 * @param state - Annotation state
 * @param arrowId - ID of the arrow
 * @returns True if arrow can be deleted
 */
export function canDeleteArrow(state: AnnotationState, arrowId: Id): boolean {
  const arrow = state.getFeature(arrowId)!;

  if (!isArrow(arrow)) return false;

  const commentId =
    arrow.properties.link?.start?.type === "comment"
      ? arrow.properties.link.start.id
      : null;

  if (!commentId) {
    return true; // Not attached to comment, can delete
  }

  const arrows = getCommentArrows(state, commentId);
  return arrows.length > 1; // Can delete if not the last one
}

/**
 * Get all comments (useful for validation)
 *
 * @param state - Annotation state
 * @returns Array of all comment features
 */
export function getAllComments(state: AnnotationState): Comment[] {
  return Object.values(state.features).filter(isComment) as Comment[];
}

/**
 * Check for orphaned comments (without any arrows)
 *
 * @param state - Annotation state
 * @returns Array of comments without arrows
 */
export function findOrphanedComments(state: AnnotationState): Comment[] {
  return getAllComments(state).filter(
    (comment) => getCommentArrows(state, comment.id).length === 0
  );
}

/**
 * Check if arrow start point can be detached from source
 * Returns false for arrows originating FROM comments
 * Accepts an arrow directly instead of looking it up by ID
 *
 * @param arrow - The arrow feature
 * @returns True if arrow start can be detached
 */
export function canDetachArrowStart(arrow: Arrow): boolean {
  // Cannot detach if START points FROM a comment
  return arrow.properties.link?.start?.type !== "comment";
}

/**
 * Check if arrow endpoint can be detached from target
 * Always returns true for comment arrows since end points can be retargeted
 * Accepts an arrow directly instead of looking it up by ID
 *
 * @param _arrow - The arrow feature (unused, kept for API consistency)
 * @returns True if arrow end can be detached
 */
export function canDetachArrowEnd(_arrow: Arrow): boolean {
  // For comment arrows (start is comment), the end can be freely retargeted
  // For non-comment arrows, can always detach
  return true;
}

/**
 * Get the position of a target (coordinate, node, or annotation)
 *
 * @param state - Annotation state
 * @param target - Target object
 * @returns Position point
 */
function getTargetPosition(
  state: AnnotationState,
  target: CommentTarget
): Point {
  if (target.type === "coordinate") {
    return target.coordinate;
  } else if (target.type === "node") {
    // For now, return a placeholder - this will be updated by the Links system
    return { x: 0, y: 0 };
  } else if (target.type === "annotation") {
    const annotation = state.getFeature(target.id);
    if (!annotation) {
      throw new Error(`Annotation ${target.id} not found`);
    }
    // Get center of annotation
    if (annotation.geometry.type === "Point") {
      return {
        x: annotation.geometry.coordinates[0],
        y: annotation.geometry.coordinates[1]
      };
    }
    // For polygons, use bbox center
    const bbox = getBbox(annotation);
    return {
      x: (bbox[0] + bbox[2]) / 2,
      y: (bbox[1] + bbox[3]) / 2
    };
  }
  throw new Error("Invalid target type");
}

/**
 * Create a link object for a target
 *
 * @param state - Annotation state
 * @param target - Target object
 * @param side - Side of the link ("start" or "end")
 * @returns ExportedLink object
 */
function createTargetLink(
  state: AnnotationState,
  target: CommentTarget,
  side: "start" | "end"
): ExportedLink {
  if (target.type === "coordinate") {
    // For coordinates, we don't create a link (no ID)
    // The arrow will just have fixed coordinates
    return {
      id: "coordinate" as Id,
      side,
      type: "node", // Placeholder type
      magnet: target.coordinate
    };
  }
  if (target.type === "node") {
    return {
      id: target.id,
      side,
      type: "node",
      magnet: target.magnet || { x: 0, y: 0 }
    };
  }

  const annotation = state.getFeature(target.id);
  if (!annotation) {
    throw new Error(`Annotation ${target.id} not found`);
  }
  return {
    id: target.id,
    side,
    type: annotation.properties.type as TargetType,
    magnet: target.magnet || { x: 0, y: 0 }
  };
}
