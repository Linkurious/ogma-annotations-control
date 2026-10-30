import {
  defaultArrowStyle,
  isArrow,
  isComment,
  type Annotation,
  type Arrow
} from "../../types";
import type { ToolbarItem } from "./cells/types";
import {
  ContextToolbar,
  deleteItem,
  outlineItem,
  type StrokeToolbarOptions
} from "./ContextToolbar";

export interface ArrowContextToolbarOptions extends StrokeToolbarOptions<Arrow> {
  /** Also show the pill for an arrow attached to a comment (the comment's
   * own connector). Defaults to `false`. */
  includeCommentArrows?: boolean;
}

/** Floating style toolbar for Arrow (line) annotations: Outline, Delete.
 * Arrowhead/tail pickers stay in the docked `AnnotationPanel`. */
export class ArrowContextToolbar extends ContextToolbar<
  Arrow,
  ArrowContextToolbarOptions
> {
  protected matches(annotation: Annotation): annotation is Arrow {
    return (
      isArrow(annotation) &&
      (!!this.options.includeCommentArrows || !this.isCommentArrow(annotation))
    );
  }

  private isCommentArrow(arrow: Arrow): boolean {
    const ends = [arrow.properties.link?.start, arrow.properties.link?.end];
    return ends.some((end) => {
      const target = end && this.control.getAnnotation(end.id);
      return !!target && isComment(target);
    });
  }

  protected label(): string {
    return "Arrow style toolbar";
  }

  /** Midpoint of the line's first and last points, so the pill sits on the
   * line rather than above the bounding box's top edge. */
  protected getAnchorBox(annotation: Arrow) {
    const coords = annotation.geometry.coordinates;
    const [x0, y0] = coords[0];
    const [x1, y1] = coords[coords.length - 1];
    return { center: { x: (x0 + x1) / 2, y: (y0 + y1) / 2 }, halfHeight: 0 };
  }

  protected defaultItems(): ToolbarItem<Arrow>[] {
    return [
      outlineItem(this.options, defaultArrowStyle),
      { kind: "separator" },
      deleteItem()
    ];
  }
}
