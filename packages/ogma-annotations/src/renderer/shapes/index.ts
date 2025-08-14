import { SVGLayer, SVGDrawingFunction, Ogma } from "@linkurious/ogma";
import { renderArrow } from "./arrow";
import { renderBox } from "./box";
import { renderText } from "./text";
import { getTransformMatrix } from "./utils";
import { DATA_ATTR } from "../../constants";
import { Store } from "../../store";
import { Id, isArrow, isBox, isText } from "../../types";
import { createSVGElement } from "../../utils";
import { Renderer } from "../base";

export class Shapes extends Renderer<SVGLayer> {
  private minArrowHeight = 20;
  private maxArrowHeight = 30;
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
    this.ogma.events.on("rotate", this._onRotate);
  }

  private _onRotate = () => {
    const view = this.ogma.view.get();
    const groups = this.layer.element.children;

    // update transforms for all the groups
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i] as SVGGElement;

      if (g.tagName.toLowerCase() !== "g") continue;
      if (!g.hasAttribute(DATA_ATTR)) {
        g.setAttribute("transform", `rotate(${-view.angle * (180 / Math.PI)})`);
        continue;
      }

      let id: Id = g.getAttribute(DATA_ATTR)!;
      if (isFinite(Number(id))) id = Number(id);
      const feature = this.store.getState().getFeature(id);
      if (feature && (isBox(feature) || isText(feature))) {
        g.setAttribute("transform", getTransformMatrix(feature, view));
      }
    }
  };

  render: SVGDrawingFunction = (root) => {
    const { features } = this.store.getState();
    root.innerHTML = "";
    const view = this.ogma.view.get();
    const styleContent = "";
    const arrowsRoot = createSVGElement<SVGGElement>("g");
    root.appendChild(arrowsRoot);
    for (const feature of Object.values(features)) {
      if (isBox(feature)) renderBox(root, feature, view);
      else if (isText(feature)) renderText(root, feature, view);
      else if (isArrow(feature))
        renderArrow(
          arrowsRoot,
          feature,
          view,
          this.minArrowHeight,
          this.maxArrowHeight
        );

      // Add more shape rendering logic as needed
    }
    const style = createSVGElement<SVGStyleElement>("style");
    style.innerHTML = styleContent;
    if (!root.firstChild) return;
    root.insertBefore(style, root.firstChild);
  };
}
