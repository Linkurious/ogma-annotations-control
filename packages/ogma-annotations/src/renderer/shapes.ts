import { SVGLayer, SVGDrawingFunction, Ogma } from "@linkurious/ogma";
import { Renderer } from "./base";
import { Store } from "../store";

export class Shapes extends Renderer<SVGLayer> {
  constructor(ogma: Ogma, store: Store) {
    super(ogma, store);
    this.layer = this.ogma.layers.addSVGLayer({
      draw: this.render
    });
  }

  render: SVGDrawingFunction = (root) => {
    const { features } = this.store.getState();
    console.log("Rendering shapes", root, features);
  };
}
