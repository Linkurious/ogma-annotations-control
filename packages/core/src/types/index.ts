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
   * SVG icon for the send button in text editor
   * Should be a complete SVG string (e.g., '<svg>...</svg>')
   */
  sendButtonIcon: string;

  /**
   * Minimum height of the arrow in units
   */
  minArrowHeight: number;

  /**
   * Maximum height of the arrow in units
   */
  maxArrowHeight: number;
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
