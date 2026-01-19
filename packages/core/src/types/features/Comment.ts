import { Size } from "@linkurious/ogma";
import { Point as GeoJSONPoint, Geometry } from "geojson";
import { nanoid as getId } from "nanoid";
import { AnnotationFeature, AnnotationProps } from "./Annotation";
import type { Arrow, ArrowStyles, Extremity } from "./Arrow";
import { createArrow, defaultArrowStyle } from "./Arrow";
import { Text, TextStyle, detectText } from "./Text";
import {
  COMMENT_MODE_COLLAPSED,
  COMMENT_MODE_EXPANDED,
  SIDE_START
} from "../../constants";
import { Color } from "../colors";
import { Point } from "../geometry";

/**
 * Style configuration for Comment annotations
 */
export interface CommentStyle extends TextStyle {
  // Icon styling (collapsed mode)
  /** Background color for collapsed icon (default: "#FFD700") */
  iconColor?: Color;
  /** Icon to display when collapsed (default: "💬") */
  iconSymbol?: string;
  /** Border color for collapsed icon */
  iconBorderColor?: Color;
  /** Border width for collapsed icon */
  iconBorderWidth?: number;

  // Size properties
  /** Minimum height (default: 60px) */
  minHeight?: number;
  /** Size when collapsed (default: 32px) */
  iconSize?: number;
  /** Zoom threshold below which comment auto-collapses (default: 0.5) */
  collapseZoomThreshold?: number;

  // Editing UI
  /** Show "send" button in edit mode (default: true) */
  showSendButton?: boolean;
  /** Auto-grow height with content (default: true) */
  autoGrow?: boolean;
}

/**
 * Properties for Comment annotations
 *
 * Comments are specialized annotations that:
 * - Always maintain fixed screen-space size
 * - Always have at least one arrow pointing TO them
 * - Can be collapsed (icon) or expanded (text box)
 * - Support multiple arrows pointing to them
 */
export interface CommentProps extends AnnotationProps {
  type: "comment";

  /** Text content (similar to text annotation) */
  content: string;

  /** Display mode: collapsed (icon) or expanded (text box) */
  mode: typeof COMMENT_MODE_COLLAPSED | typeof COMMENT_MODE_EXPANDED;

  /** Width in expanded mode (pixels) */
  width: number;

  /** Height (auto-grows with content, pixels) */
  height: number;

  /** Optional metadata */
  author?: string;

  timestamp?: Date;

  /** Styling */
  style?: CommentStyle;
}

/**
 * Comment annotation type
 * Geometry: Point (center position of comment box/icon)
 *
 * Note: Arrows are stored separately in Arrow features.
 * Arrows reference comments via their link.start or link.end properties.
 */
export interface Comment
  extends AnnotationFeature<GeoJSONPoint, CommentProps> {}

/**
 * Type guard to check if an annotation is a Comment
 */
export const isComment = (
  a: AnnotationFeature<Geometry, AnnotationProps>
): a is Comment => a.properties.type === "comment";

/**
 * Default style for Comment annotations
 *
 * @example
 * ```typescript
 * {
 *   // Box styling
 *   background: "#FFFACD", // Light yellow (sticky note color)
 *   padding: 8,
 *   borderRadius: 4,
 *   strokeColor: "#DDD",
 *   strokeWidth: 1,
 *   strokeType: "plain",
 *
 *   // Icon styling (collapsed mode)
 *   iconColor: "#FFCB2F", // Gold
 *   iconSymbol: "💬",
 *   iconBorderColor: "#aaa",
 *   iconBorderWidth: 2,
 *
 *   // Size properties
 *   minHeight: 60,
 *   iconSize: 32,
 *
 *   // Text styling
 *   color: "#333",
 *   font: "Arial, sans-serif",
 *   fontSize: 12,
 *
 *   // Editing UI
 *   showSendButton: true,
 *   autoGrow: true,
 *
 *   // Fixed size (always screen-aligned)
 *   fixedSize: true
 * }
 * ```
 */
