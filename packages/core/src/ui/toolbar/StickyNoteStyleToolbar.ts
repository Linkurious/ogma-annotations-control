import { TextStyleToolbar } from "./TextStyleToolbar";

/** Sticky-note style pill. Otherwise `TextStyleToolbar`'s items verbatim -
 * the author-visibility toggle that used to be added here has moved to the
 * base class so plain Text annotations get it too - except the Outline
 * (`StrokeCell`) group, turned off here: a sticky note's borderless look is
 * the point of `defaultStickyNoteStyle`'s preset, so letting the pill add a
 * border back would undercut it. Kept as a distinct subclass, rather than
 * folded away, so `FloatingTextToolbar` can keep selecting it via
 * `isStickyNote()` without change, and so any future sticky-note-only cell
 * has an obvious place to go. */
export class StickyNoteStyleToolbar extends TextStyleToolbar {
  protected override includeOutlineCell(): boolean {
    return false;
  }
}
