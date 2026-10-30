import { isStickyNote, isText, type Annotation, type Text } from "../../types";
import type { ToolbarItem } from "./cells/types";
import {
  TextContextToolbar,
  type TextContextToolbarOptions
} from "./TextContextToolbar";

export type StickyNoteContextToolbarOptions = Omit<
  TextContextToolbarOptions,
  "strokeSwatches" | "onMoreStrokeColors"
>;

/** Sticky-note style toolbar: `TextContextToolbar`'s items minus the
 * Outline group - a sticky note's borderless look is the point of
 * `defaultStickyNoteStyle`'s preset, so the pill doesn't offer to add a
 * border back. */
export class StickyNoteContextToolbar extends TextContextToolbar {
  constructor(options: StickyNoteContextToolbarOptions) {
    super(options);
  }

  protected matches(annotation: Annotation): annotation is Text {
    return isText(annotation) && isStickyNote(annotation);
  }

  protected label(): string {
    return "Sticky note style toolbar";
  }

  protected defaultItems(): ToolbarItem<Text>[] {
    return super
      .defaultItems()
      .filter((i) => i.id !== "outline" && i.id !== "outline-separator");
  }
}
