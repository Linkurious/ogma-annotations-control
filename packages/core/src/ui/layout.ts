/**
 * Placement and orientation options shared by the vanilla `AnnotationPanel`
 * and the React panel/controller. Both are applied as `data-placement` /
 * `data-orientation` attributes on the panel root, consumed by the rules in
 * `ui/styles.css` — no inline layout styles are set from JS.
 */

/** Which screen edge/corner the panel docks to. */
export type PanelPlacement =
  | "left"
  | "right"
  | "top"
  | "bottom"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

/** Whether panel sections stack top-to-bottom or run left-to-right. */
export type PanelOrientation = "vertical" | "horizontal";

/** Preserves the panel's original vertically-centered, right-docked look. */
export const DEFAULT_PANEL_PLACEMENT: PanelPlacement = "right";

export const DEFAULT_PANEL_ORIENTATION: PanelOrientation = "vertical";
