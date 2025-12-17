import { Ogma } from "@linkurious/ogma";
import { AugmentedWindow } from "./types.ts";
import { Control, createArrow } from "../../../src";
declare global {
  // eslint-disable-next-line
  interface Window extends AugmentedWindow {
    ogma: Ogma;
  }
}
function createOgma(options = {}) {
  const ogma = new Ogma({
    container: "graph-container",
    ...options
  });
  window.ogma = ogma;
  return ogma;
}

function createEditor() {
  const editor = new Control(window.ogma);
  window.editor = editor;
  return editor;
}
window.Ogma = Ogma;
window.Control = Control;
window.createOgma = createOgma;
window.createArrow = createArrow;
window.createEditor = createEditor;
