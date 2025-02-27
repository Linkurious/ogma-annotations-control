/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/ban-ts-comment */

import Ogma, { RawNode } from "@linkurious/ogma";
import { Control, createArrow, createText, AnnotationCollection } from "../src";
import { EVT_DRAG_END } from "../src/constants";

const ogma = new Ogma({
  container: "app",
});
const control = new Control(ogma);
//@ts-ignore
window.ogma = ogma;

ogma.styles.addRule({
  nodeAttributes: {
    color: "#5B97F8",
  },
  edgeAttributes: {
    color: "#c9c9c9",
  },
});

const annotationsWithLinks: AnnotationCollection = await fetch(
  "annotations.json"
).then((response) => response.json());

const graph = await ogma.generate.flower({ depth: 3 });

const nodesMap = graph.nodes.reduce(
  (acc, node, i) => {
    acc[node.id!] = node;
    node.id = `n${i}`;
    return acc;
  },
  {} as Record<string, RawNode>
);

graph.edges.forEach((edge) => {
  edge.source = nodesMap[edge.source].id!;
  edge.target = nodesMap[edge.target].id!;
});
await ogma.setGraph(graph);
await ogma.layouts.force({ locate: true });
control.add(annotationsWithLinks);

// @ts-ignore
window.control = control;
// @ts-ignore
window.createArrow = createArrow;

const addArrows = document.getElementById("add-arrow")! as HTMLButtonElement;
addArrows.addEventListener("click", () => {
  if (addArrows.disabled) return;
  addArrows.disabled = true;
  ogma.events.once("mousedown", (evt) => {
    const { x, y } = ogma.view.screenToGraphCoordinates(evt);
    const arrow = createArrow(x, y, x, y, {
      strokeWidth: 2,
      strokeColor: "#3A03CF",
      strokeType: "plain",
    });
    control.startArrow(x, y, arrow);
    control.once(EVT_DRAG_END, (a) => {
      if (a.id !== arrow.id) return;
      addArrows.disabled = false;
    });
  });
});
const addTexts = document.getElementById("add-text")! as HTMLButtonElement;

addTexts.addEventListener("click", () => {
  if (addTexts.disabled) return;
  addTexts.disabled = true;
  ogma.events.once("mousedown", (evt) => {
    const { x, y } = ogma.view.screenToGraphCoordinates(evt);
    const text = createText(x, y, 0, 0);
    control.startText(x, y, text);
    control.once(EVT_DRAG_END, (a) => {
      if (a.id !== text.id) return;
      addTexts.disabled = false;
    });
  });
});

document.addEventListener("keydown", (evt) => {
  if (evt.key === "Escape") {
    control.cancelDrawing();
  }
});

control.on("cancelDrawing", () => {
  console.log("cancelDrawing");
});
