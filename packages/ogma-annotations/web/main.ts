/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/ban-ts-comment */

import Ogma, { RawNode } from "@linkurious/ogma";
import {
  Control,
  createArrow,
  createText,
  AnnotationCollection,
  createBox,
  getAnnotationsBounds
} from "../src";

const ogma = new Ogma({
  container: "app"
});
//@ts-ignore
window.ogma = ogma;

const control = new Control(ogma);

ogma.styles.addRule({
  nodeAttributes: {
    color: "#5B97F8"
  },
  edgeAttributes: {
    color: "#c9c9c9"
  }
});

const annotationsWithLinks: AnnotationCollection = await fetch(
  "annotations-test.json"
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
control.clearHistory();

const addArrows = document.getElementById("add-arrow")! as HTMLButtonElement;
addArrows.addEventListener("click", () => {
  if (addArrows.disabled) return;
  addArrows.disabled = true;
  ogma.events.once("mousedown", (evt) => {
    const { x, y } = ogma.view.screenToGraphCoordinates(evt);
    const arrow = createArrow(x, y, x, y, {
      strokeType: "plain",
      strokeColor: "#3A03CF",
      strokeWidth: 2,
      head: "arrow"
    });
    control.startArrow(x, y, arrow);
    control.once("completeDrawing", (a) => {
      if (a.id === arrow.id) addArrows.disabled = false;
    });
  });
});
const addTexts = document.getElementById("add-text")! as HTMLButtonElement;

addTexts.addEventListener("click", () => {
  if (addTexts.disabled) return;
  addTexts.disabled = true;
  ogma.events.once("mousedown", (evt) => {
    const { x, y } = ogma.view.screenToGraphCoordinates(evt);
    const text = createText(x, y, 0, 0, undefined, {
      font: "IBM Plex Sans",
      fontSize: 24,
      color: "#3A03CF",
      background: "#EDE6FF",
      //strokeWidth: 1,
      //strokeType: "dashed",
      borderRadius: 8,
      padding: 12
    });
    control.startText(x, y, text);
    control.once("completeDrawing", (a) => {
      if (a.id === text.id) addTexts.disabled = false;
    });
  });
});

const addBox = document.getElementById("add-box")! as HTMLButtonElement;
addBox.addEventListener("click", () => {
  if (addBox.disabled) return;
  addBox.disabled = true;
  ogma.events.once("mousedown", (evt) => {
    const { x, y } = ogma.view.screenToGraphCoordinates(evt);
    const box = createBox(x, y, 0, 0, {
      background: "#EDE6FF",
      //strokeWidth: 1,
      //strokeType: "dashed",
      borderRadius: 8,
      padding: 12
    });
    control.startBox(x, y, box);
    control.once("completeDrawing", (a) => {
      if (a.id === box.id) addBox.disabled = false;
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

document.querySelector("#add-comment")!.addEventListener("click", () => {
  control.cancelDrawing();
  ogma.events.once("click", (evt) => {
    // @ts-expect-error todo
    const { x, y } = ogma.view.screenToGraphCoordinates(evt);
    //const commentPosition = control.getCommentPosition(x, y);

    const comment = control.startComment(
      evt.x,
      evt.y,
      createText(evt.x, evt.y, 200, 100, "This is a comment", {
        color: "#3A03CF",
        background: "#EDE6FF",
        fontSize: 16,
        font: "IBM Plex Sans"
      })
    );
    console.log("Comment added:", comment);
  });
});

document.getElementById("undo")!.addEventListener("click", () => {
  control.undo();
});
document.getElementById("redo")!.addEventListener("click", () => {
  control.redo();
});
control.on("history", updateUndoRedoButtons);
updateUndoRedoButtons();

control.on("select", (selection) => {
  const button = document.getElementById("delete")! as HTMLButtonElement;
  button.disabled = selection.ids.length === 0;
});
document.getElementById("delete")!.addEventListener("click", () => {
  control.remove(control.getSelectedAnnotations());
});

function updateUndoRedoButtons() {
  (document.getElementById("undo")! as HTMLButtonElement).disabled =
    !control.canUndo();
  (document.getElementById("redo")! as HTMLButtonElement).disabled =
    !control.canRedo();
}

async function fit() {
  const bounds = ogma.view.getGraphBoundingBox();

  await ogma.view.moveToBounds(
    bounds.extend(getAnnotationsBounds(control.getAnnotations())),
    { duration: 200 }
  );
}

document.getElementById("center-view")!.addEventListener("click", async () => {
  await fit();
});
document.getElementById("export")!.addEventListener("click", () => {
  const annotations = control.getAnnotations();
  const dataStr =
    "data:text/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify(annotations, null, 2));
  const dl = document.createElement("a")!;
  document.body.appendChild(dl);
  dl.setAttribute("href", dataStr);
  dl.setAttribute("download", "annotations.json");
  dl.click();
  dl.remove();

  console.log("Exported annotations:", annotations);
});

document.getElementById("rotate-cw")!.addEventListener("click", async () => {
  await ogma.view.rotate(-Math.PI / 8, { duration: 200 });
});
document.getElementById("rotate-ccw")!.addEventListener("click", async () => {
  await ogma.view.rotate(Math.PI / 8, { duration: 200 });
});

document.addEventListener("keyup", (event) => {
  switch (event.key) {
    case "1":
      console.log("draw arrow keyup", event);
      break;
    // cmd + 0 = reset zoom
    case "0":
      fit();
      break;
    default:
      break;
  }
});

const bounds = getAnnotationsBounds(control.getAnnotations());
await ogma.view.moveToBounds(bounds, { duration: 0 });

// setTimeout(async () => {
//   await ogma.view.rotate(Math.PI / 8);
//   const bounds = getAnnotationsBounds(control.getAnnotations());
//   await ogma.view.moveToBounds(bounds, { duration: 0 });
// }, 1000);

// @ts-ignore
Object.assign(window, {
  Ogma,
  Control,
  createArrow,
  createText,
  createBox,
  control
});
