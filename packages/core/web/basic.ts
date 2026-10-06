import Ogma from "@linkurious/ogma";
import { Control, createComment } from "../src";
import { createDebugTools } from "./debug";
import { installBrand } from "./brand";
import "./style.css";

// Create an instance of Ogma and bind it to the graph-container.
const ogma = new Ogma({
  container: "graph-container"
});
installBrand(ogma);

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

// Collapsed comments showing the three icon kinds: default SVG bubble,
// emoji text, and a custom colorful SVG string.
const heart =
  '<svg viewBox="0 0 24 24"><path d="M12 21s-8-5.3-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.7-8 11-8 11Z" fill="#e91e63"/><circle cx="8.5" cy="9" r="1.5" fill="#fff" opacity=".6"/></svg>';
[
  [-60, -40, "Default SVG bubble", undefined],
  [0, -40, "Emoji icon", "💬"],
  [60, -40, "Custom colorful SVG", heart]
].forEach(([x, y, text, iconSymbol]) =>
  control.add(
    createComment(x as number, y as number, text as string, {
      mode: "collapsed",
      style: { iconSymbol: iconSymbol as string | undefined }
    })
  )
);

// Initialize debug tools
const debug = createDebugTools(ogma, control);

Object.assign(window, {
  ogma,
  control,
  createComment,
  debug
});
