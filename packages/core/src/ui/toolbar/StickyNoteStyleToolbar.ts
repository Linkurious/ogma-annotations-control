import type { ToolbarCellContext } from "./cells/contract";
import type { ToolbarItem } from "./cells/types";
import { TextStyleToolbar } from "./TextStyleToolbar";

/** Sticky-note style pill: `TextStyleToolbar`'s items plus an
 * author-visibility toggle, inserted just before Delete (matching the
 * Figma export's cell order). See `TextStyle.showAuthor`'s doc comment for
 * what the toggle actually does (and doesn't) do yet. */
export class StickyNoteStyleToolbar extends TextStyleToolbar {
  protected getItems(ctx: ToolbarCellContext): ToolbarItem[] {
    const items = super.getItems(ctx);
    // The base list ends in [..., separator, Delete] - insert the author
    // toggle (plus its own separator) right before that pair.
    const deleteAt = items.length - 2;
    const authorToggle: ToolbarItem[] = [
      {
        kind: "button",
        title: "Show author",
        icon: "user",
        isActive: (a) => a.properties.style?.showAuthor === true,
        action: (c) => {
          const shown = c.getAnnotation().properties.style?.showAuthor === true;
          c.updateStyle({ showAuthor: !shown });
        }
      },
      { kind: "separator" }
    ];
    return [...items.slice(0, deleteAt), ...authorToggle, ...items.slice(deleteAt)];
  }
}
