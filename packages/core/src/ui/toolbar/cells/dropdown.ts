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
  /** Root element - `.oa-toolbar-dropdown`, insert this. Purely a
   * popover-positioning wrapper; all visible button styling is on the
   * trigger (an `.oa-toolbar-button`) inside it. */
  element: HTMLElement;
  /** Replaces the trigger's label text (icon and chevron stay put), and its
   * `aria-label` (`"<tooltip>: <label>"`, since the visible label text is
   * icon-adjacent, not a substitute for an accessible name on its own). */
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
  element.className = "oa-toolbar-dropdown";

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "oa-toolbar-button oa-toolbar-dropdown-trigger";
  trigger.dataset.tooltip = tooltip;
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  // Callers that never call setLabel (e.g. ColorCell, whose trigger shows
  // only a swatch dot + chevron, no text) still need a usable name.
  trigger.setAttribute("aria-label", tooltip);

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
  panel.setAttribute("role", "listbox");
  panel.setAttribute("aria-label", `${tooltip} options`);

  const setExpanded = (open: boolean) =>
    trigger.setAttribute("aria-expanded", String(open));

  const close = () => {
    element.classList.remove("open");
    setExpanded(false);
  };

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
        if (other !== element) {
          other.classList.remove("open");
          other
            .querySelector(".oa-toolbar-dropdown-trigger")
            ?.setAttribute("aria-expanded", "false");
        }
      });
    element.classList.toggle("open", willOpen);
    setExpanded(willOpen);
  });

  element.appendChild(trigger);
  element.appendChild(panel);

  return {
    element,
    panel,
    close,
    setLabel: (text: string) => {
      label.textContent = text;
      trigger.setAttribute("aria-label", `${tooltip}: ${text || initialLabel}`);
    }
  };
}
