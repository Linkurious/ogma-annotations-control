/**
 * Demo: placement and orientation options on the shipped style panel, plus
 * a demo-only drawing/undo-redo toolbar docked the same way for comparison
 * (the toolbar itself isn't a published component — only `AnnotationPanel`'s
 * `data-placement`/`data-orientation` docking is; see `ui/styles.css`).
 */
import Ogma from "@linkurious/ogma";
import { Control, createArrow } from "../src";
import {
  AnnotationPanel,
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

// Dock the panel inside the stage (right of the sidebar), not the full
// viewport - see the `container` option and the `#stage` CSS.
const stage = document.getElementById("stage")!;

// Panel must be listening before we select, so it catches the event.
const panel = new AnnotationPanel({ control, container: stage });

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

// The toolbar is plain demo markup (same `.control-bar` look as the main
// demo - see index.html/style.css), so placement is a dataset write and
// orientation is the same `.vertical` class the main demo uses for
// `#vis-controls`.
const toolbar = document.getElementById("drawing-toolbar")!;
wireDock("toolbar-placement-group", "placement", toolbar.dataset.placement!, (v) => {
  toolbar.dataset.placement = v;
});
wireDock(
  "toolbar-orientation-group",
  "orientation",
  toolbar.dataset.orientation!,
  (v) => {
    toolbar.classList.toggle("vertical", v === "vertical");
  }
);
toolbar.classList.toggle("vertical", toolbar.dataset.orientation === "vertical");

// Drawing/undo-redo toolbar actions - same pattern as the main demo
// (web/main.ts): disable + mark the tool button active while its drawing
// mode is armed, undo/redo/delete track history and selection state.
const tbArrow = document.getElementById("tb-arrow") as HTMLButtonElement;
const tbText = document.getElementById("tb-text") as HTMLButtonElement;
const tbUndo = document.getElementById("tb-undo") as HTMLButtonElement;
const tbRedo = document.getElementById("tb-redo") as HTMLButtonElement;
const tbDelete = document.getElementById("tb-delete") as HTMLButtonElement;

tbArrow.addEventListener("click", () => {
  if (tbArrow.disabled) return;
  tbArrow.disabled = true;
  tbArrow.classList.add("active");
  control.enableArrowDrawing({
    strokeType: "plain",
    strokeColor: "#3A03CF",
    strokeWidth: 2,
    head: "arrow"
  });
  const done = () => {
    tbArrow.disabled = false;
    tbArrow.classList.remove("active");
  };
  control.once("completeDrawing", done).once("cancelDrawing", done);
});

tbText.addEventListener("click", () => {
  if (tbText.disabled) return;
  tbText.disabled = true;
  tbText.classList.add("active");
  control.enableTextDrawing({
    font: "IBM Plex Sans",
    fontSize: 14,
    color: "#3A03CF"
  });
  const done = () => {
    tbText.disabled = false;
    tbText.classList.remove("active");
  };
  control.once("completeDrawing", done).once("cancelDrawing", done);
});

tbUndo.addEventListener("click", () => control.undo());
tbRedo.addEventListener("click", () => control.redo());
tbDelete.addEventListener("click", () => {
  const selected = control.getSelectedAnnotations();
  if (selected.features.length) control.remove(selected);
});

function updateUndoRedo() {
  tbUndo.disabled = !control.canUndo();
  tbRedo.disabled = !control.canRedo();
}
control.on("history", updateUndoRedo);
updateUndoRedo();

control.on("select", ({ ids }: { ids: (string | number)[] }) => {
  tbDelete.disabled = ids.length === 0;
});
control.on("unselect", () => {
  tbDelete.disabled = control.getSelectedAnnotations().features.length === 0;
});
tbDelete.disabled = control.getSelectedAnnotations().features.length === 0;

Object.assign(window, { ogma, control, panel });
