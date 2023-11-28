import Ogma from "@linkurious/ogma";
import { Control } from "../../../src";
import { AugmentedWindow } from "./types.ts";
declare global {
  // eslint-disable-next-line
  interface Window extends AugmentedWindow { }
}
function createOgma(options) {
  const ogma = new Ogma({
    container: "app",
    ...options,
  });
  window.ogma = ogma;
  return ogma;
}
function createController(options) {
  const controller = new Control(
    window.ogma,
  );
  return controller;
}
window.Ogma = Ogma;
window.Control = Control;
window.createOgma = createOgma;