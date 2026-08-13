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
