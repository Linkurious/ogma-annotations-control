import type { Text } from "../../../types";
import { svgIcon } from "../../icons";
import type { ToolbarCell, ToolbarCellContext } from "./contract";
import type { ToolbarButtonItem } from "./types";

/** Renders a `ToolbarButtonItem` - the generic cell behind Bold, Delete,
 * and the author-visibility toggle (any simple action/toggle button). */
export class ButtonItemCell implements ToolbarCell {
  public readonly element: HTMLButtonElement;

  constructor(
    private ctx: ToolbarCellContext,
    private item: ToolbarButtonItem
  ) {
    this.element = document.createElement("button");
    this.element.type = "button";
    this.element.className = item.danger
      ? "oa-toolbar-button oa-toolbar-button-danger"
      : "oa-toolbar-button";
    this.element.dataset.tooltip = item.title;
    this.element.innerHTML = svgIcon(item.icon, 16);
    this.element.addEventListener("click", this.onClick);
  }

  private onClick = () => {
    this.item.action(this.ctx);
  };

  public update(annotation: Text): void {
    if (!this.item.isActive) return;
    const active = this.item.isActive(annotation);
    this.element.classList.toggle("active", active);
    this.element.setAttribute("aria-pressed", String(active));
  }

  public destroy(): void {
    this.element.removeEventListener("click", this.onClick);
  }
}
