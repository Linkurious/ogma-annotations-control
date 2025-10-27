import Ogma, { OgmaParameters } from "@linkurious/ogma";
import { Control, createArrow } from "../../../src";

export interface AugmentedWindow {
  Ogma: typeof Ogma;
  ogma: Ogma;
  editor: Control;
  Control: typeof Control;
  createOgma: <T extends OgmaParameters>(options: T) => Ogma;
  createEditor: () => Control;
  createArrow: typeof createArrow;
}