export const defaultCommentStyle: CommentStyle = {
  // Box styling
  background: "#FFFACD", // Light yellow (sticky note color)
  padding: 8,
  borderRadius: 4,
  strokeColor: "#DDD",
  strokeWidth: 1,
  strokeType: "plain",

  // Icon styling (collapsed mode)
  iconColor: "#FFCB2F", // Gold
  iconSymbol: "💬",
  iconBorderColor: "#aaa",
  iconBorderWidth: 2,

  // Size properties
  minHeight: 60,
  iconSize: 32,
  // collapseZoomThreshold is undefined by default, so it auto-calculates from dimensions

  // Text styling
  color: "#333",
  font: "Arial, sans-serif",
  fontSize: 12,

  // Editing UI
  showSendButton: true,
  autoGrow: true,

  // Fixed size (always screen-aligned)
  fixedSize: true
};

/**
 * Default options for creating new Comments.
 * Contains the default comment configuration with {@link defaultCommentStyle}.
 *
 * @example
 * ```typescript
 * {
 *   mode: "expanded",
 *   width: 200,
 *   height: 120,
 *   content: "",
 *   style: defaultCommentStyle
 * }
 * ```
 */
export const defaultCommentOptions: Partial<CommentProps> = {
  mode: "expanded",
  width: 200,
  height: 60, // Initial height, will auto-grow
  style: defaultCommentStyle
};

/**
 * Create a new Comment annotation
 *
 * @param x - X coordinate of the comment box/icon center
 * @param y - Y coordinate of the comment box/icon center
 * @param content - Text content
 * @param options - Optional configuration
 * @returns New Comment feature
 *
 * @important This creates ONLY the comment box without an arrow. Since comments
 * require at least one arrow, you should use {@link createCommentWithArrow}
 * instead for programmatic creation. This function is primarily used internally
 * by the interactive drawing handlers.
 *
 * @see createCommentWithArrow for creating comments programmatically
 */
export function createComment(
  x: number,
  y: number,
  content: string,
  options?: Partial<CommentProps>
): Comment {
  const props: CommentProps = {
    type: "comment",
    content,
    mode: options?.mode ?? defaultCommentOptions.mode!,
    width: options?.width ?? defaultCommentOptions.width!,
    height: options?.height ?? defaultCommentOptions.height!,
    author: options?.author,
    timestamp: options?.timestamp,
    style: {
      ...defaultCommentStyle,
      ...options?.style
    }
  };

  return {
    id: getId(),
    type: "Feature",
    properties: props,
    geometry: {
      type: "Point",
      coordinates: [x, y]
    }
  };
}

/**
 * Toggle comment mode between collapsed and expanded
 *
 * @param comment - Comment to toggle
 * @returns Updated comment with toggled mode
 */
export function toggleCommentMode(comment: Comment): Comment {
  return {
    ...comment,
    properties: {
      ...comment.properties,
      mode:
        comment.properties.mode === COMMENT_MODE_COLLAPSED
          ? COMMENT_MODE_EXPANDED
          : COMMENT_MODE_COLLAPSED
    }
  };
}

/**
 * Detect if a point is within a comment's bounds
 * @private
 * @param comment - Comment to test
 * @param point - Point to test
 * @param threshold - Detection threshold in pixels
 * @param zoom - Current zoom level
 * @returns True if point is within comment bounds
 */
export function detectComment(
  comment: Comment,
  point: Point,
  threshold: number = 0,
  sin: number,
  cos: number,
  zoom: number = 1
): boolean {
  if (comment.properties.mode !== COMMENT_MODE_COLLAPSED)
    return detectText(
      comment as unknown as Text,
      point,
      threshold,
      sin,
      cos,
      zoom
    );
  const props = comment.properties;
  const style = { ...defaultCommentStyle, ...props.style };

  // Get screen-space dimensions based on mode
  let width = style.iconSize!;
  let height = style.iconSize!;

  // For fixed-size comments, scale world-space dimensions by invZoom
  if (style.fixedSize) {
    width /= zoom;
    height /= zoom;
  }

  const halfWidth = width / 2;
  const halfHeight = height / 2;

  const dx = point.x - comment.geometry.coordinates[0];
  const dy = point.y - comment.geometry.coordinates[1];

  return (
    dx >= -halfWidth - threshold &&
    dx <= halfWidth + threshold &&
    dy >= -halfHeight - threshold &&
    dy <= halfHeight + threshold
  );
}

/**
 * Get the position (center) of a comment
 *
 * @param comment - Comment annotation
 * @returns Center position
 */
export function getCommentPosition(comment: Comment): Point {
  const [x, y] = comment.geometry.coordinates as [number, number];
  return { x, y };
}

