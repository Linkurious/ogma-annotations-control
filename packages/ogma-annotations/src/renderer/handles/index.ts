import { CanvasLayer, Ogma } from "@linkurious/ogma";
import { renderArrow } from "./arrow";
import { renderBox } from "./box";
import { Store } from "../../store";
import { isArrow, isBox, isText, Text } from "../../types";
import { Renderer } from "../base";

export class Handles extends Renderer<CanvasLayer> {
  constructor(ogma: Ogma, store: Store) {
    super(ogma, store);
    this.layer = this.ogma.layers.addCanvasLayer((ctx) => this.render(ctx));
    this.store.subscribe(
      (state) => ({
        features: state.features,
        liveUpdates: state.liveUpdates,
        hoveredFeature: state.hoveredFeature,
        selectedFeatures: state.selectedFeatures
      }),
      () => {
        this.layer.refresh();
      },
      { equalityFn: (a, b) => a === b }
    );
  }

  render(ctx: CanvasRenderingContext2D) {
    const { selectedFeatures } = this.store.getState();
    const view = this.ogma.view.get();
    const angle = view.angle;
    selectedFeatures.forEach((id) => {
      const feature = this.store.getState().features[id];
      if (isArrow(feature)) renderArrow(ctx, feature);
      else if (isBox(feature))
        renderBox(ctx, angle, feature as unknown as Text);
      else if (isText(feature)) renderBox(ctx, angle, feature);
    });
  }
}
