import type { Box, Polygon, Text } from "../../../types";
import type { Swatch } from "../swatches";
import type { ToolbarCell, ToolbarCellContext } from "./contract";
import { createToolbarDropdown, type ToolbarDropdown } from "./dropdown";
import { SwatchPicker, type ColorHistory } from "./swatchPicker";

/** Annotations with a `background` style. */
export type FillAnnotation = Text | Box | Polygon;

export interface ColorCellOptions<A extends FillAnnotation = Text> {
  /** Fixed swatch-grid palette - defaults to `STICKY_SWATCHES`
   * (the toolbars' `swatches` option), overridable per instance. */
  swatches: Swatch[];
  /** Custom colors shown after `swatches`, filled by the "+" button. */
  history: ColorHistory;
  /** Shown when the annotation has no explicit `background` - each
   * annotation type has its own default style. */
  defaults: { background?: string };
  /**
   * Called instead of opening the built-in `vanilla-colorful` picker when
   * "+" is clicked - use this to hand off to your own color picker (a
   * native `<input type="color">`, a design-system component, whatever).
   * Read the current color via
   * `ctx.getAnnotation().properties.style?.background`, call
   * `ctx.updateStyle({ background: yourPickedColor })` (as many times as
   * you like, e.g. live while the user drags) to apply it, and
   * `addSwatch(color)` to keep it in the custom swatches. `anchor` is the
   * "+" button, to position your own popover against. This toolbar's own
   * dropdown closes right before this is called.
   */
  onMoreColors?: (
    ctx: ToolbarCellContext<A>,
    anchor: HTMLElement,
    addSwatch: (color: string) => void
  ) => void;
}

/**
 * Background-color cell for Text, sticky notes and Boxes - edits
 * `background` (the fill, the single most visible "color" of those), not
 * `color` (the text color, covered by the docked `AnnotationPanel`).
 *
 * The dropdown is a `SwatchPicker`: the fixed `swatches` grid, then custom
 * colors and a "+" that opens the existing `vanilla-colorful` picker
 * (`colorPicker.ts`) - or the host's own via `onMoreColors`.
 */
export class ColorCell<
  A extends FillAnnotation = Text
> implements ToolbarCell<A> {
  public readonly element: HTMLElement;
  private dropdown: ToolbarDropdown;
  private swatch: HTMLElement;
  private picker: SwatchPicker;

  constructor(
    private ctx: ToolbarCellContext<A>,
    private options: ColorCellOptions<A>
  ) {
    this.dropdown = createToolbarDropdown("Color", "", ctx.getBounds);
    this.element = this.dropdown.element;
    this.element.classList.add("oa-toolbar-color-cell");

    this.swatch = document.createElement("span");
    this.swatch.className = "oa-toolbar-swatch";
    this.dropdown.element
      .querySelector(".oa-toolbar-dropdown-trigger")!
      .insertBefore(
        this.swatch,
        this.dropdown.element.querySelector(".oa-toolbar-dropdown-label")
      );

    const { onMoreColors } = options;
    this.picker = new SwatchPicker({
      swatches: options.swatches,
      history: options.history,
      label: (c) => (c === "transparent" ? "No background" : `Background ${c}`),
      getCurrent: () => this.current(this.ctx.getAnnotation()),
      onPick: (color) => this.ctx.updateStyle({ background: color }),
      onDone: () => this.dropdown.close(),
      onResize: () => this.dropdown.reposition(),
      onMore: onMoreColors
        ? (anchor, addSwatch) => onMoreColors(this.ctx, anchor, addSwatch)
        : undefined
    });
    this.dropdown.panel.appendChild(this.picker.element);
  }

  private current(annotation: A): string {
    return (
      annotation.properties.style?.background ||
      this.options.defaults.background ||
      "transparent"
    );
  }

  public update(annotation: A): void {
    const current = this.current(annotation);
    this.swatch.style.setProperty("--oa-swatch-fill", current);
    this.swatch.classList.toggle(
      "oa-toolbar-swatch-transparent",
      current === "transparent"
    );
  }

  public destroy(): void {
    this.picker.destroy();
  }
}