/**
 * Get the dimensions of a comment based on its mode
 *
 * @param comment - Comment annotation
 * @returns Width and height
 */
export function getCommentSize(comment: Comment): Size {
  const props = comment.properties;
  const style = { ...defaultCommentStyle, ...props.style };
  if (props.mode === COMMENT_MODE_COLLAPSED)
    return { width: style.iconSize!, height: style.iconSize! };
  return { width: props.width, height: props.height };
}

/**
 * Calculate optimal zoom threshold for auto-collapse based on comment dimensions
 *
 * The threshold is computed so that the comment collapses when its screen-space
 * size would be smaller than a minimum readable size.
 *
 * @param comment - Comment annotation
 * @param minReadableWidth - Minimum readable width in pixels (default: 80)
 * @returns Zoom threshold below which comment should collapse
 *
 * @example
 * // A 200px wide comment with minReadable=80 will collapse at zoom < 0.4
 * // because 200 * 0.4 = 80
 */
export function calculateCommentZoomThreshold(
  comment: Comment,
  minReadableWidth: number = 80
): number {
  // Calculate threshold: zoom where width * zoom = minReadableWidth
  // => zoom = minReadableWidth / width
  const threshold = minReadableWidth / comment.properties.width;

  // Clamp between reasonable bounds (0.1 to 1.0)
  return Math.max(0.1, Math.min(1.0, threshold));
}

/**
 * Get the effective zoom threshold for a comment
 * Uses explicit threshold if set, otherwise calculates from dimensions
 *
 * @param comment - Comment annotation
 * @returns Effective zoom threshold
 */
export function getCommentZoomThreshold(comment: Comment): number {
  const style = { ...defaultCommentStyle, ...comment.properties.style };
  if (style.collapseZoomThreshold !== undefined)
    return style.collapseZoomThreshold;
  return calculateCommentZoomThreshold(comment);
}

/**
 * Create a comment with an arrow pointing to a target location
 *
 * This is the recommended way to create comments programmatically, as it ensures
 * that the comment always has at least one arrow (which is required).
 *
 * @param targetX - X coordinate where the arrow points to
 * @param targetY - Y coordinate where the arrow points to
 * @param commentX - X coordinate of the comment box center
 * @param commentY - Y coordinate of the comment box center
 * @param content - Text content of the comment
 * @param options - Optional configuration
 * @param options.commentStyle - Style options for the comment
 * @param options.arrowStyle - Style options for the arrow
 * @returns Object containing the comment and arrow features
 *
 * @example
 * ```typescript
 * import { createCommentWithArrow } from '@linkurious/ogma-annotations';
 *
 * // Create a comment pointing to a node at (100, 100)
 * const { comment, arrow } = createCommentWithArrow(
 *   100, 100,           // Target position (where arrow points)
 *   300, 50,            // Comment position
 *   "Important node!",  // Comment text
 *   {
 *     commentStyle: {
 *       style: {
 *         background: "#FFFACD",
 *         color: "#333"
 *       }
 *     },
 *     arrowStyle: {
 *       strokeColor: "#3498db",
 *       strokeWidth: 2,
 *       head: "arrow"
 *     }
 *   }
 * );
 *
 * // Add both to the controller
 * controller.add(comment);
 * controller.add(arrow);
 *
 * // The arrow is automatically linked to the comment
 * ```
 */
export function createCommentWithArrow(
  targetX: number,
  targetY: number,
  commentX: number,
  commentY: number,
  content: string = "",
  options?: {
    commentStyle?: Partial<CommentProps>;
    arrowStyle?: Partial<ArrowStyles>;
  }
): {
  comment: Comment;
  arrow: Arrow;
} {
  // Create the comment
  const comment = createComment(
    commentX,
    commentY,
    content,
    options?.commentStyle
  );

  // Create the arrow pointing from target to comment
  const arrowStyles: ArrowStyles = {
    ...defaultArrowStyle,
    head: "arrow" as Extremity, // Default to arrow head
    ...options?.arrowStyle
  };

  const arrow = createArrow(commentX, commentY, targetX, targetY, arrowStyles);

  // Link the arrow's end to the comment
  arrow.properties.link = {
    [SIDE_START]: {
      id: comment.id,
      side: SIDE_START,
      type: "comment" as const,
      magnet: { x: 0, y: 0 }
    }
  };

  return { comment, arrow };
}
