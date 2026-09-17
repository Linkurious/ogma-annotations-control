import Ogma from "@linkurious/ogma";
import type { RawGraph } from "@linkurious/ogma";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Control, createCommentWithArrow, createBox, createArrow, SIDE_END, SIDE_START } from "../src";
import "./style.css";

Ogma.libraries["leaflet"] = L;

// Same dataset as ogma-copy/examples/geo-annotations: every node carries
// both a force-layout x/y (node-link mode) and a latitude/longitude (geo
// mode) - two deliberately unrelated layouts, so a shape that "follows the
// nodes" has to actually track live positions rather than happening to
// look right in one mode by coincidence.
const graph: RawGraph = {
  nodes: [
    {
      id: "Paris",
      data: { latitude: 48.858838, longitude: 2.343436 },
      attributes: { text: "Paris", x: 0, y: 220 }
    },
    {
      id: "London",
      data: { latitude: 51.509615, longitude: -0.134514 },
      attributes: { text: "London", x: -140, y: 20 }
    },
    {
      id: "Brussels",
      data: { latitude: 50.846557, longitude: 4.351697 },
      attributes: { text: "Brussels", x: 120, y: 70 }
    },
    {
      id: "Amsterdam",
      data: { latitude: 52.37403, longitude: 4.88969 },
      attributes: { text: "Amsterdam", x: 150, y: -60 }
    },
    {
      id: "Cologne",
      data: { latitude: 50.937531, longitude: 6.960279 },
      attributes: { text: "Cologne", x: 250, y: 90 }
    },
    {
      id: "Berlin",
      data: { latitude: 52.520008, longitude: 13.404954 },
      attributes: { text: "Berlin", x: 430, y: -20 }
    }
  ],
  edges: [
    { id: "e1", source: "Paris", target: "London", attributes: { text: "Eurostar" } },
    { id: "e2", source: "Paris", target: "Brussels", attributes: { text: "Thalys" } },
    { id: "e3", source: "Brussels", target: "Amsterdam", attributes: { text: "Thalys" } },
    { id: "e4", source: "Brussels", target: "Cologne", attributes: { text: "ICE" } },
    { id: "e5", source: "Cologne", target: "Berlin", attributes: { text: "ICE" } }
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
    text: { font: fontFamily, color: "#fff", backgroundColor: "#333", padding: 4, margin: 8, tip: false }
  },
  edgeAttributes: {
    color: "#0094FF",
    width: 4,
    stroke: { color: "#004A7F", width: 1 },
    text: { font: fontFamily, color: "#fff", backgroundColor: "#004A7F", padding: 4, margin: 4 }
  }
});

const control = new Control(ogma);

// The group of nodes a box would wrap, and the node a callout points at -
// same pairing as the reference example (Rhine-area cluster vs Paris HQ).
const GROUP = ["Brussels", "Amsterdam", "Cologne"];
const ANCHOR = "Paris";

// Run the layout *before* building any annotation - the dataset's authored
// x/y is just a force-layout seed on a much wider scale than the cluster
// it settles into, so annotating first and laying out after would drag
// everything arbitrarily far via the arrow's node-follow.
await ogma.layouts.force({ locate: true });

// Callout: comment + arrow linked to a live node via `control.link()`.
// `LinkSync` keeps the arrow pinned to the node through drags, layouts,
// and geo toggles (a render-only overlay, never committed - toggle the
// checkbox and it tracks, then returns to its exact original spot).
// Offset is in *screen* pixels, divided by zoom - a raw graph-unit offset
// would land some arbitrary distance away depending on current zoom.
const anchor = ogma.getNode(ANCHOR)!;
const { x: ax, y: ay } = anchor.getPosition();
const zoom = ogma.view.getZoom();
const calloutOffsetPx = 150;
const { comment, arrow } = createCommentWithArrow(
  ax,
  ay,
  ax - calloutOffsetPx / zoom,
  ay - calloutOffsetPx / zoom,
  "HQ · Paris",
  {
    commentStyle: {
      style: { color: "#2d00a6", background: "#ede6ff", fontSize: 14, font: fontFamily, padding: 8, borderRadius: 8 }
    },
    arrowStyle: { strokeType: "plain", strokeColor: "#2d00a6", strokeWidth: 2, head: "arrow" }
  }
);
control.add(comment);
control.add(arrow);
control.link(arrow.id, anchor, SIDE_END);

// Group box: NOT wired to follow the group (yet). This plugin has no link
// for "box wraps a *set* of nodes" today - that's #134, and it'll need
// implementing for every region shape (boxes, polygons, circles later),
// not just one. Placed once and left static on purpose, as the other half
// of the gap this example demonstrates - it'll drift off the cluster
// after the layout runs and again after any geo toggle.
const bb = ogma.getNodes(GROUP).getBoundingBox();
const groupBox = createBox(bb.minX - 40, bb.minY - 40, bb.width + 80, bb.height + 80, {
  strokeColor: "#e8346d",
  strokeWidth: 2,
  background: "rgba(232, 52, 109, 0.12)"
});
control.add(groupBox);

// Plain node-to-node arrow, no comment on either end - the case that
// originally exposed the geo-mode gap: `LinkSync.refresh()`'s viewChanged
// path only recomputes fixedSize (text/comment) targets, so a bare arrow
// like this wasn't reachable from it and silently froze on a geo toggle.
// Now tracks correctly via the same geoEnabled/geoDisabled overlay.
const london = ogma.getNode("London")!;
const routeArrow = createArrow(
  london.getPosition().x,
  london.getPosition().y,
  anchor.getPosition().x,
  anchor.getPosition().y,
  { strokeType: "plain", strokeColor: "#0094ff", strokeWidth: 2, head: "none" }
);
control.add(routeArrow);
control.link(routeArrow.id, london, SIDE_START);
control.link(routeArrow.id, anchor, SIDE_END);

// --- Geo / node-link switch -------------------------------------------------
const toggle = document.getElementById("geoToggle") as HTMLInputElement;
const status = document.getElementById("status")!;

toggle.addEventListener("change", async () => {
  status.textContent = "switching…";
  await ogma.geo.toggle({ duration: 500, disableNodeDragging: false });
  status.textContent = ogma.geo.enabled() ? "geo mode" : "node-link (force layout)";
});

Object.assign(window, { ogma, control, comment, arrow, groupBox, routeArrow });
