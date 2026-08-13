/**
 * Demo: placement and orientation options on the shipped style panel and
 * drawing toolbar - both `AnnotationPanel` and `AnnotationToolbar` from
 * `@linkurious/ogma-annotations/ui`, docked side by side for comparison.
 */
import Ogma from "@linkurious/ogma";
import { Control, createArrow } from "../src";
import {
  AnnotationPanel,
  AnnotationToolbar,
  type PanelPlacement,
  type PanelOrientation
} from "@linkurious/ogma-annotations/ui";
import "@linkurious/ogma-annotations/ui/styles.css";
import "./style.css";

const ogma = new Ogma({ container: "graph-container" });
const control = new Control(ogma);

await ogma.setGraph({
  nodes: [
    { id: 0, attributes: { x: -15, y: -15 } },
    { id: 1, attributes: { x: 15, y: -15 } },
    { id: 2, attributes: { x: 0, y: 15 } }
  ],
  edges: [
    { source: 0, target: 1 },
    { source: 1, target: 2 },
    { source: 2, target: 0 }
  ]
});
await ogma.view.set({ x: 0, y: 0, zoom: 0.5 }, { duration: 0 });

// Dock both inside the stage (right of the sidebar), not the full viewport -
// see the `container` option and the `#stage` CSS.
const stage = document.getElementById("stage")!;

// Both must be listening before we select, so the panel catches the event.
const panel = new AnnotationPanel({ control, container: stage });
const toolbar = new AnnotationToolbar({ control, container: stage });

// One annotation, pre-selected, so the panel is visible on load.
const arrow = createArrow(-40, 0, 40, 0);
control.add(arrow);
control.select(arrow.id);

function setActive(group: HTMLElement, selector: string) {
  group
    .querySelectorAll("button")
    .forEach((btn) => btn.classList.toggle("active", btn.matches(selector)));
}

/** Wires a button group to an `apply` callback, starting on `initial`. */
function wireDock(
  groupId: string,
  attr: "placement" | "orientation",
  initial: string,
  apply: (value: string) => void
) {
  const group = document.getElementById(groupId)!;
  group.querySelectorAll<HTMLButtonElement>("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const value = btn.dataset[attr]!;
      apply(value);
      setActive(group, `[data-${attr}="${value}"]`);
    });
  });
  setActive(group, `[data-${attr}="${initial}"]`);
}

wireDock("panel-placement-group", "placement", "right", (v) =>
  panel.setPlacement(v as PanelPlacement)
);
wireDock("panel-orientation-group", "orientation", "vertical", (v) =>
  panel.setOrientation(v as PanelOrientation)
);
wireDock("toolbar-placement-group", "placement", "bottom", (v) =>
  toolbar.setPlacement(v as PanelPlacement)
);
wireDock("toolbar-orientation-group", "orientation", "horizontal", (v) =>
  toolbar.setOrientation(v as PanelOrientation)
);

Object.assign(window, { ogma, control, panel, toolbar });
