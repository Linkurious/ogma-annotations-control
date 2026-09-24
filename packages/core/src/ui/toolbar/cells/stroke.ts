import { createRgbaColorPicker, type RgbaColorPicker } from "../../colorPicker";
import { rgbaToString } from "../../color";
import { parseColor } from "../../../utils/utils";
import { defaultTextStyle, type Text } from "../../../types";
import type { Swatch } from "../swatches";
import { createToolbarDropdown, type ToolbarDropdown } from "./dropdown";
import type { ToolbarCell, ToolbarCellContext } from "./contract";

/** Preset values the thin/thick buttons write to `strokeWidth` - a compact
 * stand-in for the docked `AnnotationPanel`'s 1-20 slider, sized for a pill
 * cell that has room for two buttons, not a slider track. */
export const STROKE_WIDTH_THIN = 1;
export const STROKE_WIDTH_THICK = 4;

/** Fallback outline color, read back by the "More colors…" picker and
 * matching the text renderer's own fallback (`renderer/shapes/text.ts`:
 * `rect.setAttribute("stroke", strokeColor || "black")`) - `defaultTextStyle`
 * itself has no `strokeColor`. */
const FALLBACK_STROKE_COLOR = "#000000";

export interface StrokeCellOptions {
  /** Color-grid palette for the outline-color row - defaults to
   * `STROKE_SWATCHES` (`STICKY_SWATCHES` without "transparent", which
   * doesn't make sense for a stroke - see that constant's own doc). */
  swatches: Swatch[];
  /**
   * Bring your own color picker: called instead of opening the built-in
   * `vanilla-colorful` popover when "More colors…" is clicked - same
   * contract as `ColorCellOptions.onMoreColors`, just for `strokeColor`
   * instead of `background`.
   */
  onMoreColors?: (ctx: ToolbarCellContext, anchor: HTMLElement) => void;
}

/** Small inline preview line, reused for both the line-style row's two
 * buttons and the trigger's own closed-state icon - `dashed` picks the
 * dash pattern, matching `strokeType`'s "plain"/"dashed" values. */
function lineIcon(dashed: boolean): string {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"${
    dashed ? ' stroke-dasharray="4 4"' : ""
  }/></svg>`;
}

/** Same preview line at two stroke widths, for the thickness row - the
 * icon's own line weight *is* the preview, no separate glyph needed. */
function weightIcon(thick: boolean): string {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" stroke-width="${
    thick ? 4 : 1.5
  }" stroke-linecap="round"/></svg>`;
}

/**
 * Outline (border) style cell for a plain Text annotation's floating pill -
 * `strokeWidth` (as a thin/thick preset pair, not the docked panel's
 * slider), `strokeType` ("plain"/"dashed") and `strokeColor`. See the Figma
 * "Annotation Toolbar" export's "Line Type" dropdown.
 *
 * Not offered on sticky notes - `StickyNoteStyleToolbar` drops it (a
 * borderless look is the point of the sticky-note preset); see
 * `TextStyleToolbar.includeOutlineCell`.
 *
 * Same "custom" shape as `ColorCell` (a popover with more than a flat
 * option list), just three stacked sections - thickness, line style, color
 * - instead of one swatch grid.
 */
export class StrokeCell implements ToolbarCell {
  public readonly element: HTMLElement;
  private dropdown: ToolbarDropdown;
  private triggerIcon: HTMLElement;
  private weightButtons: HTMLButtonElement[] = [];
  private typeButtons: HTMLButtonElement[] = [];
  private more!: HTMLButtonElement;
  private morePicker: RgbaColorPicker | null = null;
  private morePickerHost: HTMLElement | null = null;

