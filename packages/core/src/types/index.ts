import type { Annotation, AuthorLineStyle, Comment, Id } from "./features";

export * from "./features";
export * from "./geometry";
export * from "./events";
export * from "./colors";

/**
 * Options for the annotations control
 */
export type ControllerOptions = {
  /**
   * The radius in which arrows are attracted
   */
  magnetRadius: number;
  /**
   * The margin in which the Texts are detected when looking for magnet points
   */
  detectMargin: number;
  /**
   * Display size of the magnet point
   */
  magnetHandleRadius: number;

  /**
   * Placeholder for the text input
   */
  textPlaceholder: string;

  /**
   * Editor-wide default style for every Text annotation's author line. Only
   * applied when an annotation's `style.showAuthor` is true and
   * `properties.author` is set; a given field here is overridden by that
   * annotation's own `style.authorStyle` if set (see `TextStyle.authorStyle`).
   */
  authorStyle?: Partial<AuthorLineStyle>;

  /**
   * Minimum on-screen font size, in pixels, for a scalable (non-fixedSize)
   * Text annotation's content or author line to actually be rendered.
   * Below this, the text is skipped entirely (the box/background still
   * renders) - avoids illegible sub-pixel text and the layout work that
   * produces it. Ignored for `fixedSize` text (its on-screen size never
   * shrinks with zoom) and during SVG/PNG export (export always renders
   * in full, same as viewport culling). Set to 0 to disable.
   */
  minReadableFontSize: number;

  /**
   * Show send button in text editor
   */
  showSendButton: boolean;

  /**
   * Show edit button in text editor
   */
  showEditButton: boolean;

  /**
   * SVG icon for the send button in text editor
   * Should be a complete SVG string (e.g., '<svg>...</svg>')
   */
  sendButtonIcon: string;

  /**
   * SVG icon for the edit button in text editor
   * Should be a complete SVG string (e.g., '<svg>...</svg>')
   */
  editButtonIcon: string;

  /**
   * Default collapsed-comment icon: an `<svg viewBox=...>` string or a text
   * symbol (e.g. an emoji). Used by every comment that has no own
   * `style.iconSymbol`, so it isn't repeated in each annotation. Defaults to
   * the built-in SVG icon. May be a function to pick the icon per comment;
   * return undefined for the built-in one.
   */
  commentIcon?: string | ((comment: Comment) => string | undefined);

  /**
   * Minimum height of the arrow in units
   */
  minArrowHeight: number;

  /**
   * Maximum height of the arrow in units
   */
  maxArrowHeight: number;

  /**
   * Called to decide whether an annotation can be dragged, resized, restyled,
   * text-edited, deleted, or re-linked. Defaults to always `true`. Selection
   * (click to highlight, `getSelectedAnnotations()`) is unaffected - a
   * non-editable annotation stays fully selectable, just not mutable.
   *
   * Keep this cheap and synchronous - it can run once per affected
   * annotation on every relevant edit attempt. To react to a change that
   * isn't reflected in the annotation's own data (e.g. a host-side
   * "read-only mode" toggle), call `control.setOptions({ isEditable })`
   * again with a new function reference - passing the same reference is a
   * no-op.
   */
  isEditable: (annotation: Annotation) => boolean;

  /**
   * Called to decide whether an annotation is rendered (including in SVG
   * export) and hit-testable (hover/select/drag via the mouse). Defaults to
   * always `true`. A hidden annotation stays fully present in
   * `getAnnotations()`, `getAnnotation()`, and `getSelectedAnnotations()` -
   * visibility only controls what's drawn and clickable, not data access.
   *
   * Keep this cheap and synchronous - it can run once per annotation on
   * every render pass while the view is changing (drag, pan, zoom). Same
   * reactivity note as `isEditable` applies to changing this after the fact.
   */
  isVisible: (annotation: Annotation) => boolean;

  /**
   * Called to decide whether a comment may be attached at the given target
   * (what is under the click that starts the comment). Defaults to always
   * `true`. When it returns `false` no comment is created, a `commentDenied`
   * event is emitted, and comment drawing mode (if started via
   * `enableCommentDrawing`) stays active so the user can click elsewhere.
   * While it is active, `commentHover` events report the target under the cursor
   * so the host can show its own indication.
   *
   * Keep this cheap and synchronous - it also runs on mouse move while
   * comment drawing mode is active. Same reactivity note as `isEditable`
   * applies to changing this after the fact.
   */
  canComment: (target: CommentTarget) => boolean;

  /**
   * Show the `not-allowed` cursor while hovering a target where
   * `canComment` returns `false` in comment drawing mode. Defaults to `true`.
   * Set to `false` to indicate it yourself via the `commentHover` event.
   */
  commentDeniedCursor: boolean;

  /**
   * Called to decide whether a comment may be detached from the node, edge
   * or annotation it points at. Defaults to always `false`. When it returns
   * `false`, dragging the connector's tip or body away from its target is
   * refused, and deleting the target (node, edge, text, box, polygon)
   * deletes the comment and its connector. When it returns `true`, the
   * connector can be dragged off, and removing the target leaves the comment
   * in place with a free connector end.
   *
   * Keep this cheap and synchronous. Same reactivity note as `isEditable`.
   */
  canDetach: (comment: Comment) => boolean;
};

/**
 * What a comment is being attached to: a graph node, a graph edge, another
 * annotation (text, box, polygon) or an empty point of the canvas.
 */
export type CommentTarget =
  | {
      type: "node" | "edge" | "annotation";
      id: Id;
      point: { x: number; y: number };
    }
  | { type: "void"; point: { x: number; y: number } };

export type AnnotationOptions = {
  handleSize: number;
  placeholder?: string;
};

/** @private */
export type Cursor =
  | "default"
  | "pointer"
  | "move"
  | "grab"
  | "grabbing"
  | "auto"
  // Resize cursors
  | "resize"
  | "col-resize"
  | "row-resize"
  | "all-scroll"
  | "n-resize"
  | "e-resize"
  | "s-resize"
  | "w-resize"
  | "ne-resize"
  | "nw-resize"
  | "se-resize"
  | "sw-resize"
  | "ew-resize"
  | "ns-resize"
  | "nesw-resize"
  | "nwse-resize"
  | "alias"
  | "not-allowed"
  | "crosshair";

export type ClientMouseEvent = {
  clientX: number;
  clientY: number;
};

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};
