import type { Annotation } from "./features";

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
   * Called to decide whether an annotation is rendered on the canvas and
   * hit-testable (hover/select/drag via the mouse). Defaults to always
   * `true`. A hidden annotation stays fully present in `getAnnotations()`,
   * `getAnnotation()`, `getSelectedAnnotations()`, and exports - visibility
   * only controls what's drawn and clickable, not data access.
   *
   * Keep this cheap and synchronous - it can run once per annotation on
   * every render pass while the view is changing (drag, pan, zoom). Same
   * reactivity note as `isEditable` applies to changing this after the fact.
   */
  isVisible: (annotation: Annotation) => boolean;
};

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
  | "crosshair";

export type ClientMouseEvent = {
  clientX: number;
  clientY: number;
};

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};
