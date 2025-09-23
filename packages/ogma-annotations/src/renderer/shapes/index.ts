import { SVGLayer, SVGDrawingFunction, Ogma } from "@linkurious/ogma";
import { renderArrow } from "./arrow";
import { renderBox } from "./box";
import { renderText } from "./text";
import { Store } from "../../store";
import { Annotation, Id, isArrow, isBox, isText } from "../../types";
import { createSVGElement } from "../../utils";
import { Renderer } from "../base";

export class Shapes extends Renderer<SVGLayer> {
  private minArrowHeight = 20;
  private maxArrowHeight = 30;
  private features = new Map<Id, SVGGElement>();
  private root: SVGGElement | null = null;
  private arrowsRoot: SVGGElement | null = null;
  private annotationsRoot: SVGGElement | null = null;

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
    this.layer.refresh();
  };

  render: SVGDrawingFunction = (root) => {
    const { features, hoveredFeature, selectedFeatures, liveUpdates } =
      this.store.getState();
    root.innerHTML = "";
    const view = this.ogma.view.get();

    const arrowsRoot = createSVGElement<SVGGElement>("g");
    const annotationsRoot = createSVGElement<SVGGElement>("g");
    annotationsRoot.appendChild(arrowsRoot);

    if (!this.root) this.root = createSVGElement<SVGGElement>("g");
    if (!this.arrowsRoot) this.arrowsRoot = createSVGElement<SVGGElement>("g");
    if (!this.annotationsRoot)
      this.annotationsRoot = createSVGElement<SVGGElement>("g");

    // delete features that are no longer present
    const featureIds = new Set(Object.keys(features));
    this.removeFeatures(featureIds);

    for (let feature of Object.values(features)) {
      if (liveUpdates[feature.id]) {
        feature = { ...feature, ...liveUpdates[feature.id] } as Annotation;
      }

      const existingElement = this.features.get(feature.id);
      if (isBox(feature))
        renderBox(annotationsRoot, feature, view, existingElement);
      else if (isText(feature))
        renderText(annotationsRoot, feature, view, existingElement);
      else if (isArrow(feature))
        renderArrow(
          arrowsRoot,
          feature,
          view,
          this.minArrowHeight,
          this.maxArrowHeight,
          existingElement
        );
    }

    // Apply state classes after rendering
    this.applyStateClasses(root, hoveredFeature, selectedFeatures);
    root.appendChild(annotationsRoot);
  };

  private removeFeatures(featureIds: Set<Id>) {
    for (const id of this.features.keys()) {
      if (!featureIds.has(id)) {
        const element = this.features.get(id);
        if (element && element.parentNode) {
          element.parentNode.removeChild(element);
        }
        this.features.delete(id);
      }
    }
  }

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

  public refresh = (): void => {
    this.layer.refresh();
  };

  public destroy(): void {
    this.ogma.events.off(this._onRotate);
    this.layer.destroy();
    super.destroy();
  }
}
