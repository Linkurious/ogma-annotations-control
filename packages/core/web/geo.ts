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

// --- Node-link view: force layout, deliberately unrelated to geography ----
//
// Run *before* building any annotation below. The dataset's authored x/y
// (used only as a force-layout seed) spans a much wider, differently-scaled
// range than the tight cluster the algorithm settles on - building
// annotations off the pre-layout positions, then running the layout after,
// would drag them arbitrarily far via the arrow's node-follow (and any
// fixed graph-unit offset, like the callout's below, would no longer be
// anywhere near "150 screen pixels" once the zoom-to-fit settles). Doing
// annotations after the layout is also just how a real user would build
// this scene - annotating the graph as currently shown, not as it used to
// be laid out.
await ogma.layouts.force({ locate: true });

// --- Callout: comment + arrow linked to a live graph node -----------------
//
// This is the part the plugin already models end-to-end: a comment with an
// arrow whose end is `control.link()`-ed to a node. `LinkSync` keeps the
// arrow's node-side endpoint pinned to that node whenever the node moves -
// drag, layout, or a geo mode toggle (see `LinkSync.onGeoModeChanged`: the
// toggle is treated as a derived, render-only overlay, never committed
// into node-link geometry - toggle the checkbox and watch this arrow
// track Paris, then toggle back and see it's exactly where it started).
//
// The callout's offset from the node is expressed in *screen* pixels and
// converted through the current zoom, same idea as the reference example's
// `u = 1/zoom` - a raw graph-unit offset would land some arbitrary distance
// away depending on how zoomed-in the current layout happens to be.
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

// --- Group box: NOT wired to follow the group (yet) ------------------------
//
// The reference example's box around [Brussels, Amsterdam, Cologne] is
// recomputed from `ogma.getNodes(GROUP).getBoundingBox()` on every draw -
// a box that lives around a *set* of nodes, not one. This plugin has no
// such link today (that's #134: region shapes following a group of
// contained nodes - and it'll need implementing for every shape that can
// wrap a region, not just polygons: boxes today, circles once that shape
// exists), so this box is placed once at start-up and left static - it
// will visibly drift off the cluster after the force layout runs and
// again after any geo toggle. Left in deliberately, as the second half of
// the gap this example exists to demonstrate, not fixed here.
const bb = ogma.getNodes(GROUP).getBoundingBox();
const groupBox = createBox(bb.minX - 40, bb.minY - 40, bb.width + 80, bb.height + 80, {
  strokeColor: "#e8346d",
  strokeWidth: 2,
  background: "rgba(232, 52, 109, 0.12)"
});
control.add(groupBox);

// --- Plain node-to-node arrow, no comment on either end --------------------
//
// Isolates the case that mattered for finding the gap in the first place:
// an arrow linked directly to two nodes, with no comment (fixedSize
// annotation) on either end. `LinkSync.refresh()` (the `viewChanged`
// listener) only walks annotations that are text-with-fixedSize or
// comments to decide what to recompute - a bare node-to-node arrow isn't
// reachable through that path at all. Before `LinkSync.onGeoModeChanged`
// existed, this arrow silently froze at its old node-link coordinates on
// a geo toggle while the comment's arrow above (reachable via the
// fixedSize path, by coincidence) kept following - now both track
// correctly, through the same `geoEnabled`/`geoDisabled`-driven overlay.
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
