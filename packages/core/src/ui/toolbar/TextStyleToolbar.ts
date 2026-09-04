import { defaultTextStyle } from "../../types";
import { getEffectiveFontSize } from "../../utils/utils";
import {
  AnnotationStyleToolbar,
  type AnnotationStyleToolbarOptions
} from "./AnnotationStyleToolbar";
import { ColorCell } from "./cells/color";
import type { ToolbarCellContext } from "./cells/contract";
import type { ToolbarDropdownOption, ToolbarItem } from "./cells/types";
import { STICKY_SWATCHES, type Swatch } from "./swatches";

/** Font options offered by the Font-family cell. Real font names need the
 * actual webfont loaded by the host page to render as shown (e.g. the demo
 * at `web/index.html` loads IBM Plex Sans/Mono) - same "best effort, no
 * bundled font loading" convention `defaultStickyNoteStyle`/
 * `defaultCommentStyle` already use for `font: "IBM Plex Sans"`. */
export const DEFAULT_TOOLBAR_FONTS: ToolbarDropdownOption[] = [
  { value: "sans-serif", label: "Sans Serif" },
  { value: "serif", label: "Serif", style: { fontFamily: "serif" } },
  { value: "monospace", label: "Monospace", style: { fontFamily: "monospace" } },
  {
    value: "IBM Plex Sans",
    label: "IBM Plex Sans",
    style: { fontFamily: "IBM Plex Sans" }
  },
  {
    value: "IBM Plex Mono",
    label: "IBM Plex Mono",
    style: { fontFamily: "IBM Plex Mono" }
  }
];

/** Preset sizes offered by the Font-size cell - same range as the docked
 * `AnnotationPanel`'s font-size slider (8-72). */
export const DEFAULT_TOOLBAR_FONT_SIZES = [12, 14, 16, 18, 24, 32, 48, 64];

export interface TextStyleToolbarOptions extends AnnotationStyleToolbarOptions {
  /** Font-family cell options - defaults to `DEFAULT_TOOLBAR_FONTS`. */
  fonts?: ToolbarDropdownOption[];
  /** Font-size cell presets - defaults to `DEFAULT_TOOLBAR_FONT_SIZES`. */
  fontSizes?: number[];
  /** Color cell's swatch-grid palette - defaults to `STICKY_SWATCHES`. */
  swatches?: Swatch[];
}

/** Floating style pill for a plain Text annotation: Color, Font family,
 * Font size, Bold, Delete - see the Figma "Sticky Note Toolbar" export
 * (alignment cell dropped for v1). `StickyNoteStyleToolbar` extends this
 * with an author-visibility cell.
 *
 * The built-in items are declarative `ToolbarItem`s (see `cells/types.ts`),
 * built from `this.options` - override `fonts`/`fontSizes`/`swatches` at
 * construction to reconfigure them without subclassing. */
export class TextStyleToolbar extends AnnotationStyleToolbar<TextStyleToolbarOptions> {
  protected getItems(_ctx: ToolbarCellContext): ToolbarItem[] {
    const fonts = this.options.fonts ?? DEFAULT_TOOLBAR_FONTS;
    const fontSizes = this.options.fontSizes ?? DEFAULT_TOOLBAR_FONT_SIZES;
    const swatches = this.options.swatches ?? STICKY_SWATCHES;

    return [
      {
        kind: "custom",
        build: (c) => new ColorCell(c, { swatches })
      },
      { kind: "separator" },
      {
        kind: "dropdown",
        title: "Font",
        options: fonts,
        getValue: (a) => a.properties.style?.font || defaultTextStyle.font!,
        getLabel: () => "Aa",
        // `fonts` entries are always string values (font-family names) -
        // ToolbarDropdownValue is string | number only because the size
        // cell also uses this same item shape with numbers.
        onSelect: (value, c) => c.updateStyle({ font: `${value}` })
      },
      {
        kind: "dropdown",
        title: "Font size",
        options: fontSizes.map((size) => ({ value: size, label: `${size}` })),
        getValue: (a) => {
          const style = a.properties.style;
          return Math.round(
            getEffectiveFontSize(
              style?.fontSize ?? defaultTextStyle.fontSize,
              style?.fontScale
            )
          );
        },
        // Setting fontSize directly (not fontScale) resets any accumulated
        // resize-driven scale, matching what picking an explicit size means.
        onSelect: (value, c) => c.updateStyle({ fontSize: value, fontScale: 1 })
      },
      { kind: "separator" },
      {
        kind: "button",
        title: "Bold",
        icon: "bold",
        isActive: (a) => a.properties.style?.fontWeight === "bold",
        action: (c) => {
          const isBold = c.getAnnotation().properties.style?.fontWeight === "bold";
          c.updateStyle({ fontWeight: isBold ? "normal" : "bold" });
        }
      },
      { kind: "separator" },
      {
        kind: "button",
        title: "Delete",
        icon: "trash",
        danger: true,
        action: (c) => c.deleteAnnotation()
      }
    ];
  }
}
