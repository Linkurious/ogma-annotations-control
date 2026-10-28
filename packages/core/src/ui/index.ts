/**
 * Optional, framework-agnostic UI for `@linkurious/ogma-annotations`.
 *
 * Import the styled style panel and the shared building blocks from
 * `@linkurious/ogma-annotations/ui`, and the stylesheet from
 * `@linkurious/ogma-annotations/ui/styles.css`. The main package entry stays
 * headless — nothing here is pulled in unless you import this subpath.
 */
export { AnnotationPanel } from "./AnnotationPanel";
export type { AnnotationPanelOptions } from "./AnnotationPanel";
export { AnnotationToolbar } from "./toolbar/Annotation";
export type {
  AnnotationToolbarOptions,
  AnnotationToolbarStyles,
  ToolbarDrawingType,
  DeleteMode
} from "./toolbar/Annotation";

export {
  ContextToolbars,
  TextAnnotationToolbar
} from "./toolbar/ContextToolbars";
export type {
  ContextToolbarsOptions,
  TextAnnotationToolbarOptions
} from "./toolbar/ContextToolbars";
export {
  ContextToolbar,
  deleteItem,
  colorItem,
  outlineItem
} from "./toolbar/ContextToolbar";
export type {
  ContextToolbarOptions,
  FillToolbarOptions,
  StrokeToolbarOptions
} from "./toolbar/ContextToolbar";
export {
  TextContextToolbar,
  DEFAULT_TOOLBAR_FONTS,
  DEFAULT_TOOLBAR_FONT_SIZES
} from "./toolbar/TextContextToolbar";
export type { TextContextToolbarOptions } from "./toolbar/TextContextToolbar";
export { StickyNoteContextToolbar } from "./toolbar/StickyNoteContextToolbar";
export type { StickyNoteContextToolbarOptions } from "./toolbar/StickyNoteContextToolbar";
export { BoxContextToolbar } from "./toolbar/BoxContextToolbar";
export type { BoxContextToolbarOptions } from "./toolbar/BoxContextToolbar";
export { PolygonContextToolbar } from "./toolbar/PolygonContextToolbar";
export type { PolygonContextToolbarOptions } from "./toolbar/PolygonContextToolbar";
export { ArrowContextToolbar } from "./toolbar/ArrowContextToolbar";
export type { ArrowContextToolbarOptions } from "./toolbar/ArrowContextToolbar";
// Deprecated pre-`ContextToolbar` names.
/** @deprecated Use `ContextToolbar`. */
export { ContextToolbar as AnnotationStyleToolbar } from "./toolbar/ContextToolbar";
/** @deprecated Use `ContextToolbarOptions`. */
export type { ContextToolbarOptions as AnnotationStyleToolbarOptions } from "./toolbar/ContextToolbar";
/** @deprecated Use `TextContextToolbar`. */
export { TextContextToolbar as TextStyleToolbar } from "./toolbar/TextContextToolbar";
/** @deprecated Use `TextContextToolbarOptions`. */
export type { TextContextToolbarOptions as TextStyleToolbarOptions } from "./toolbar/TextContextToolbar";
/** @deprecated Use `StickyNoteContextToolbar`. */
export { StickyNoteContextToolbar as StickyNoteStyleToolbar } from "./toolbar/StickyNoteContextToolbar";
export { STICKY_SWATCHES, STROKE_SWATCHES } from "./toolbar/swatches";
export type { Swatch } from "./toolbar/swatches";
export type { ToolbarCell, ToolbarCellContext } from "./toolbar/cells/contract";
export type {
  ToolbarItem,
  ToolbarButtonItem,
  ToolbarDropdownItem,
  ToolbarDropdownOption,
  ToolbarSeparatorItem,
  ToolbarCustomItem
} from "./toolbar/cells/types";
export { ButtonItemCell } from "./toolbar/cells/buttonItem";
export { DropdownItemCell } from "./toolbar/cells/dropdownItem";
export { ColorCell } from "./toolbar/cells/color";
export type { ColorCellOptions, FillAnnotation } from "./toolbar/cells/color";
export {
  SwatchPicker,
  createColorHistory,
  colorHistoryFor,
  MAX_CUSTOM_SWATCHES
} from "./toolbar/cells/swatchPicker";
export type {
  ColorHistory,
  SwatchPickerOptions
} from "./toolbar/cells/swatchPicker";
export {
  StrokeCell,
  STROKE_WIDTH_THIN,
  STROKE_WIDTH_THICK
} from "./toolbar/cells/stroke";
export type {
  StrokeCellOptions,
  StrokeAnnotation
} from "./toolbar/cells/stroke";

export * from "./config";
export * from "./color";
export * from "./icons";
export { createRgbaColorPicker } from "./colorPicker";
export type { RgbaColorPicker, RgbaColor } from "./colorPicker";
export { attachPanelVisibility } from "./panelVisibility";
export type {
  PanelVisibilityControl,
  PanelVisibilityHandlers
} from "./panelVisibility";
export { DEFAULT_PANEL_PLACEMENT, DEFAULT_PANEL_ORIENTATION } from "./layout";
export type { PanelPlacement, PanelOrientation } from "./layout";
export {
  ALL_PANEL_ANNOTATION_TYPES,
  classifyPanelAnnotationType
} from "./panelTypes";
export type { PanelAnnotationType } from "./panelTypes";
