import { EVT_UPDATE } from "../../constants";
import type { Control } from "../../Control";
import {
  isArrow,
  isBox,
  isComment,
  isStickyNote,
  isText,
  type Annotation,
  type Arrow,
  type Id
} from "../../types";
import { attachPanelVisibility } from "../panelVisibility";
import { ArrowStyleToolbar } from "./ArrowStyle";
import { BoxStyleToolbar, type StrokeStyleToolbarOptions } from "./BoxStyle";
import { StickyNoteStyleToolbar } from "./StickyNoteStyle";
import { TextStyleToolbar, type TextStyleToolbarOptions } from "./TextStyle";

/** `fonts`/`fontSizes`/`swatches` (see `TextStyleToolbarOptions`) apply to
 * the plain-Text and sticky-note pills; `strokeSwatches`/`onMoreStrokeColors`
 * apply to every pill's outline cell (Text, Box, Arrow). */
export interface TextAnnotationToolbarOptions
  extends TextStyleToolbarOptions, StrokeStyleToolbarOptions {
  control: Control;
  /**
   * Whether a selected-but-locked (`isEditable: false`) annotation keeps the
   * toolbar hidden, same as no selection. Defaults to `true`.
   * Set to `false` to keep the toolbar open on a locked selection instead
   * (e.g. to keep a lock/unlock button in `items` reachable) - see
   * `attachPanelVisibility`'s `hideWhenNotEditable` for the full contract.
   */
  hideWhenNotEditable?: boolean;
}

/** What `TextAnnotationToolbar` needs from whichever pill is mounted. */
interface StyleToolbarHandle {
  readonly annotationId: Id;
  update(annotation: Annotation): void;
  destroy(): void;
}

type ToolbarKind = "sticky" | "text" | "box" | "arrow";

function toolbarKindOf(annotation: Annotation): ToolbarKind | null {
  if (isText(annotation)) return isStickyNote(annotation) ? "sticky" : "text";
  if (isBox(annotation)) return "box";
  if (isArrow(annotation)) return "arrow";
  return null;
}

/**
 * Floating, per-selection style toolbar - the vanilla equivalent of the
 * docked `AnnotationPanel`, anchored above the selection instead of docked
 * to a screen edge. One pill per annotation kind: Text (plain and sticky
 * note), Box and Arrow. Other kinds (comment, polygon) still only get the
 * docked panel.
 *
 * Thin by design (`constructor(options)` / `destroy()`, no other public
 * surface) so a future React wrapper can host it the way
 * `AnnotationPanelController` hosts `AnnotationPanel`.
 */
export class TextAnnotationToolbar {
  private control: Control;
  private options: TextAnnotationToolbarOptions;
  private current: StyleToolbarHandle | null = null;
  private currentKind: ToolbarKind | null = null;
  private detachVisibility: () => void;
  private handleUpdate = (annotation: Annotation) => {
    if (this.current && annotation.id === this.current.annotationId) {
      this.show(annotation);
    }
  };

  constructor(options: TextAnnotationToolbarOptions) {
    this.control = options.control;
    this.options = options;

    this.detachVisibility = attachPanelVisibility(this.control, {
      onShow: (annotation) => this.show(annotation),
      onHide: () => this.hide(),
      hideWhenNotEditable: options.hideWhenNotEditable
    });

    this.control.on(EVT_UPDATE, this.handleUpdate);
  }

  /** An arrow attached to a comment at either end is a comment's own
   * connector, so it gets no floating style pill. */
  private isCommentArrow(arrow: Arrow): boolean {
    const ends = [arrow.properties.link?.start, arrow.properties.link?.end];
    return ends.some((end) => {
      const target = end && this.control.getAnnotation(end.id);
      return !!target && isComment(target);
    });
  }

  private show(annotation: Annotation) {
    const kind = toolbarKindOf(annotation);
    if (!kind || (isArrow(annotation) && this.isCommentArrow(annotation))) {
      this.hide();
      return;
    }

    if (
      this.current &&
      this.currentKind === kind &&
      this.current.annotationId === annotation.id
    ) {
      this.current.update(annotation);
      return;
    }

    this.hide();
    this.currentKind = kind;
    this.current = this.createToolbar(annotation);
  }

  private createToolbar(annotation: Annotation): StyleToolbarHandle | null {
    if (isText(annotation)) {
      return isStickyNote(annotation)
        ? new StickyNoteStyleToolbar(this.options, annotation)
        : new TextStyleToolbar(this.options, annotation);
    }
    if (isBox(annotation)) {
      return new BoxStyleToolbar(this.options, annotation);
    }
    if (isArrow(annotation)) {
      return new ArrowStyleToolbar(this.options, annotation);
    }
    return null;
  }

  private hide() {
    this.current?.destroy();
    this.current = null;
    this.currentKind = null;
  }

  public destroy(): void {
    this.detachVisibility();
    this.control.off(EVT_UPDATE, this.handleUpdate);
    this.hide();
  }
}
