import {
  defaultPolygonStyle,
  isPolygon,
  type Annotation,
  type Polygon
} from "../../types";
import type { ToolbarItem } from "./cells/types";
import {
  colorItem,
  ContextToolbar,
  deleteItem,
  outlineItem,
  type FillToolbarOptions,
  type StrokeToolbarOptions
} from "./ContextToolbar";

export interface PolygonContextToolbarOptions
  extends FillToolbarOptions<Polygon>, StrokeToolbarOptions<Polygon> {}

/** Floating style toolbar for Polygon annotations: Color, Outline, Delete. */
export class PolygonContextToolbar extends ContextToolbar<
  Polygon,
  PolygonContextToolbarOptions
> {
  protected matches(annotation: Annotation): annotation is Polygon {
    return isPolygon(annotation);
  }

  protected label(): string {
    return "Polygon style toolbar";
  }

  protected defaultItems(): ToolbarItem<Polygon>[] {
    return [
      colorItem(this.options, defaultPolygonStyle),
      { kind: "separator" },
      outlineItem(this.options, defaultPolygonStyle),
      { kind: "separator" },
      deleteItem()
    ];
  }
}
