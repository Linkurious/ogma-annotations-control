import { createRgbaColorPicker, type RgbaColorPicker } from "../../colorPicker";
import { defaultTextStyle, type Text } from "../../../types";
import { rgbaToString } from "../../color";
import { parseColor } from "../../../utils/utils";
import type { Swatch } from "../swatches";
import { createToolbarDropdown, type ToolbarDropdown } from "./dropdown";
import type { ToolbarCell, ToolbarCellContext } from "./contract";

export interface ColorCellOptions {
  /** Fixed swatch-grid palette - defaults to `STICKY_SWATCHES`
   * (`TextStyleToolbar`'s `swatches` option), overridable per instance. */
  swatches: Swatch[];
}

/**
 * Note-color cell - the toolbar's one hand-built ("custom") item, per its
 * own edge-case shape (a swatch grid opening a secondary popover, not a
 * flat option list a `DropdownItemCell` could render). Edits `background`
 * (the note's fill - the single most visible "color" of a Text/sticky
 * note, and what the Figma swatch grid's colors are for), not `color` (the
 * text color, already covered by the docked `AnnotationPanel`'s separate
 * Color/Background sections).
 *
 * Primary UI is the `swatches` grid, matching the Figma dropdown export. A
 * "More colors…" cell at the end opens the existing `vanilla-colorful`
 * picker (`colorPicker.ts`) as a secondary popover, so this doesn't
 * reimplement a full color picker - it wraps the one `AnnotationPanel`
 * already uses.
 */
export class ColorCell implements ToolbarCell {
  public readonly element: HTMLElement;
  private dropdown: ToolbarDropdown;
  private swatch: HTMLElement;
  private morePicker: RgbaColorPicker | null = null;
  private morePickerHost: HTMLElement | null = null;

  constructor(
    private ctx: ToolbarCellContext,
    { swatches }: ColorCellOptions
  ) {
    this.dropdown = createToolbarDropdown("Color", "");
    this.element = this.dropdown.element;
    this.element.classList.add("oa-toolbar-color-cell");

    this.swatch = document.createElement("span");
    this.swatch.className = "oa-toolbar-swatch";
    this.dropdown.element
      .querySelector(".oa-toolbar-dropdown-trigger")!
      .insertBefore(this.swatch, this.dropdown.element.querySelector(".oa-toolbar-dropdown-label"));

    const grid = document.createElement("div");
    grid.className = "oa-toolbar-swatch-grid";
    swatches.forEach((s) => {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "oa-toolbar-swatch-cell";
      cell.title = s.fill;
      cell.style.setProperty("--oa-swatch-fill", s.fill);
      cell.style.setProperty("--oa-swatch-stroke", s.stroke);
      cell.addEventListener("click", (e) => {
        e.stopPropagation();
        this.pick(s.fill);
        this.dropdown.close();
      });
      grid.appendChild(cell);
    });
    this.dropdown.panel.appendChild(grid);

    const more = document.createElement("button");
    more.type = "button";
    more.className = "oa-toolbar-more-colors";
    more.textContent = "More colors…";
    more.addEventListener("click", (e) => {
      e.stopPropagation();
      this.openMorePicker();
    });
    this.dropdown.panel.appendChild(more);
  }

  private pick(color: string) {
    this.ctx.updateStyle({ background: color });
  }

  private openMorePicker() {
    if (this.morePickerHost) {
      this.closeMorePicker();
      return;
    }
    this.morePickerHost = document.createElement("div");
    this.morePickerHost.className = "oa-toolbar-more-colors-host";
    this.morePicker = createRgbaColorPicker();
    const current =
      this.ctx.getAnnotation().properties.style?.background ||
      defaultTextStyle.background!;
    this.morePicker.color = parseColor(current);
    this.morePicker.addEventListener("color-changed", (event) => {
      this.pick(rgbaToString(event.detail.value));
    });
    this.morePickerHost.appendChild(this.morePicker);
    this.dropdown.panel.appendChild(this.morePickerHost);
  }

  private closeMorePicker() {
    this.morePickerHost?.remove();
    this.morePickerHost = null;
    this.morePicker = null;
  }

  public update(annotation: Text): void {
    const current =
      annotation.properties.style?.background || defaultTextStyle.background!;
    this.swatch.style.setProperty("--oa-swatch-fill", current);
  }

  public destroy(): void {
    this.closeMorePicker();
  }
}
