import type { Annotation, Text } from "../../../types";

/** Annotations a context toolbar can edit - any kind, each with its own
 * `properties.style` shape, read through `ToolbarStyle<A>`. Built-in
 * toolbars exist for Text, Box and Arrow; extend `ContextToolbar` for the
 * others. */
export type ToolbarAnnotation = Annotation;

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
  /** Screen-space (`getBoundingClientRect`) area popovers must stay
   * inside: the Ogma container clipped to the window viewport. */
  getBounds(): DOMRect;
}

/**
 * One button/control in the floating toolbar's pill. `element` is inserted
 * directly into the pill's DOM by `ContextToolbar`; a divider is
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
