import Ogma from "@linkurious/ogma";
import { Control, createComment } from "@linkurious/ogma-annotations";
import "./style.css";
//import "@linkurious/ogma-annotations/style.css";
// import "@linkurious/ogma-annotations/style.css";

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
await ogma.view.locateGraph();

document.getElementById("enable").addEventListener("click", () => {
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
