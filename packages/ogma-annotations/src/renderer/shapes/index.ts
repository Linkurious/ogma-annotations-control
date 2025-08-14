import { SVGLayer, SVGDrawingFunction, Ogma, View } from "@linkurious/ogma";
import { renderBox } from "./box";
import { renderText } from "./text";
import { defaultStyle as defaultBoxStyle } from "../../Editor/Box/defaults";
import { defaultStyle as defaultTextStyle } from "../../Editor/Texts/defaults";
import { Store } from "../../store";
import { Arrow, Box, Text, isArrow, isBox, isText } from "../../types";
import {
  createSVGElement,
  getBoxPosition,
  getBoxSize,
  getTextSize
} from "../../utils";
import { rotateRadians } from "../../vec";
import { Renderer } from "../base";

export class Shapes extends Renderer<SVGLayer> {
  constructor(ogma: Ogma, store: Store) {
    super(ogma, store);
    this.layer = this.ogma.layers.addSVGLayer({
      draw: this.render
    });
    this.store.subscribe(
      (state) => ({
        features: state.features,
        liveUpdates: state.liveUpdates
      }),
      ({ features, liveUpdates }) => {
        const allFeatures = this.store.getState().getAllFeatures();
        this.layer.refresh();
      },
      { equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b) }
    );
  }

  render: SVGDrawingFunction = (root) => {
    const { features } = this.store.getState();
    root.innerHTML = "";
    const view = this.ogma.view.get();
    const styleContent = "";
    for (const feature of Object.values(features)) {
      if (isBox(feature)) renderBox(root, feature, view);
      else if (isText(feature)) renderText(root, feature, view);
      else if (isArrow(feature))
        this.renderArrow(root, feature, view, styleContent);

      // Add more shape rendering logic as needed
    }
    const style = createSVGElement<SVGStyleElement>("style");
    style.innerHTML = styleContent;
    if (!root.firstChild) return;
    root.insertBefore(style, root.firstChild);
  };

  renderArrow(root: SVGElement, arrow: Arrow, view: View, styles: string) {}
}
