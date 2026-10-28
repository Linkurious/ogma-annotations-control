import type { Control } from "../../Control";
import type { Text } from "../../types";
import {
  ArrowContextToolbar,
  type ArrowContextToolbarOptions
} from "./ArrowContextToolbar";
import {
  BoxContextToolbar,
  type BoxContextToolbarOptions
} from "./BoxContextToolbar";
import type { ToolbarCellContext } from "./cells/contract";
import type { StrokeAnnotation, StrokeCellOptions } from "./cells/stroke";
import type { ToolbarItem } from "./cells/types";
import {
  StickyNoteContextToolbar,
  type StickyNoteContextToolbarOptions
} from "./StickyNoteContextToolbar";
import {
  TextContextToolbar,
  type TextContextToolbarOptions
} from "./TextContextToolbar";

/** Per-type config: omitted = built-in defaults, `false` = no toolbar.
 * A per-type `hideWhenNotEditable` overrides the top-level one. */
type PerType<O> = false | Omit<O, "control">;

export interface ContextToolbarsOptions {
  control: Control;
  /** Default for every toolbar - see `ContextToolbarOptions`. */
  hideWhenNotEditable?: boolean;
  text?: PerType<TextContextToolbarOptions>;
  stickyNote?: PerType<StickyNoteContextToolbarOptions>;
  box?: PerType<BoxContextToolbarOptions>;
  arrow?: PerType<ArrowContextToolbarOptions>;
}

/**
 * Sets up a context (style) toolbar for every annotation type at once -
 * Text, Sticky note, Box and Arrow (comments have none). Each type is on
 * by default; pass `false` to turn one off, or an options object to
 * configure it:
 *
 * ```ts
 * new ContextToolbars({
 *   control,
 *   box: false,
 *   text: { fontSizes: [12, 16, 24] },
 *   arrow: { items: (d) => d.filter((i) => i.id !== "delete") }
 * });
 * ```
 *
 * Equivalent to constructing the per-type classes
 * (`TextContextToolbar`, `StickyNoteContextToolbar`, `BoxContextToolbar`,
 * `ArrowContextToolbar`) yourself.
 */
export class ContextToolbars {
  private toolbars: { destroy(): void }[] = [];

  constructor({
    control,
    hideWhenNotEditable,
    text = {},
    stickyNote = {},
    box = {},
    arrow = {}
  }: ContextToolbarsOptions) {
    const base = { control, hideWhenNotEditable };
    if (text) this.toolbars.push(new TextContextToolbar({ ...base, ...text }));
    if (stickyNote)
      this.toolbars.push(
        new StickyNoteContextToolbar({ ...base, ...stickyNote })
      );
    if (box) this.toolbars.push(new BoxContextToolbar({ ...base, ...box }));
    if (arrow)
      this.toolbars.push(new ArrowContextToolbar({ ...base, ...arrow }));
  }

  public destroy(): void {
    this.toolbars.forEach((t) => t.destroy());
    this.toolbars = [];
  }
}

/** @deprecated Flat options of `TextAnnotationToolbar` - use
 * `ContextToolbarsOptions`. */
export interface TextAnnotationToolbarOptions extends Omit<
  TextContextToolbarOptions,
  "items" | "onMoreStrokeColors"
> {
  /** Applied to every toolbar's outline cell. */
  onMoreStrokeColors?: StrokeCellOptions<StrokeAnnotation>["onMoreColors"];
  /** Applied to the Text and Sticky-note toolbars only. */
  items?: (
    defaultItems: ToolbarItem<Text>[],
    ctx: ToolbarCellContext<Text>
  ) => ToolbarItem<Text>[];
}

/** @deprecated Use `ContextToolbars` - this maps the old flat options onto
 * every per-type toolbar (`items` to Text and Sticky note only). */
export class TextAnnotationToolbar extends ContextToolbars {
  constructor({
    control,
    hideWhenNotEditable,
    strokeSwatches,
    onMoreStrokeColors,
    ...text
  }: TextAnnotationToolbarOptions) {
    const stroke = { strokeSwatches, onMoreStrokeColors };
    super({
      control,
      hideWhenNotEditable,
      text: { ...text, ...stroke },
      stickyNote: text,
      box: stroke,
      arrow: stroke
    });
  }
}