  constructor(
    private ctx: ToolbarCellContext,
    private options: StrokeCellOptions
  ) {
    this.dropdown = createToolbarDropdown("Line Type", "");
    this.element = this.dropdown.element;
    this.element.classList.add("oa-toolbar-stroke-cell");

    this.triggerIcon = document.createElement("span");
    this.triggerIcon.className = "oa-toolbar-stroke-trigger-icon";
    this.dropdown.element
      .querySelector(".oa-toolbar-dropdown-trigger")!
      .insertBefore(
        this.triggerIcon,
        this.dropdown.element.querySelector(".oa-toolbar-dropdown-label")
      );

    const weightRow = document.createElement("div");
    weightRow.className = "oa-toolbar-stroke-row";
    ([false, true] as const).forEach((thick) => {
      const label = thick ? "Thick outline" : "Thin outline";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "oa-toolbar-button oa-toolbar-stroke-option";
      btn.title = label;
      btn.setAttribute("aria-label", label);
      btn.innerHTML = weightIcon(thick);
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.ctx.updateStyle({
          strokeWidth: thick ? STROKE_WIDTH_THICK : STROKE_WIDTH_THIN
        });
      });
      this.weightButtons.push(btn);
      weightRow.appendChild(btn);
    });
    this.dropdown.panel.appendChild(weightRow);
    this.dropdown.panel.appendChild(this.divider());

    const typeRow = document.createElement("div");
    typeRow.className = "oa-toolbar-stroke-row";
    ([false, true] as const).forEach((dashed) => {
      const label = dashed ? "Dashed line" : "Solid line";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "oa-toolbar-button oa-toolbar-stroke-option";
      btn.title = label;
      btn.setAttribute("aria-label", label);
      btn.innerHTML = lineIcon(dashed);
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.ctx.updateStyle({ strokeType: dashed ? "dashed" : "plain" });
      });
      this.typeButtons.push(btn);
      typeRow.appendChild(btn);
    });
    this.dropdown.panel.appendChild(typeRow);
    this.dropdown.panel.appendChild(this.divider());

    const grid = document.createElement("div");
    grid.className = "oa-toolbar-swatch-grid";
    this.options.swatches.forEach((s) => {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "oa-toolbar-swatch-cell";
      cell.title = s.fill;
      cell.setAttribute("aria-label", `Outline color ${s.fill}`);
      cell.style.setProperty("--oa-swatch-fill", s.fill);
      cell.style.setProperty("--oa-swatch-stroke", s.stroke);
      cell.addEventListener("click", (e) => {
        e.stopPropagation();
        this.ctx.updateStyle({ strokeColor: s.fill });
        this.dropdown.close();
      });
      grid.appendChild(cell);
    });
    this.dropdown.panel.appendChild(grid);

    this.more = document.createElement("button");
    this.more.type = "button";
    this.more.className = "oa-toolbar-more-colors";
    this.more.textContent = "More colors…";
    this.more.addEventListener("click", (e) => {
      e.stopPropagation();
      this.openMorePicker();
    });
    this.dropdown.panel.appendChild(this.more);
  }

  private openMorePicker() {
    if (this.options.onMoreColors) {
      this.dropdown.close();
      this.options.onMoreColors(this.ctx, this.more);
      return;
    }
    if (this.morePickerHost) {
      this.closeMorePicker();
      return;
    }
    this.morePickerHost = document.createElement("div");
    this.morePickerHost.className = "oa-toolbar-more-colors-host";
    this.morePicker = createRgbaColorPicker();
    const current =
      this.ctx.getAnnotation().properties.style?.strokeColor || FALLBACK_STROKE_COLOR;
    this.morePicker.color = parseColor(current);
    this.morePicker.addEventListener("color-changed", (event) => {
      this.ctx.updateStyle({ strokeColor: rgbaToString(event.detail.value) });
    });
    this.morePickerHost.appendChild(this.morePicker);
    this.dropdown.panel.appendChild(this.morePickerHost);
  }

  private closeMorePicker() {
    this.morePickerHost?.remove();
    this.morePickerHost = null;
    this.morePicker = null;
  }

  private divider(): HTMLElement {
    const el = document.createElement("span");
    el.className = "oa-toolbar-dropdown-divider";
    return el;
  }

  public update(annotation: Text): void {
    const style = annotation.properties.style || {};
    const width = style.strokeWidth ?? defaultTextStyle.strokeWidth ?? 0;
    const type = style.strokeType ?? defaultTextStyle.strokeType ?? "plain";

    const thickActive =
      Math.abs(width - STROKE_WIDTH_THICK) < Math.abs(width - STROKE_WIDTH_THIN);
    this.weightButtons.forEach((btn, i) => {
      const isThickButton = i === 1;
      const active = isThickButton ? thickActive : !thickActive;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", String(active));
    });

    const dashed = type === "dashed";
    this.typeButtons.forEach((btn, i) => {
      const isDashedButton = i === 1;
      const active = isDashedButton ? dashed : !dashed;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", String(active));
    });

    this.triggerIcon.innerHTML = lineIcon(dashed);
  }

  public destroy(): void {
    this.closeMorePicker();
  }
}
