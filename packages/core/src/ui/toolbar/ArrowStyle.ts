import { defaultArrowStyle, type Arrow } from "../../types";
import { AnnotationStyleToolbar } from "./AnnotationStyle";
import { StrokeCell } from "./cells/stroke";
import type { ToolbarItem } from "./cells/types";
import { STROKE_SWATCHES } from "./swatches";
import type { StrokeStyleToolbarOptions } from "./BoxStyle";

/** Floating style pill for an Arrow (line) annotation: Outline, Delete.
 * Arrowhead/tail pickers stay in the docked `AnnotationPanel`. */
export class ArrowStyleToolbar extends AnnotationStyleToolbar<
  Arrow,
  StrokeStyleToolbarOptions
> {
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

  protected getItems(): ToolbarItem<Arrow>[] {
    const strokeSwatches = this.options.strokeSwatches ?? STROKE_SWATCHES;
    const onMoreColors = this.options.onMoreStrokeColors;

    return [
      {
        kind: "custom",
        id: "outline",
        build: (c) =>
          new StrokeCell<Arrow>(c, {
            swatches: strokeSwatches,
            defaults: defaultArrowStyle,
            onMoreColors
          })
      },
      { kind: "separator" },
      {
        kind: "button",
        id: "delete",
        title: "Delete",
        icon: "trash",
        danger: true,
        action: (c) => c.deleteAnnotation()
      }
    ];
  }
}
