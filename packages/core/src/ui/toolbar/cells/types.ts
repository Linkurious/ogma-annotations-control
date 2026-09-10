import type { Text } from "../../../types";
import type { IconName } from "../../icons";
import type { ToolbarCell, ToolbarCellContext } from "./contract";

/**
 * Declarative description of one toolbar entry - what `TextStyleToolbar`/
 * `StickyNoteStyleToolbar`'s `getItems()` returns. A generic renderer turns
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
 * `getItems()` builds this list from `TextStyleToolbarOptions` (fonts, font
 * sizes, swatches - each with a shipped default, all overridable), rather
 * than hardcoding specific cell classes/values.
 */
export type ToolbarItem =
  | ToolbarButtonItem
  | ToolbarDropdownItem
  | ToolbarSeparatorItem
  | ToolbarCustomItem;

export interface ToolbarButtonItem {
  kind: "button";
  /** Tooltip label, shown on hover via the existing `data-tooltip` CSS. */
  title: string;
  icon: IconName;
  action: (ctx: ToolbarCellContext) => void;
  /** Toggle state - button gets the `.active` class when this returns
   * true. Omit for a plain action button (e.g. Delete). */
  isActive?: (annotation: Text) => boolean;
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

export interface ToolbarDropdownItem {
  kind: "dropdown";
  title: string;
  options: ToolbarDropdownOption[];
  getValue: (annotation: Text) => ToolbarDropdownValue;
  onSelect: (value: ToolbarDropdownValue, ctx: ToolbarCellContext) => void;
  /** Trigger label shown when closed - defaults to the selected option's
   * `label`. Override for e.g. font (always shows "Aa", not the font name)
   * or size (shows the live effective number even between presets). */
  getLabel?: (value: ToolbarDropdownValue, annotation: Text) => string;
}

export interface ToolbarSeparatorItem {
  kind: "separator";
}

export interface ToolbarCustomItem {
  kind: "custom";
  build: (ctx: ToolbarCellContext) => ToolbarCell;
}
