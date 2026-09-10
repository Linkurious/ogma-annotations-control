import type { Text } from "../../../types";

/**
 * What a cell needs from its host toolbar - small and structural (not the
 * full `Control`) so cells stay easy to unit test and don't reach past the
 * annotation they're editing. Mirrors the shape of the React
 * `*Controller.tsx` components' props, minus the framework.
 */
export interface ToolbarCellContext {
  /** The annotation this toolbar instance is currently showing. Read fresh
   * on every call (not cached by the cell) so it reflects the latest style
   * after another cell's edit. */
  getAnnotation(): Text;
  /** Merges `patch` into the annotation's style via `control.updateStyle`. */
  updateStyle(patch: Partial<Text["properties"]["style"]>): void;
  /** Removes the annotation via `control.remove`. */
  deleteAnnotation(): void;
}

/**
 * One button/control in the floating toolbar's pill. `element` is inserted
 * directly into the pill's DOM by `AnnotationStyleToolbar`; a divider is
 * inserted after every cell but the last.
 */
export interface ToolbarCell {
  readonly element: HTMLElement;
  /** Called whenever the shown annotation's data may have changed (initial
   * render, another cell's edit, or an external update) so the cell can
   * reflect the current value (e.g. the size cell's displayed number). */
  update(annotation: Text): void;
  destroy(): void;
}
