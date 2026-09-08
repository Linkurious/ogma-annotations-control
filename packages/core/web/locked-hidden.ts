import Ogma from "@linkurious/ogma";
import { GUI } from "@linkurious/ogma-ui-kit/gui";
import {
  Control,
  createArrow,
  createBox,
  createCommentWithArrow,
  createText
} from "../src";
import "./style.css";

// This demo exists to show `isEditable`/`isVisible` (packages/core/src/types/index.ts,
// ControllerOptions) actually working: no graph, just annotations, so
// there's nothing else for a checkbox toggle to explain away.
const ogma = new Ogma({ container: "graph-container" });

const fontFamily = "IBM Plex Sans, sans-serif";

const text = createText(-260, -80, 160, 60, "Sticky note", {
  color: "#2D00A6",
  background: "#EDE6FF",
  font: fontFamily,
  fontSize: 16,
  borderRadius: 8,
  padding: 10
});
const box = createBox(-60, -80, 160, 60, {
  background: "#E6F5FF",
  strokeType: "plain",
  strokeColor: "#0056A6",
  strokeWidth: 2,
  borderRadius: 8
});
const { comment, arrow: commentArrow } = createCommentWithArrow(
  260,
  30,
  260,
  -90,
  "Comment",
  {
    commentStyle: {
      style: { color: "#00806B", background: "#fff", font: fontFamily, fontSize: 14 }
    },
    arrowStyle: { strokeType: "plain", strokeColor: "#00806B", strokeWidth: 2, head: "arrow" }
  }
);
const arrow = createArrow(-60, 60, 140, 60, {
  strokeType: "plain",
  strokeColor: "#A65200",
  strokeWidth: 2,
  head: "arrow"
});

// `state`'s booleans are what the GUI checkboxes below actually bind to -
// isEditable/isVisible just read them at call time. Keyed by name (not id)
// purely so the GUI labels read cleanly.
const state = {
  note: { locked: false, hidden: false },
  box: { locked: false, hidden: false },
  comment: { locked: false, hidden: false },
  arrow: { locked: false, hidden: false }
};
const groupOf: Record<string, keyof typeof state> = {
  [text.id]: "note" as const,
  [box.id]: "box" as const,
  [comment.id]: "comment" as const,
  [commentArrow.id]: "comment" as const,
  [arrow.id]: "arrow" as const
};

// Rebuilds isEditable/isVisible as fresh closures over the *current* state
// and hands them to setOptions - a stale-reference pair (e.g. the same
// function passed twice) is a no-op, since options are merged by reference,
// not diffed by content. Called after every checkbox change below.
function applyState() {
  control.setOptions({
    isEditable: (a) => !state[groupOf[a.id]]?.locked,
    isVisible: (a) => !state[groupOf[a.id]]?.hidden
  });
  control.unselect();
}

const control = new Control(ogma);
applyState(); // seed isEditable/isVisible from the (all-false) initial state

control.add(text);
control.add(box);
// createCommentWithArrow already bakes the comment-side link into the
// arrow's own data (see its own source) - adding it is enough to register
// it, same as web/layouts.ts's comments.
control.add(comment);
control.add(commentArrow);
control.add(arrow);

await ogma.view.set({ x: 0, y: 0, zoom: 1 }, { duration: 0 });

// --- GUI -------------------------------------------------------------------
const gui = new GUI();

const groups: { key: keyof typeof state; label: string }[] = [
  { key: "note", label: "Sticky note" },
  { key: "box", label: "Box" },
  { key: "comment", label: "Comment" },
  { key: "arrow", label: "Arrow" }
];
for (const { key, label } of groups) {
  const folder = gui.addFolder(label);
  folder.add(state[key], "locked").name("Locked").onChange(applyState);
  folder.add(state[key], "hidden").name("Hidden").onChange(applyState);
}

// Proves isVisible only affects rendering/interaction, not the data API -
// a hidden annotation's full data still comes back here.
gui
  .add(
    {
      logAnnotations: () =>
        // eslint-disable-next-line no-console
        console.log(control.getAnnotations())
    },
    "logAnnotations"
  )
  .name("Log annotations");

Object.assign(window, { ogma, control });
