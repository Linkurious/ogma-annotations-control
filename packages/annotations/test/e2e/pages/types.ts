import Ogma from "@linkurious/ogma/dev";
import { Control, createArrow } from "../../../src";

export interface AugmentedWindow {
  Ogma: typeof Ogma;
  ogma: Ogma;
  editor: Control;
  Control: typeof Control;
  createOgma: (options: any) => Ogma;
  createEditor: () => Control;
  createArrow: typeof createArrow;
}