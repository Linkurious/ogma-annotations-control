import Ogma from "@linkurious/ogma";
import type { RawGraph } from "@linkurious/ogma";
import { GUI } from "@linkurious/ogma-ui-kit/gui";
import { Control, createCommentWithArrow, SIDE_END } from "../src";
import "./style.css";

// Small tree - reads cleanly under both a hierarchical and a force layout,
// which is the point: this demo exists to show a comment on *every* node
// surviving repeated, very different repositionings, not just one.
const graph: RawGraph = {
  nodes: [
    { id: "A" },
    { id: "B" },
    { id: "C" },
    { id: "D" },
    { id: "E" },
    { id: "F" },
    { id: "G" }
  ],
  edges: [
    { id: "e1", source: "A", target: "B" },
    { id: "e2", source: "A", target: "C" },
    { id: "e3", source: "B", target: "D" },
    { id: "e4", source: "B", target: "E" },
    { id: "e5", source: "C", target: "F" },
    { id: "e6", source: "C", target: "G" }
  ]
};

const ogma = new Ogma({ graph, container: "graph-container" });

const fontFamily = "IBM Plex Sans, sans-serif";
ogma.styles.addRule({
  nodeAttributes: {
    radius: 10,
    color: "#0094FF",
    outerStroke: { color: "#004A7F", width: 4, scalingMethod: "fixed" },
    innerStroke: { width: 3 },
    text: {
      font: fontFamily,
      color: "#fff",
      backgroundColor: "#333",
      padding: 4,
      margin: 8,
      tip: false,
      content: "id"
    }
  },
  edgeAttributes: {
    color: "#0094FF",
    width: 3,
    stroke: { color: "#004A7F", width: 1 }
  }
});

const control = new Control(ogma);

// Settle the graph into a real layout *before* attaching any comment - see
// web/geo.ts's comment on the same ordering: building annotations off
// positions that are about to move (rather than the ones they'll actually
// sit at) just means the first layout run drags them somewhere arbitrary
// via rigid-follow, for no reason.
await ogma.layouts.hierarchical({ direction: "TB", duration: 0, locate: true });

// One comment per node, each offset at a different angle around it (fixed
// screen-pixel radius, divided by zoom - same reasoning as geo.ts's
// callout) so they fan out rather than stacking on top of each other on a
// tree this compact.
const nodes = ogma.getNodes();
const zoom = ogma.view.getZoom();
const offsetPx = 90;
const commentColors = ["#2d00a6", "#a6006b", "#00806b", "#a65200", "#2d6b00", "#0056a6", "#6b00a6"];

nodes.forEach((node, i) => {
  const { x, y } = node.getPosition();
  const angle = (i / nodes.size) * Math.PI * 2 - Math.PI / 2;
  const dx = (Math.cos(angle) * offsetPx) / zoom;
  const dy = (Math.sin(angle) * offsetPx) / zoom;
  const color = commentColors[i % commentColors.length];

  const { comment, arrow } = createCommentWithArrow(
    x,
    y,
    x + dx,
    y + dy,
    `Node ${node.getId()}`,
    {
      commentStyle: {
        style: {
          color,
          background: "#fff",
          fontSize: 13,
          font: fontFamily,
          padding: 6,
          borderRadius: 6
        }
      },
      arrowStyle: { strokeType: "plain", strokeColor: color, strokeWidth: 2, head: "arrow" }
    }
  );
  control.add(comment);
  control.add(arrow);
  control.link(arrow.id, node, SIDE_END);
});

// --- GUI: apply a real layout, watch every comment follow its node ---------
const status = document.getElementById("status")!;

async function runLayout(name: string, run: () => Promise<unknown>) {
  hierarchicalController.disable();
  forceController.disable();
  status.textContent = `running ${name} layout…`;
  await run();
  status.textContent = `${name} layout applied - comments followed`;
  hierarchicalController.enable();
  forceController.enable();
}

// lil-gui (what ogma-ui-kit/gui wraps) renders a function property as a
// clickable button - same pattern the reference geo-annotations example
// uses for its mode toggle, just with actions instead of a settings object.
const actions = {
  hierarchicalLayout: () =>
    runLayout("hierarchical", () =>
      ogma.layouts.hierarchical({ direction: "TB", duration: 500, locate: true })
    ),
  forceLayout: () =>
    runLayout("force", () => ogma.layouts.force({ duration: 500, locate: true }))
};

const gui = new GUI();
const hierarchicalController = gui
  .add(actions, "hierarchicalLayout")
  .name("Hierarchical layout");
const forceController = gui.add(actions, "forceLayout").name("Force layout");

Object.assign(window, { ogma, control });
