import { Cursor } from "./types";

export const NONE = -1;

export const EVT_DRAG = "dragging";
export const EVT_DRAG_START = "dragstart";
export const EVT_DRAG_END = "dragend";
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

export const LAYERS = {
  SHAPES: 1,
  EDITOR: 2,
  HANDLES: 3
};

export const SIDE_START = "start";
export const SIDE_END = "end";

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
