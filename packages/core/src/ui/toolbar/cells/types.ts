import type { Text } from "../../../types";
import type { IconName } from "../../icons";
import type {
  ToolbarAnnotation,
  ToolbarCell,
  ToolbarCellContext
} from "./contract";

/**
 * Declarative description of one toolbar entry - what a `ContextToolbar`'s
 * `defaultItems()` returns. A generic renderer turns
 * each item into a `ToolbarCell`:
 *
 * - `"button"` -> `ButtonItemCell` (Bold, Delete, the author toggle - any
 *   simple action/toggle button).
 * - `"dropdown"` -> `DropdownItemCell` (Font family, Font size - anything
 *   that's "pick one of a list").
 * - `"separator"` -> a plain divider, no cell.
 * - `"custom"` -> an escape hatch for a cell that doesn't reduce to
 *   button/dropdown - the color picker is the one case today (a swatch grid
 *   opening a secondary popover, not a flat option list).
 *
 * This is what makes the built-in toolbar configurable from the outside:
 * `defaultItems()` builds this list from the toolbar's options (fonts, font
 * sizes, swatches - each with a shipped default, all overridable), and
 * `options.items` can rewrite it, rather than hardcoding specific cell
 * classes/values.
 */
export type ToolbarItem<A extends ToolbarAnnotation = Text> =
  | ToolbarButtonItem<A>
  | ToolbarDropdownItem<A>
  | ToolbarSeparatorItem
  | ToolbarCustomItem<A>;

export interface ToolbarButtonItem<A extends ToolbarAnnotation = Text> {
  kind: "button";
  /** Stable identifier for a built-in item (e.g. `"bold"`, `"delete"`) -
   * lets a `ContextToolbarOptions.items` transform address one by
   * `id` (`filter`/`find`) instead of by array position, so it keeps
   * working if the built-in list's order or length changes in a later
   * version. Not read by the toolbar itself; unset on your own items,
   * which only your own `items` function ever sees. */
  id?: string;
  /** Tooltip label, shown on hover via the existing `data-tooltip` CSS. */
  title: string;
  /** Dynamic tooltip - overrides `title` per annotation when set. */
  getTitle?: (annotation: A) => string;
  icon: IconName;
  action: (ctx: ToolbarCellContext<A>) => void;
  /** Toggle state - button gets the `.active` class when this returns
   * true. Omit for a plain action button (e.g. Delete). */
  isActive?: (annotation: A) => boolean;
  /** Red-on-hover styling, used by Delete. */
  danger?: boolean;
}

/** `value` is `string | number` (not a per-item generic) so a plain object
 * literal - e.g. an inline font-size preset list - type-checks directly
 * against `ToolbarItem` without an explicit type argument. */
export type ToolbarDropdownValue = string | number;

export interface ToolbarDropdownOption {
  value: ToolbarDropdownValue;
  label: string;
  /** Inline style hint applied to this option's row - e.g. `{fontFamily:
   * value}` so a font option previews in its own face. */
  style?: Partial<CSSStyleDeclaration>;
}

export interface ToolbarDropdownItem<A extends ToolbarAnnotation = Text> {
  kind: "dropdown";
  /** See `ToolbarButtonItem.id`. */
  id?: string;
  title: string;
  options: ToolbarDropdownOption[];
  getValue: (annotation: A) => ToolbarDropdownValue;
  onSelect: (value: ToolbarDropdownValue, ctx: ToolbarCellContext<A>) => void;
  /** Trigger label shown when closed - defaults to the selected option's
   * `label`. Override for e.g. font (always shows "Aa", not the font name)
   * or size (shows the live effective number even between presets). */
  getLabel?: (value: ToolbarDropdownValue, annotation: A) => string;
}

export interface ToolbarSeparatorItem {
  kind: "separator";
  /** See `ToolbarButtonItem.id` - lets an `items` transform address a
   * specific divider (e.g. "the one right before Delete") without
   * counting positions. Rarely needed; addressing the item next to it is
   * usually enough. */
  id?: string;
}

export interface ToolbarCustomItem<A extends ToolbarAnnotation = Text> {
  kind: "custom";
  /** See `ToolbarButtonItem.id`. */
  id?: string;
  build: (ctx: ToolbarCellContext<A>) => ToolbarCell<A>;
}
