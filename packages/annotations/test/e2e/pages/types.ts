import Ogma from "@linkurious/ogma/dev";
import { Control } from "../../../src";

export interface AugmentedWindow {
  Ogma: typeof Ogma;
  ogma: Ogma;
  Control: typeof Control;
  createOgma: (options: any) => Ogma;
  createController: (options: any) => Control;
}