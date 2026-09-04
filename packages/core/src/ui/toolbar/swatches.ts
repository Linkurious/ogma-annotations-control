/**
 * Fixed swatch-grid palette for the floating text toolbar's color cell,
 * extracted from the Figma "Sticky Note Toolbar" color-picker-dropdown
 * export. Distinct from `ui/config.ts`'s `BACKGROUNDS`/`DEFAULT_RECENT_COLORS`
 * (the docked `AnnotationPanel`'s recent-colors strip) - this is a static
 * palette, not an MRU list.
 *
 * The export only fully captured 8 fill/stroke pairs for what reads as a
 * 3x3(+) grid - the 9th cell (a color, or a "more colors" affordance) is
 * unconfirmed. `ColorCell` opens the existing `vanilla-colorful` picker
 * (see `colorPicker.ts`) as a secondary "more colors" popover, so a missing
 * 9th swatch here isn't a functional gap, just an incomplete visual match.
 */
export interface Swatch {
  /** Fill color, used as both the swatch circle's fill and the annotation's
   * `color`/`background` style value when picked. */
  fill: string;
  /** 1px ring stroke color around the swatch circle. */
  stroke: string;
}

export const STICKY_SWATCHES: Swatch[] = [
  { fill: "#FFE49B", stroke: "#D9A926" },
  { fill: "#FFC8A7", stroke: "#CC8C66" },
  { fill: "#FFA7B5", stroke: "#C2707D" },
  { fill: "#D9F3B0", stroke: "#A2C270" },
  { fill: "#C7F7EF", stroke: "#8CD9CC" },
  { fill: "#99D6FF", stroke: "#5CA5D6" },
  { fill: "#D1C7FA", stroke: "#9B8CD9" },
  { fill: "#C3DAFE", stroke: "#668ECC" }
];
