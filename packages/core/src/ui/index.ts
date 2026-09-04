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
export { AnnotationToolbar } from "./AnnotationToolbar";
export type {
  AnnotationToolbarOptions,
  AnnotationToolbarStyles,
  ToolbarDrawingType,
  DeleteMode
} from "./AnnotationToolbar";

export { TextAnnotationToolbar } from "./FloatingTextToolbar";
export type { TextAnnotationToolbarOptions } from "./FloatingTextToolbar";
export { AnnotationStyleToolbar } from "./toolbar/AnnotationStyleToolbar";
export type { AnnotationStyleToolbarOptions } from "./toolbar/AnnotationStyleToolbar";
export {
  TextStyleToolbar,
  DEFAULT_TOOLBAR_FONTS,
  DEFAULT_TOOLBAR_FONT_SIZES
} from "./toolbar/TextStyleToolbar";
export type { TextStyleToolbarOptions } from "./toolbar/TextStyleToolbar";
export { StickyNoteStyleToolbar } from "./toolbar/StickyNoteStyleToolbar";
export { STICKY_SWATCHES } from "./toolbar/swatches";
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
export type { ColorCellOptions } from "./toolbar/cells/color";

export * from "./config";
export * from "./color";
export * from "./icons";
export { createRgbaColorPicker } from "./colorPicker";
export type { RgbaColorPicker, RgbaColor } from "./colorPicker";
export { attachPanelVisibility } from "./panelVisibility";
export type { PanelVisibilityControl, PanelVisibilityHandlers } from "./panelVisibility";
export {
  DEFAULT_PANEL_PLACEMENT,
  DEFAULT_PANEL_ORIENTATION
} from "./layout";
export type { PanelPlacement, PanelOrientation } from "./layout";
