import Ogma, { Layer } from "@linkurious/ogma";
import type { Store } from "../store";

export abstract class Renderer<LayerType extends Layer = Layer> {
  protected layer!: LayerType;

  constructor(
    protected ogma: Ogma,
    protected store: Store
  ) {}
}
