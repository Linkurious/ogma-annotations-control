import { svgIcon } from "../../icons";

/**
 * Shared scaffolding for a toolbar cell that opens a small popover below its
 * trigger button - used by `ColorCell`, `FontFamilyCell` and `FontSizeCell`.
 * Deliberately separate from the docked `AnnotationPanel`'s `.custom-select`
 * (`ui/AnnotationPanel.ts`): that component's CSS hides the trigger's text
 * label (icon-only, sized for a narrow docked panel column) which doesn't
 * fit this pill's wider, label-visible cells, so this is its own minimal
 * implementation rather than fighting that CSS.
 *
 * Open/close state is just the `open` class on `element`. Outside-click
 * closing is handled once, centrally, by `AnnotationStyleToolbar`; closing
 * a dropdown when a *sibling* dropdown opens (mutual exclusivity within one
 * pill) is handled here, at open-time, since that's local to this trigger's
 * own click and doesn't need the host toolbar involved.
 */
export interface ToolbarDropdown {
  /** Root element - `.oa-toolbar-cell.oa-toolbar-dropdown`, insert this. */
  element: HTMLElement;
  /** Replaces the trigger's label text (icon and chevron stay put). */
  setLabel(label: string): void;
  /** The popover panel - append option elements into this. */
  panel: HTMLElement;
  close(): void;
}

export function createToolbarDropdown(
  tooltip: string,
  initialLabel: string
): ToolbarDropdown {
  const element = document.createElement("div");
  element.className = "oa-toolbar-cell oa-toolbar-dropdown";
  element.dataset.tooltip = tooltip;

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "oa-toolbar-dropdown-trigger";

  const label = document.createElement("span");
  label.className = "oa-toolbar-dropdown-label";
  label.textContent = initialLabel;

  const chevron = document.createElement("span");
  chevron.className = "oa-toolbar-dropdown-chevron";
  chevron.innerHTML = svgIcon("chevron-down", 14);

  trigger.appendChild(label);
  trigger.appendChild(chevron);

  const panel = document.createElement("div");
  panel.className = "oa-toolbar-dropdown-panel";

  const close = () => element.classList.remove("open");

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    const willOpen = !element.classList.contains("open");
    // Close any other open dropdown in the same pill first - CSS alone
    // can't express "only one of these three siblings is open at a time"
    // without a radio-input/:has() trick that would fight the existing
    // JS-driven open/close state, so this is the simplest correct fix.
    element
      .closest(".annotation-style-toolbar")
      ?.querySelectorAll(".oa-toolbar-dropdown.open")
      .forEach((other) => {
        if (other !== element) other.classList.remove("open");
      });
    element.classList.toggle("open", willOpen);
  });

  element.appendChild(trigger);
  element.appendChild(panel);

  return {
    element,
    panel,
    close,
    setLabel: (text: string) => {
      label.textContent = text;
    }
  };
}
