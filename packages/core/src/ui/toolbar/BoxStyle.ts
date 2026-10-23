import { defaultBoxStyle, type Box } from "../../types";
import {
  AnnotationStyleToolbar,
  type AnnotationStyleToolbarOptions
} from "./AnnotationStyle";
import type { ToolbarAnnotation } from "./cells/contract";
import { StrokeCell, type StrokeCellOptions } from "./cells/stroke";
import type { ToolbarItem } from "./cells/types";
import { STROKE_SWATCHES, type Swatch } from "./swatches";

export interface StrokeStyleToolbarOptions extends AnnotationStyleToolbarOptions {
  /** Outline cell's swatch-grid palette - defaults to `STROKE_SWATCHES`. */
  strokeSwatches?: Swatch[];
  /** Outline cell's "More colors…" picker, see `StrokeCellOptions.onMoreColors`. */
  onMoreStrokeColors?: StrokeCellOptions<ToolbarAnnotation>["onMoreColors"];
}

/** Floating style pill for a Box annotation: Outline, Delete. */
export class BoxStyleToolbar extends AnnotationStyleToolbar<
  Box,
  StrokeStyleToolbarOptions
> {
  protected label(): string {
    return "Box style toolbar";
  }

  protected getItems(): ToolbarItem<Box>[] {
    const strokeSwatches = this.options.strokeSwatches ?? STROKE_SWATCHES;
    const onMoreColors = this.options.onMoreStrokeColors;

    return [
      {
        kind: "custom",
        id: "outline",
        build: (c) =>
          new StrokeCell<Box>(c, {
            swatches: strokeSwatches,
            defaults: defaultBoxStyle,
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
