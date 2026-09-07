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
    // The base list ends in [..., separator, Bold, separator, Delete] -
    // split right before Delete itself (not before that last separator),
    // so the existing separator becomes the Bold/author-toggle divider and
    // only the new one we add here separates the toggle from Delete. Off
    // by one here previously either doubled up the divider before Delete
    // or dropped the one before the toggle, depending on which side of the
    // insertion carried it.
    const deleteAt = items.length - 1;
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
