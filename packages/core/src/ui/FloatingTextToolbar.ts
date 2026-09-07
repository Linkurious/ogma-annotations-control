import { EVT_UPDATE } from "../constants";
import type { Control } from "../Control";
import { isStickyNote, isText, type Annotation } from "../types";
import { attachPanelVisibility } from "./panelVisibility";
import { AnnotationStyleToolbar } from "./toolbar/AnnotationStyleToolbar";
import { StickyNoteStyleToolbar } from "./toolbar/StickyNoteStyleToolbar";
import {
  TextStyleToolbar,
  type TextStyleToolbarOptions
} from "./toolbar/TextStyleToolbar";

/** `fonts`/`fontSizes`/`swatches` (see `TextStyleToolbarOptions`) apply to
 * both the plain-Text and sticky-note pill - `StickyNoteStyleToolbar` only
 * adds the author-toggle item on top, it doesn't take extra options of its
 * own. */
export interface TextAnnotationToolbarOptions extends TextStyleToolbarOptions {
  control: Control;
}

/**
 * Floating, per-selection style toolbar for Text annotations (plain text
 * boxes and sticky notes) - the vanilla equivalent of the docked
 * `AnnotationPanel`, but anchored above the selection instead of docked to
 * a screen edge. Ignores non-Text selections (arrow/box/polygon/comment
 * still only get the docked panel, for now).
 *
 * Thin by design (`constructor(options)` / `destroy()`, no other public
 * surface) so a future React wrapper can host it the way
 * `AnnotationPanelController` hosts `AnnotationPanel`.
 */
export class TextAnnotationToolbar {
  private control: Control;
  private options: TextAnnotationToolbarOptions;
  private current: AnnotationStyleToolbar | null = null;
  private detachVisibility: () => void;
  private handleUpdate = (annotation: Annotation) => {
    if (this.current && annotation.id === this.current.annotationId && isText(annotation)) {
      this.current.update(annotation);
    }
  };

  constructor(options: TextAnnotationToolbarOptions) {
    this.control = options.control;
    this.options = options;

    this.detachVisibility = attachPanelVisibility(this.control, {
      onShow: (annotation) => this.show(annotation),
      onHide: () => this.hide()
    });

    this.control.on(EVT_UPDATE, this.handleUpdate);
  }

  private show(annotation: Annotation) {
    if (!isText(annotation)) {
      this.hide();
      return;
    }

    const Toolbar = isStickyNote(annotation)
      ? StickyNoteStyleToolbar
      : TextStyleToolbar;

    if (this.current && this.current.annotationId === annotation.id && this.current instanceof Toolbar) {
      this.current.update(annotation);
      return;
    }

    this.hide();
    this.current = new Toolbar(this.options, annotation);
  }

  private hide() {
    this.current?.destroy();
    this.current = null;
  }

  public destroy(): void {
    this.detachVisibility();
    this.control.off(EVT_UPDATE, this.handleUpdate);
    this.hide();
  }
}
