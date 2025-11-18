export * from "./features";
export * from "./geometry";
export * from "./events";

export type ControllerOptions = {
  /**
   * The color of the magnet points
   */
  magnetColor: string;
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
   * Size of the text handle
   */
  textHandleSize: number;

  /**
   * Size of the arrow handle
   */
  arrowHandleSize: number;

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
