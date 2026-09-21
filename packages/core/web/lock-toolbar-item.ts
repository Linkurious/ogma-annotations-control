import Ogma from "@linkurious/ogma";
import { Control, createText, defaultTextStyle } from "../src";
import {
  TextAnnotationToolbar,
  type ToolbarCell,
  type ToolbarCellContext,
  type ToolbarItem
} from "../src/ui";
import "../src/ui/styles.css";
import type { Id } from "../src";
import { installBrand } from "./brand";
import "./style.css";

// Runnable version of the "lock button" worked example from
// docs/typescript/ui-components/floating-text-toolbar.md - featuring that
// doc's follow-up placement variant (Lock next to Delete, found by `id`,
// rather than prepended ahead of Color).

// --- Lock state --------------------------------------------------------
// Kept outside the annotation's own data on purpose - see the doc: an
// annotation's own `isEditable`-gated write path (control.update()/
// updateStyle()) can't be used to toggle the very flag that drives
// isEditable, since the gate is evaluated on pre-update state and would
// veto the unlock call while the annotation is still locked.
const locked = new Map<Id, boolean>();

// --- Lock button ---------------------------------------------------------
const LOCK_ICON =
  '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>';

class LockCell implements ToolbarCell {
  readonly element = document.createElement("button");

  constructor(private ctx: ToolbarCellContext) {
    this.element.type = "button";
    // oa-lock-button is a hook for the CSS below, not a styling class of
    // its own - oa-toolbar-button is what actually makes it look right.
    this.element.className = "oa-toolbar-button oa-lock-button";
    this.element.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${LOCK_ICON}</svg>`;
    this.element.addEventListener("click", this.onClick);
  }

  private onClick = () => {
    const id = this.ctx.getAnnotation().id;
    locked.set(id, !locked.get(id));
    this.refresh(id);
  };

  update(annotation: { id: Id }) {
    this.refresh(annotation.id);
  }

  private refresh(id: Id) {
    const isLocked = locked.get(id) === true;
    this.element.classList.toggle("active", isLocked);
    this.element.dataset.tooltip = isLocked ? "Unlock" : "Lock";
    // Grey out every other cell in the pill - see the CSS below.
    this.element.closest(".annotation-style-toolbar")?.classList.toggle("locked", isLocked);
  }

  destroy() {
    this.element.removeEventListener("click", this.onClick);
  }
}

// --- Ogma/Control setup ----------------------------------------------------
const ogma = new Ogma({ container: "graph-container" });
installBrand(ogma);
const control = new Control(ogma);

control.setOptions({
  isEditable: (annotation) => !locked.get(annotation.id)
});

control.add(
  createText(-260, -50, 220, 80, "Select me, then click the lock icon", {
    color: "#2D00A6",
    background: "#EDE6FF",
    font: "IBM Plex Sans, sans-serif",
    fontSize: 16,
    borderRadius: 8,
    padding: 10
  })
);
control.add(
  // Same shape web/../test/unit/floatingTextToolbar.test.ts uses for a
  // sticky note: isStickyNote() checks for this exact placeholder text.
  createText(60, -50, 200, 200, "", {
    ...defaultTextStyle,
    scaleFontOnResize: true,
    placeholder: "Quick note…"
  })
);

await ogma.view.set({ x: 0, y: 0, zoom: 1 }, { duration: 0 });

const toolbar = new TextAnnotationToolbar({
  control,
  hideWhenNotEditable: false,
  items: (defaultItems, ctx) => {
    const lockItem: ToolbarItem = {
      kind: "custom",
      id: "lock",
      build: () => new LockCell(ctx)
    };
    const deleteIndex = defaultItems.findIndex((i) => i.id === "delete");
    return [
      ...defaultItems.slice(0, deleteIndex), // …showAuthor, plus the separator right before Delete
      lockItem,
      { kind: "separator" },
      ...defaultItems.slice(deleteIndex) // Delete itself
    ];
  }
});

Object.assign(window, { ogma, control, toolbar, locked });
