import type { Text } from "../../../types";
import { createToolbarDropdown, type ToolbarDropdown } from "./dropdown";
import type { ToolbarCell, ToolbarCellContext } from "./contract";
import type { ToolbarDropdownItem } from "./types";

/** Renders a `ToolbarDropdownItem` - the generic cell behind Font family
 * and Font size (anything that's "pick one of a list"). */
export class DropdownItemCell implements ToolbarCell {
  public readonly element: HTMLElement;
  private dropdown: ToolbarDropdown;

  constructor(
    private ctx: ToolbarCellContext,
    private item: ToolbarDropdownItem
  ) {
    this.dropdown = createToolbarDropdown(item.title, "");
    this.element = this.dropdown.element;

    item.options.forEach((option) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "oa-toolbar-dropdown-option";
      el.textContent = option.label;
      if (option.style) Object.assign(el.style, option.style);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        item.onSelect(option.value, this.ctx);
        this.dropdown.close();
      });
      this.dropdown.panel.appendChild(el);
    });
  }

  public update(annotation: Text): void {
    const value = this.item.getValue(annotation);
    const option = this.item.options.find((o) => o.value === value);
    const label = this.item.getLabel
      ? this.item.getLabel(value, annotation)
      : (option?.label ?? `${value}`);
    this.dropdown.setLabel(label);
    this.element.title = option?.label ?? `${value}`;
  }

  public destroy(): void {
    // No listeners outside `element`'s own subtree - removed with it.
  }
}
