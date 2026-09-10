import { TextStyleToolbar } from "./TextStyleToolbar";

/** Sticky-note style pill. Currently just `TextStyleToolbar`'s items
 * verbatim - the author-visibility toggle that used to be added here has
 * moved to the base class so plain Text annotations get it too. Kept as a
 * distinct (empty) subclass, rather than folded away, so `FloatingTextToolbar`
 * can keep selecting it via `isStickyNote()` without change, and so any
 * future sticky-note-only cell has an obvious place to go. */
export class StickyNoteStyleToolbar extends TextStyleToolbar {}
