import { CanvasLayer, Ogma } from "@linkurious/ogma";
import { Renderer } from "./base";
import { Store } from "../store";

export class Handles extends Renderer<CanvasLayer> {
  constructor(ogma: Ogma, store: Store) {
    super(ogma, store);
    this.layer = ogma.layers.addCanvasLayer(this.render);
  }

  render = () => {};
}
