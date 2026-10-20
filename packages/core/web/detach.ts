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

// Demonstrates `canDetach` (ControllerOptions).
//   canDetach -> false (default): the connector can't be dragged off its
//     target, and deleting the target deletes the comment with it.
//   canDetach -> true: the connector can be dragged off, and deleting the
//     target leaves the comment with a free connector end.
const ogma = new Ogma({ container: "graph-container" });
installBrand(ogma);

const fontFamily = "IBM Plex Sans, sans-serif";

ogma.addNodes([
  { id: "n1", attributes: { x: -200, y: 0,  radius: 18 } },
  { id: "n2", attributes: { x: 100, y: 0, radius: 18 } }
]);
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

const state = { canDetach: false };

const control = new Control(ogma, { canDetach: () => state.canDetach });
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
      style: { color: darkBlue, background: "#fff", font: fontFamily, fontSize: 14 }
    },
    arrowStyle: { strokeType: "plain", strokeColor: darkBlue, strokeWidth: 2, head: "arrow" }
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
}

attachComment("On node n1", 100, -140, { id: "n1", type: "node" }, -200, 0);
attachComment("On node n2", 200, -140, { id: "n2", type: "node" }, 100, 0);
attachComment("On edge e1", -50, -160, { id: "e1", type: "edge" }, -50, 0);
attachComment("On box", 200, 220, { id: box.id, type: "box" }, 100, 150);

await ogma.view.set({ x: 0, y: 0, zoom: 1 }, { duration: 0 });

// --- GUI -------------------------------------------------------------------
const gui = new GUI();
gui.add(state, "canDetach").name("canDetach (comments)");
gui
  .add({ removeN1: () => ogma.getNode("n1") && ogma.removeNode("n1") }, "removeN1")
  .name("Remove node n1");
gui
  .add({ removeE1: () => ogma.getEdge("e1") && ogma.removeEdge("e1") }, "removeE1")
  .name("Remove edge e1");
gui
  .add({ removeBox: () => control.getAnnotation(box.id) && control.remove(box) }, "removeBox")
  .name("Delete box");

Object.assign(window, { ogma, control });
