import { TARGET_TYPES } from "../constants";
import { Arrow } from "../types";

/**
 * Helper functions for managing comment-arrow relationships
 *
 * These functions provide utilities for:
 * - Checking if an arrow is connected to a comment
 * - Determining if arrow endpoints can be detached from comments
 *
 * Note: The core rule "comments must have at least one arrow" is enforced
 * in store/index.ts removeFeature() method, not here.
 */

/**
 * Check if an arrow is connected to a comment
 *
 * @param arrow - The arrow feature to check
 * @returns True if the arrow has a comment on either end
 *
 * @example
 * ```typescript
 * if (isCommentArrow(arrow)) {
 *   // Handle comment arrow specially
 * }
 * ```
 */
export function isCommentArrow(arrow: Arrow): boolean {
  const link = arrow.properties.link;
  if (!link) return false;
  return (
    link.start?.type === TARGET_TYPES.COMMENT ||
    link.end?.type === TARGET_TYPES.COMMENT
  );
}

/**
 * Check if arrow start point can be detached from its source
 *
 * Returns false for arrows originating FROM comments, since comment arrows
 * must always remain attached to the comment on their start side.
 *
 * @param arrow - The arrow feature
 * @returns True if arrow start can be detached
 *
 * @example
 * ```typescript
 * if (canDetachArrowStart(arrow)) {
 *   // Allow user to drag arrow start point
 * } else {
 *   // Keep arrow start locked to comment
 * }
 * ```
 */
export function canDetachArrowStart(arrow: Arrow): boolean {
  // Cannot detach if START points FROM a comment
  return arrow.properties.link?.start?.type !== TARGET_TYPES.COMMENT;
}

/**
 * Check if arrow endpoint can be detached from its target
 *
 * Always returns true since arrow endpoints can be freely retargeted,
 * even for comment arrows. The comment is typically on the start side.
 *
 * @param _arrow - The arrow feature (unused, kept for API consistency)
 * @returns Always true - arrow ends can be detached
 *
 * @example
 * ```typescript
 * if (canDetachArrowEnd(arrow)) {
 *   // Allow user to drag arrow end point
 * }
 * ```
 */
export function canDetachArrowEnd(_arrow: Arrow): boolean {
  // For comment arrows (start is comment), the end can be freely retargeted
  // For non-comment arrows, can always detach
  return true;
}
