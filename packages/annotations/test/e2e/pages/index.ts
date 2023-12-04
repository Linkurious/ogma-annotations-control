import Ogma from "@linkurious/ogma";
import { Control, createArrow } from "../../../src";
import { AugmentedWindow } from "./types.ts";
declare global {
  // eslint-disable-next-line
  interface Window extends AugmentedWindow { }
}
function createOgma(options) {
  const ogma = new Ogma({
    container: "graph-container",
    ...options,
  });
  window.ogma = ogma;
  return ogma;
}
function createEditor() {
  const editor = new Control(ogma);
  window.editor = editor;
  return editor;
}
window.Ogma = Ogma;
window.Control = Control;
window.createOgma = createOgma;
window.createArrow = createArrow;
window.createEditor = createEditor;