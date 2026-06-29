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
export { attachPanelVisibility } from "./panelVisibility";
export type { PanelVisibilityHandlers } from "./panelVisibility";
