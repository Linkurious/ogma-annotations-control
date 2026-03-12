import Ogma from "@linkurious/ogma";
import { Control, createComment, isComment } from "../src";
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

// =============================================================================
// DEBUG: Comment bounds visualization
// Toggle with: window.toggleCommentDebug() or press 'D' key
// =============================================================================

let debugLayer: ReturnType<typeof ogma.layers.addCanvasLayer> | null = null;

function renderCommentDebug(ctx: CanvasRenderingContext2D) {
  const zoom = ogma.view.getZoom();
  const { features } = control.getAnnotations();

  features.forEach((annotation) => {
    if (!isComment(annotation)) return;
    const comment = annotation;

    const [cx, cy] = comment.geometry.coordinates;
    const { width, height } = comment.properties;

    // Comments have fixedSize: true, so convert pixel dimensions to graph space
    const graphWidth = width / zoom;
    const graphHeight = height / zoom;

    ctx.save();

    // Draw center point (red dot)
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(cx, cy, 5 / zoom, 0, Math.PI * 2);
    ctx.fill();

    // Draw bounding box in graph space (red rectangle)
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2 / zoom;
    ctx.setLineDash([5 / zoom, 5 / zoom]);
    ctx.strokeRect(
      cx - graphWidth / 2,
      cy - graphHeight / 2,
      graphWidth,
      graphHeight
    );
    ctx.setLineDash([]);

    // Draw arrow anchor point (bottom center) as blue dot
    ctx.fillStyle = "blue";
    ctx.beginPath();
    ctx.arc(cx, cy + graphHeight / 2, 5 / zoom, 0, Math.PI * 2);
    ctx.fill();

    // Draw text info
    ctx.fillStyle = "red";
    ctx.font = `${12 / zoom}px sans-serif`;
    ctx.fillText(
      `center: (${cx.toFixed(1)}, ${cy.toFixed(1)})`,
      cx + graphWidth / 2 + 10 / zoom,
      cy - graphHeight / 2
    );
    ctx.fillText(
      `size: ${width}x${height}px`,
      cx + graphWidth / 2 + 10 / zoom,
      cy - graphHeight / 2 + 15 / zoom
    );
    ctx.fillText(
      `graph: ${graphWidth.toFixed(1)}x${graphHeight.toFixed(1)}`,
      cx + graphWidth / 2 + 10 / zoom,
      cy - graphHeight / 2 + 30 / zoom
    );
    ctx.fillText(
      `zoom: ${zoom.toFixed(2)}`,
      cx + graphWidth / 2 + 10 / zoom,
      cy - graphHeight / 2 + 45 / zoom
    );

    ctx.restore();
  });
}

function toggleCommentDebug() {
  if (debugLayer) {
    debugLayer.destroy();
    debugLayer = null;
    console.log("Comment debug visualization: OFF");
  } else {
    debugLayer = ogma.layers.addCanvasLayer(renderCommentDebug);
    // Refresh on zoom/view changes and annotation updates
    ogma.events.on("viewChanged", () => debugLayer?.refresh());
    control.on("update", () => debugLayer?.refresh());
    console.log("Comment debug visualization: ON");
  }
}

// Press 'D' to toggle debug visualization
document.addEventListener("keydown", (e) => {
  if (e.key === "d" || e.key === "D") {
    toggleCommentDebug();
  }
});

Object.assign(window, {
  ogma,
  control,
  createComment,
  toggleCommentDebug
});

console.log("Press 'D' or call toggleCommentDebug() to show comment debug visualization");
