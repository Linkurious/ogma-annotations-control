import Ogma from "@linkurious/ogma";
import { GUI } from "@linkurious/ogma-ui-kit/gui";
import {
  Control,
  createBox,
  createCommentWithArrow,
  type Arrow,
  type TargetType
} from "../src";
import { installBrand } from "./brand";
import "./style.css";

// Demonstrates `canDetach` and `onTargetRemoved` (ControllerOptions).
//   canDetach -> false (default): the connector can't be dragged off its
//     target. Unless `onTargetRemoved` is set, deleting the target deletes
//     the comment with it.
//   canDetach -> true: the connector can be dragged off, and (by default)
//     deleting the target leaves the comment with a free connector end.
//   onTargetRemoved -> 'detach': deleting the target keeps the comment
//     whatever canDetach says, and the `unlink` event fires. Use the
//     "Regroup" button: the group node is removed and recreated after 1s,
//     and the comment is relinked on `unlink` - it can't be dragged off
//     in the meantime.
const ogma = new Ogma({ container: "graph-container" });
installBrand(ogma);

const fontFamily = "IBM Plex Sans, sans-serif";

ogma.addNodes([
  { id: "n1", attributes: { x: -200, y: 0, radius: 18 } },
  { id: "n2", attributes: { x: 100, y: 0, radius: 18 } }
]);
const groupNode = {
  id: "g1",
  attributes: {
    x: 280,
    y: 60,
    radius: 30,
    color: "#ffd9a0",
    text: "group g1",
    innerStroke: { color: "#e08a00", width: 3 }
  }
};
ogma.addNode(groupNode);
ogma.addEdge({
  id: "e1",
  source: "n1",
  target: "n2",
  attributes: { color: "#7C4DFF", width: 3 }
});

const darkBlue = "#0056A6";

const box = createBox(-60, 120, 160, 60, {
  background: "#E6F5FF",
  strokeType: "plain",
  strokeColor: darkBlue,
  strokeWidth: 2,
  borderRadius: 8
});

const state = { canDetach: false, keepOnTargetRemoved: false };

const control = new Control(ogma, {
  canDetach: () => state.canDetach,
  // undefined -> falls back to canDetach
  onTargetRemoved: () =>
    state.keepOnTargetRemoved ? "detach" : state.canDetach ? "detach" : "delete"
});
control.add(box);

function attachComment(
  text: string,
  x: number,
  y: number,
  target: { id: string | number; type: TargetType },
  tipX: number,
  tipY: number
) {
  const { comment, arrow } = createCommentWithArrow(tipX, tipY, x, y, text, {
    commentStyle: {
      style: {
        color: darkBlue,
        background: "#fff",
        font: fontFamily,
        fontSize: 14
      }
    },
    arrowStyle: {
      strokeType: "plain",
      strokeColor: darkBlue,
      strokeWidth: 2,
      head: "arrow"
    }
  });
  (arrow as Arrow).properties.link = {
    ...arrow.properties.link,
    end: {
      side: "end",
      id: target.id,
      type: target.type,
      magnet: { x: 0, y: 0 }
    }
  };
  control.add(comment);
  control.add(arrow);
  return arrow;
}

attachComment("On node n1", 100, -140, { id: "n1", type: "node" }, -200, 0);
attachComment("On node n2", 200, -140, { id: "n2", type: "node" }, 100, 0);
attachComment("On edge e1", -50, -160, { id: "e1", type: "edge" }, -50, 0);
attachComment("On group g1", 330, -200, { id: "g1", type: "node" }, 280, 60);
attachComment("On box", 200, 220, { id: box.id, type: "box" }, 100, 150);

await ogma.view.set({ x: 50, y: 0, zoom: 0.8 }, { duration: 0 });

// Relink after a regroup: `unlink` tells us which connector lost its target.
const pending = new Set<string | number>();
control.on("unlink", ({ arrow, link }) => {
  if (link.target === "g1") pending.add(arrow.id);
  console.log("unlink", arrow.id, link.side, link.target);
});

function regroup() {
  if (!ogma.getNode("g1")) return;
  ogma.removeNode("g1");
  setTimeout(() => {
    ogma.addNode(groupNode);
    pending.forEach((id) => control.link(id, "g1", "end"));
    pending.clear();
  }, 1000);
}

// --- GUI -------------------------------------------------------------------
const gui = new GUI();
gui.add(state, "canDetach").name("canDetach (comments)");
gui
  .add(state, "keepOnTargetRemoved")
  .name("onTargetRemoved: detach (regardless of canDetach)");
gui.add({ regroup }, "regroup").name("Regroup g1 (remove, re-add in 1s)");
gui
  .add(
    { removeN1: () => ogma.getNode("n1") && ogma.removeNode("n1") },
    "removeN1"
  )
  .name("Remove node n1");
gui
  .add(
    { removeE1: () => ogma.getEdge("e1") && ogma.removeEdge("e1") },
    "removeE1"
  )
  .name("Remove edge e1");
gui
  .add(
    { removeBox: () => control.getAnnotation(box.id) && control.remove(box) },
    "removeBox"
  )
  .name("Delete box");

Object.assign(window, { ogma, control });
