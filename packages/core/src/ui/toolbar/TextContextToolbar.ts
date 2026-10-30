import {
  defaultTextStyle,
  isStickyNote,
  isText,
  type Annotation,
  type Text
} from "../../types";
import { getEffectiveFontSize } from "../../utils/utils";
import type { ToolbarDropdownOption, ToolbarItem } from "./cells/types";
import {
  colorItem,
  ContextToolbar,
  deleteItem,
  outlineItem,
  type FillToolbarOptions,
  type StrokeToolbarOptions
} from "./ContextToolbar";

/** Font options offered by the Font-family cell. Real font names need the
 * actual webfont loaded by the host page to render as shown (e.g. the demo
 * at `web/index.html` loads IBM Plex Sans/Mono) - same "best effort, no
 * bundled font loading" convention `defaultStickyNoteStyle`/
 * `defaultCommentStyle` already use for `font: "IBM Plex Sans"`. */
export const DEFAULT_TOOLBAR_FONTS: ToolbarDropdownOption[] = [
  { value: "sans-serif", label: "Sans Serif" },
  { value: "serif", label: "Serif", style: { fontFamily: "serif" } },
  {
    value: "monospace",
    label: "Monospace",
    style: { fontFamily: "monospace" }
  },
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

export interface TextContextToolbarOptions
  extends FillToolbarOptions<Text>, StrokeToolbarOptions<Text> {
  /** Font-family cell options - defaults to `DEFAULT_TOOLBAR_FONTS`. */
  fonts?: ToolbarDropdownOption[];
  /** Font-size cell presets - defaults to `DEFAULT_TOOLBAR_FONT_SIZES`. */
  fontSizes?: number[];
}

/** Floating style toolbar for plain Text annotations (not sticky notes -
 * see `StickyNoteContextToolbar`): Color, Font family, Font size, Bold,
 * Outline, Show author, Delete. */
export class TextContextToolbar extends ContextToolbar<
  Text,
  TextContextToolbarOptions
> {
  protected matches(annotation: Annotation): annotation is Text {
    return isText(annotation) && !isStickyNote(annotation);
  }

  protected label(): string {
    return "Text style toolbar";
  }

  protected defaultItems(): ToolbarItem<Text>[] {
    const {
      fonts = DEFAULT_TOOLBAR_FONTS,
      fontSizes = DEFAULT_TOOLBAR_FONT_SIZES
    } = this.options;

    return [
      colorItem(this.options, defaultTextStyle),
      { kind: "separator" },
      {
        kind: "dropdown",
        id: "font",
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
        id: "fontSize",
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
        id: "bold",
        title: "Bold",
        icon: "bold",
        isActive: (a) => a.properties.style?.fontWeight === "bold",
        action: (c) => {
          const isBold =
            c.getAnnotation().properties.style?.fontWeight === "bold";
          c.updateStyle({ fontWeight: isBold ? "normal" : "bold" });
        }
      },
      { kind: "separator", id: "outline-separator" },
      outlineItem(this.options, defaultTextStyle),
      { kind: "separator" },
      {
        kind: "button",
        id: "showAuthor",
        title: "Show author",
        getTitle: (a) =>
          a.properties.style?.showAuthor === true
            ? "Hide author"
            : "Show author",
        icon: "user",
        isActive: (a) => a.properties.style?.showAuthor === true,
        action: (c) => {
          const shown = c.getAnnotation().properties.style?.showAuthor === true;
          c.updateStyle({ showAuthor: !shown });
        }
      },
      { kind: "separator" },
      deleteItem()
    ];
  }
}
