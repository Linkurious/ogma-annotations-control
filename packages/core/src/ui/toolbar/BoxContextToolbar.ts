import { defaultBoxStyle, isBox, type Annotation, type Box } from "../../types";
import type { ToolbarItem } from "./cells/types";
import {
  colorItem,
  ContextToolbar,
  deleteItem,
  outlineItem,
  type FillToolbarOptions,
  type StrokeToolbarOptions
} from "./ContextToolbar";

export interface BoxContextToolbarOptions
  extends FillToolbarOptions<Box>, StrokeToolbarOptions<Box> {}

/** Floating style toolbar for Box annotations: Color, Outline, Delete. */
export class BoxContextToolbar extends ContextToolbar<
  Box,
  BoxContextToolbarOptions
> {
  protected matches(annotation: Annotation): annotation is Box {
    return isBox(annotation);
  }

  protected label(): string {
    return "Box style toolbar";
  }

  protected defaultItems(): ToolbarItem<Box>[] {
    return [
      colorItem(this.options, defaultBoxStyle),
      { kind: "separator" },
      outlineItem(this.options, defaultBoxStyle),
      { kind: "separator" },
      deleteItem()
    ];
  }
}
