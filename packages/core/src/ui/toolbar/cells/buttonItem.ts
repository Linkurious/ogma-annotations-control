import type { Text } from "../../../types";
import { svgIcon } from "../../icons";
import type {
  ToolbarAnnotation,
  ToolbarCell,
  ToolbarCellContext
} from "./contract";
import type { ToolbarButtonItem } from "./types";

/** Renders a `ToolbarButtonItem` - the generic cell behind Bold, Delete,
 * and the author-visibility toggle (any simple action/toggle button). */
export class ButtonItemCell<
  A extends ToolbarAnnotation = Text
> implements ToolbarCell<A> {
  public readonly element: HTMLButtonElement;

  constructor(
    private ctx: ToolbarCellContext<A>,
    private item: ToolbarButtonItem<A>
  ) {
    const element = (this.element = document.createElement("button"));
    element.type = "button";
    element.className = item.danger
      ? "oa-toolbar-button oa-toolbar-button-danger"
      : "oa-toolbar-button";
    element.dataset.tooltip = item.title;
    element.setAttribute("aria-label", item.title);
    element.innerHTML = svgIcon(item.icon, 16);
    element.addEventListener("click", this.onClick);
  }

  private onClick = () => {
    this.item.action(this.ctx);
  };

  public update(annotation: A): void {
    const title = this.item.getTitle?.(annotation) ?? this.item.title;
    const element = this.element;
    element.dataset.tooltip = title;
    element.setAttribute("aria-label", title);
    if (!this.item.isActive) return;
    const active = this.item.isActive(annotation);
    element.classList.toggle("active", active);
    element.setAttribute("aria-pressed", String(active));
  }

  public destroy(): void {
    this.element.removeEventListener("click", this.onClick);
  }
}
