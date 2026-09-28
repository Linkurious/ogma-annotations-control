/**
 * Optional, styled React UI for `@linkurious/ogma-annotations-react`.
 *
 * Import the components from `@linkurious/ogma-annotations-react/ui`. CSS is
 * injected automatically when you import this entry; if your bundler strips
 * side-effect CSS, also import `@linkurious/ogma-annotations-react/ui/styles.css`.
 *
 * The main package entry stays headless — nothing here is pulled in unless you
 * import this subpath.
 */
import "./styles.css";

export { AnnotationPanel } from "./AnnotationPanel";
export type { AnnotationPanelProps } from "./AnnotationPanel";
export { AddMenu } from "./AddMenu";
export type { AddMenuProps } from "./AddMenu";
export { ViewControls } from "./ViewControls";
export { Icon } from "./Icon";
export type { IconProps } from "./Icon";

// AnnotationPanelController, useAnnotationPanel, and
// TextAnnotationToolbarController live in ./controllers now (dropped the
// redundant "Controller" suffix from their file names since the directory
// name already says so).
export * from "./controllers";
