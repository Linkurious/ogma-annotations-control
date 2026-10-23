import type { Arrow, Box, Text } from "../../../types";

/** Annotations a floating style toolbar can edit - each has its own
 * `properties.style` shape, read through `ToolbarStyle<A>`. */
export type ToolbarAnnotation = Text | Box | Arrow;

export type ToolbarStyle<A extends ToolbarAnnotation> = NonNullable<
  A["properties"]["style"]
>;

/**
 * What a cell needs from its host toolbar - small and structural (not the
 * full `Control`) so cells stay easy to unit test and don't reach past the
 * annotation they're editing. Mirrors the shape of the React
 * `*Controller.tsx` components' props, minus the framework.
 */
export interface ToolbarCellContext<A extends ToolbarAnnotation = Text> {
  /** The annotation this toolbar instance is currently showing. Read fresh
   * on every call (not cached by the cell) so it reflects the latest style
   * after another cell's edit. */
  getAnnotation(): A;
  /** Merges `patch` into the annotation's style via `control.updateStyle`. */
  updateStyle(patch: Partial<ToolbarStyle<A>>): void;
  /** Removes the annotation via `control.remove`. */
  deleteAnnotation(): void;
}

/**
 * One button/control in the floating toolbar's pill. `element` is inserted
 * directly into the pill's DOM by `AnnotationStyleToolbar`; a divider is
 * inserted after every cell but the last.
 */
export interface ToolbarCell<A extends ToolbarAnnotation = Text> {
  readonly element: HTMLElement;
  /** Called whenever the shown annotation's data may have changed (initial
   * render, another cell's edit, or an external update) so the cell can
   * reflect the current value (e.g. the size cell's displayed number). */
  update(annotation: A): void;
  destroy(): void;
}
