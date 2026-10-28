import type { Control } from "../../../Control";
import { parseColor } from "../../../utils/utils";
import { rgbaToString } from "../../color";
import { createRgbaColorPicker, type RgbaColorPicker } from "../../colorPicker";
import { svgIcon } from "../../icons";
import type { Swatch } from "../swatches";

/** How many custom colors the swatch picker keeps - the oldest is dropped
 * first. 5 + the "+" button fill two rows of the 3-column grid. */
export const MAX_CUSTOM_SWATCHES = 5;

/** Delay after the last built-in picker change before that color is added
 * to the custom swatches - so dragging across the picker adds one color,
 * not every color passed on the way. */
const HISTORY_COMMIT_MS = 400;

/**
 * Custom colors shown after the fixed swatches, newest first. Bring your
 * own to persist them (e.g. in `localStorage`) or to share them across
 * controls - see `createColorHistory` for the default in-memory one.
 */
export interface ColorHistory {
  /** Newest first. */
  get(): string[];
  /** Moves `color` to the front (no duplicates), dropping the oldest past
   * the limit. */
  add(color: string): void;
  /** Called after every `add`; returns the unsubscribe function. */
  subscribe(listener: () => void): () => void;
}

/** In-memory `ColorHistory` keeping at most `max` colors. */
export function createColorHistory(
  max = MAX_CUSTOM_SWATCHES,
  initial: string[] = []
): ColorHistory {
  let colors = initial.slice(0, max);
  const listeners = new Set<() => void>();
  return {
    get: () => colors,
    add: (color) => {
      colors = [color, ...colors.filter((c) => c !== color)].slice(0, max);
      listeners.forEach((l) => l());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}

const sharedHistories = new WeakMap<Control, ColorHistory>();

/** The default history - one per `Control`, shared by every swatch picker
 * on it, so a color added from the Text toolbar also shows on Boxes. */
export function colorHistoryFor(control: Control): ColorHistory {
  let history = sharedHistories.get(control);
  if (!history) {
    history = createColorHistory();
    sharedHistories.set(control, history);
  }
  return history;
}

export interface SwatchPickerOptions {
  swatches: Swatch[];
  history: ColorHistory;
  /** Accessible name of a swatch, e.g. `(c) => \`Background ${c}\``. */
  label: (color: string) => string;
  /** The annotation's current color - the built-in picker starts there. */
  getCurrent: () => string;
  /** Applies a picked color. */
  onPick: (color: string) => void;
  /** Called after a swatch click (typically closes the dropdown). */
  onDone: () => void;
  /** Called when the block changes size (typically re-fits the dropdown). */
  onResize: () => void;
  /**
   * Bring your own picker: called instead of opening the built-in one when
   * "+" is clicked. `anchor` is the "+" button; call `addSwatch(color)` to
   * add the color you applied to the custom swatches.
   */
  onMore?: (anchor: HTMLElement, addSwatch: (color: string) => void) => void;
}

/**
 * Color block shared by the toolbar's color and outline cells: the fixed
 * `swatches`, then the custom colors from `history` followed by a "+"
 * button that opens a color picker and adds its color to `history`.
 */
export class SwatchPicker {
  public readonly element: HTMLElement;
  private customGrid: HTMLElement;
  private add: HTMLButtonElement;
  private picker: RgbaColorPicker | null = null;
  private pickerHost: HTMLElement | null = null;
  private commitTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingColor: string | null = null;
  private unsubscribe: () => void;

  constructor(private options: SwatchPickerOptions) {
    this.element = document.createElement("div");
    this.element.className = "oa-toolbar-swatch-picker";

    const grid = document.createElement("div");
    grid.className = "oa-toolbar-swatch-grid";
    options.swatches.forEach((s) =>
      grid.appendChild(this.swatchButton(s.fill, s.stroke))
    );
    this.element.appendChild(grid);

    this.customGrid = document.createElement("div");
    this.customGrid.className =
      "oa-toolbar-swatch-grid oa-toolbar-swatch-grid-custom";
    this.element.appendChild(this.customGrid);

    this.add = document.createElement("button");
    this.add.type = "button";
    this.add.className = "oa-toolbar-swatch-add";
    this.add.title = "Custom color";
    this.add.setAttribute("aria-label", "Custom color");
    this.add.innerHTML = svgIcon("plus", 16);
    this.add.addEventListener("click", (e) => {
      e.stopPropagation();
      this.openPicker();
    });

    this.renderCustom();
    this.unsubscribe = options.history.subscribe(() => {
      this.renderCustom();
      this.options.onResize();
    });
  }

  private swatchButton(fill: string, stroke?: string): HTMLButtonElement {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "oa-toolbar-swatch-cell";
    cell.classList.toggle(
      "oa-toolbar-swatch-cell-transparent",
      fill === "transparent"
    );
    cell.title = fill;
    cell.setAttribute("aria-label", this.options.label(fill));
    cell.style.setProperty("--oa-swatch-fill", fill);
    if (stroke) cell.style.setProperty("--oa-swatch-stroke", stroke);
    cell.addEventListener("click", (e) => {
      e.stopPropagation();
      this.options.onPick(fill);
      this.options.onDone();
    });
    return cell;
  }

  private renderCustom() {
    this.customGrid.replaceChildren(
      ...this.options.history.get().map((c) => this.swatchButton(c)),
      this.add
    );
  }

  private openPicker() {
    const { onMore, history } = this.options;
    if (onMore) {
      this.options.onDone();
      onMore(this.add, (color) => history.add(color));
      return;
    }
    if (this.pickerHost) {
      this.closePicker();
      return;
    }
    this.pickerHost = document.createElement("div");
    this.pickerHost.className = "oa-toolbar-more-colors-host";
    this.picker = createRgbaColorPicker();
    this.picker.color = parseColor(this.options.getCurrent());
    this.picker.addEventListener("color-changed", (event) => {
      const color = rgbaToString(event.detail.value);
      this.options.onPick(color);
      this.scheduleCommit(color);
    });
    this.pickerHost.appendChild(this.picker);
    this.element.appendChild(this.pickerHost);
    this.options.onResize();
  }

  private scheduleCommit(color: string) {
    this.pendingColor = color;
    if (this.commitTimer !== null) clearTimeout(this.commitTimer);
    this.commitTimer = setTimeout(() => this.commit(), HISTORY_COMMIT_MS);
  }

  private commit() {
    if (this.commitTimer !== null) clearTimeout(this.commitTimer);
    this.commitTimer = null;
    if (this.pendingColor) this.options.history.add(this.pendingColor);
    this.pendingColor = null;
  }

  private closePicker() {
    this.commit();
    this.pickerHost?.remove();
    this.pickerHost = null;
    this.picker = null;
    this.options.onResize();
  }

  public destroy(): void {
    this.commit();
    this.unsubscribe();
    this.pickerHost?.remove();
    this.pickerHost = null;
    this.picker = null;
  }
}
