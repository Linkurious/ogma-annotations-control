import { SVGLayer, SVGDrawingFunction, Ogma } from "@linkurious/ogma";
import { applyTransform, renderArrow } from "./arrow";
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
        liveUpdates: state.liveUpdates,
        hoveredFeature: state.hoveredFeature,
        selectedFeatures: state.selectedFeatures
      }),
      () => {
        this.layer.refresh();
      },
      { equalityFn: (a, b) => a === b }
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
        applyTransform(g, view.angle);
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
    const { features, hoveredFeature, selectedFeatures } =
      this.store.getState();
    root.innerHTML = "";
    const view = this.ogma.view.get();

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
    }

    // Apply state classes after rendering
    this.applyStateClasses(root, hoveredFeature, selectedFeatures);
  };

  private applyStateClasses(
    root: SVGElement,
    hoveredFeature: string | number | null,
    selectedFeatures: Set<string | number>
  ) {
    // Apply hover state
    if (hoveredFeature !== null) {
      const hoveredElement = root.querySelector(
        `[data-annotation="${hoveredFeature}"]`
      );
      if (hoveredElement) {
        hoveredElement.classList.add("annotation-hovered");
      }
    }

    // Apply selected state
    selectedFeatures.forEach((featureId) => {
      const selectedElement = root.querySelector(
        `[data-annotation="${featureId}"]`
      );
      if (selectedElement) {
        selectedElement.classList.add("annotation-selected");
      }
    });
  }
}
