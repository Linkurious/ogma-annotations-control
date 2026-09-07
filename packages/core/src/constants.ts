import { Cursor } from "./types";

export const NONE = -1;

export const EVT_DRAG = "dragging";
export const EVT_DRAG_START = "dragstart";
export const EVT_DRAG_END = "dragend";
export const EVT_CLICK = "click";
export const EVT_SELECT = "select";
export const EVT_UNSELECT = "unselect";
export const EVT_HOVER = "hover";
export const EVT_UNHOVER = "unhover";
export const EVT_REMOVE = "remove";
export const EVT_ADD = "add";
export const EVT_CANCEL_DRAWING = "cancelDrawing";
export const EVT_COMPLETE_DRAWING = "completeDrawing";
export const EVT_UPDATE = "update";
export const EVT_LINK = "link";
export const EVT_HISTORY = "history";

export const DATA_ATTR = "data-annotation";

export const handleDetectionThreshold = 5; // pixels
export const handleRadius = 3; // pixels

/** @private */
export const LAYERS = {
  SHAPES: 1,
  EDITOR: 2,
  HANDLES: 3
};

export const SIDE_START = "start" as const;
export const SIDE_END = "end" as const;

/** @private */
export const cursors: Record<string, Cursor> = {
  default: "default",
  move: "move",
  pointer: "pointer",
  crosshair: "crosshair",
  grab: "grab",
  grabbing: "grabbing",
  ewResize: "ew-resize",
  nsResize: "ns-resize",
  neswResize: "nesw-resize",
  nwseResize: "nwse-resize",
  nwResize: "nw-resize",
  neResize: "ne-resize",
  swResize: "sw-resize",
  seResize: "se-resize",
  nResize: "n-resize",
  eResize: "e-resize",
  sResize: "s-resize",
  wResize: "w-resize"
};

export const COMMENT_MODE_COLLAPSED = "collapsed";
export const COMMENT_MODE_EXPANDED = "expanded";

export const TEXT_LINE_HEIGHT = 1.2;
export const HL_BRIGHTEN = 0.2;

/** @private */
export const TARGET_TYPES = {
  TEXT: "text" as const,
  NODE: "node" as const,
  BOX: "box" as const,
  COMMENT: "comment" as const,
  POLYGON: "polygon" as const,
  ANNOTATION: "annotation" as const,
  EDGE: "edge" as const
};

/** Default send button icon (paper plane) */
export const DEFAULT_SEND_ICON = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export const DEFAULT_EDIT_ICON = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M12 6.00015H7.33333C6.97971 6.00015 6.64057 6.14063 6.39052 6.39068C6.14048 6.64072 6 6.97986 6 7.33348V16.6668C6 17.0204 6.14048 17.3596 6.39052 17.6096C6.64057 17.8597 6.97971 18.0002 7.33333 18.0002H16.6667C17.0203 18.0002 17.3594 17.8597 17.6095 17.6096C17.8595 17.3596 18 17.0204 18 16.6668V12.0002M16.25 5.75015C16.5152 5.48493 16.8749 5.33594 17.25 5.33594C17.6251 5.33594 17.9848 5.48493 18.25 5.75015C18.5152 6.01537 18.6642 6.37508 18.6642 6.75015C18.6642 7.12522 18.5152 7.48493 18.25 7.75015L12.2413 13.7595C12.083 13.9176 11.8875 14.0334 11.6727 14.0962L9.75733 14.6562C9.69997 14.6729 9.63916 14.6739 9.58127 14.6591C9.52339 14.6442 9.47055 14.6141 9.4283 14.5719C9.38604 14.5296 9.35593 14.4768 9.3411 14.4189C9.32627 14.361 9.32727 14.3002 9.344 14.2428L9.904 12.3275C9.96702 12.1129 10.083 11.9175 10.2413 11.7595L16.25 5.75015Z" stroke="#1A70E5" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;