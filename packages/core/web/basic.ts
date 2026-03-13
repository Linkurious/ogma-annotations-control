import Ogma from "@linkurious/ogma";
import { Control, createComment } from "../src";
import { createDebugTools } from "./debug";
import "./style.css";

// Create an instance of Ogma and bind it to the graph-container.
const ogma = new Ogma({
  container: "graph-container"
});

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

document.getElementById("enable")!.addEventListener("click", () => {
  control.enableCommentDrawing({
    offsetX: 50,
    offsetY: -50,
    commentStyle: {
      content: "",
      style: {
        color: "#333",
        background: "#FFF",
        fontSize: 14,
        font: "IBM Plex Sans",
        padding: 8,
        borderRadius: 4
      }
    },
    arrowStyle: {
      style: {
        strokeType: "plain",
        strokeColor: "#2D00A6",
        strokeWidth: 2,
        head: "halo-dot"
      }
    }
  });
});

// Initialize debug tools
const debug = createDebugTools(ogma, control);

Object.assign(window, {
  ogma,
  control,
  createComment,
  debug
});
