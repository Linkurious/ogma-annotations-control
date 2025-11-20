import { Size } from "@linkurious/ogma";
import { Point as GeoJSONPoint, Geometry } from "geojson";
import { nanoid as getId } from "nanoid";
import { AnnotationFeature, AnnotationProps } from "./Annotation";
import { Text, TextStyle, detectText } from "./Text";
import { COMMENT_MODE_COLLAPSED, COMMENT_MODE_EXPANDED } from "../../constants";
import { Point } from "../geometry";

/**
 * Style configuration for Comment annotations
 */
export interface CommentStyle extends TextStyle {
  // Icon styling (collapsed mode)
  /** Background color for collapsed icon (default: "#FFD700") */
  iconColor?: string;
  /** Icon to display when collapsed (default: "💬") */
  iconSymbol?: string;
  /** Border color for collapsed icon */
  iconBorderColor?: string;
  /** Border width for collapsed icon */
  iconBorderWidth?: number;

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

  /** Minimum height (default: 60px) */
  minHeight: number;

  /** Size when collapsed (default: 32px) */
  iconSize: number;

  /** Zoom threshold below which comment auto-collapses (default: 0.5) */
  collapseZoomThreshold?: number;

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
 * Comments do NOT store arrow references.
 */
export type Comment = AnnotationFeature<GeoJSONPoint, CommentProps>;

/**
 * Type guard to check if an annotation is a Comment
 */
export const isComment = (
  a: AnnotationFeature<Geometry, AnnotationProps>
): a is Comment => a.properties.type === "comment";

/**
 * Default style for Comment annotations
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
 * Default options for creating new Comments
 */
export const defaultCommentOptions: Partial<CommentProps> = {
  mode: "expanded",
  width: 200,
  minHeight: 60,
  height: 60, // Initial height, will auto-grow
  iconSize: 32,
  // collapseZoomThreshold is undefined by default, so it auto-calculates from dimensions
  style: defaultCommentStyle
};

/**
 * Create a new Comment annotation
 *
 * @param position - Center position of the comment box/icon
 * @param content - Text content
 * @param options - Optional configuration
 * @returns New Comment feature
 *
 * Note: This creates ONLY the comment. Use createCommentWithArrow() to create
 * a comment with its required arrow atomically.
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
    minHeight: options?.minHeight ?? defaultCommentOptions.minHeight!,
    iconSize: options?.iconSize ?? defaultCommentOptions.iconSize!,
    collapseZoomThreshold:
      options?.collapseZoomThreshold ?? defaultCommentOptions.collapseZoomThreshold,
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
 *
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

  // Get screen-space dimensions based on mode
  let width = props.iconSize;
  let height = props.iconSize;

  // For fixed-size comments, scale world-space dimensions by invZoom
  if (props.style?.fixedSize) {
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
  if (props.mode === COMMENT_MODE_COLLAPSED)
    return { width: props.iconSize, height: props.iconSize };
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
  if (comment.properties.collapseZoomThreshold !== undefined) {
    return comment.properties.collapseZoomThreshold;
  }
  return calculateCommentZoomThreshold(comment);
}
