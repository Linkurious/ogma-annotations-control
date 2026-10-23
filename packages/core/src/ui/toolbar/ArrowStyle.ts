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
