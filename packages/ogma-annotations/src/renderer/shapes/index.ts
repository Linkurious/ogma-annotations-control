import { SVGLayer, SVGDrawingFunction, Ogma } from "@linkurious/ogma";
import { renderArrow } from "./arrow";
import { renderBox } from "./box";
import { renderPolygon } from "./polygon";
import { renderText } from "./text";
import { LAYERS } from "../../constants";
import { Store } from "../../store";
import {
  Annotation,
  Bounds,
  Id,
  isArrow,
  isBox,
  isPolygon,
  isText
} from "../../types";
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
    this.layer = this.ogma.layers.addSVGLayer(
      {
        draw: this.render
      },
      LAYERS.SHAPES
    );
    this.store.subscribe(
      (state) => ({
        features: state.features,
        liveUpdates: state.liveUpdates,
        hoveredFeature: state.hoveredFeature,
        selectedFeatures: state.selectedFeatures,
        rotation: state.rotation,
        zoom: state.zoom
      }),
      () => this.layer.refresh(),
      { equalityFn: (a, b) => a === b }
    );
  }

  render: SVGDrawingFunction = (root) => {
    const { features, hoveredFeature, selectedFeatures, liveUpdates } =
      this.store.getState();
    root.innerHTML = "";

    const arrowsRoot = createSVGElement<SVGGElement>("g");
    const annotationsRoot = createSVGElement<SVGGElement>("g");
    annotationsRoot.appendChild(arrowsRoot);

    if (!this.root) this.root = createSVGElement<SVGGElement>("g");
    if (!this.arrowsRoot) this.arrowsRoot = createSVGElement<SVGGElement>("g");
    if (!this.annotationsRoot)
      this.annotationsRoot = createSVGElement<SVGGElement>("g");

    const state = this.store.getState();

    // Get viewport bounds for culling
    const viewportBounds = this.getViewportBounds();

    // delete features that are no longer present
    const featureIds = new Set(Object.keys(features));
    this.removeFeatures(featureIds);

    for (let feature of Object.values(features)) {
      if (liveUpdates[feature.id]) {
        feature = { ...feature, ...liveUpdates[feature.id] } as Annotation;
      }

      // Skip features outside viewport
      if (!this.isFeatureVisible(feature, viewportBounds)) continue;

      let existingElement = this.features.get(feature.id);
      if (isBox(feature))
        existingElement = renderBox(
          annotationsRoot,
          feature,
          existingElement,
          state
        );
      else if (isText(feature))
        existingElement = renderText(
          annotationsRoot,
          feature,
          existingElement,
          state
        );
      else if (isPolygon(feature))
        existingElement = renderPolygon(
          annotationsRoot,
          feature,
          existingElement,
          state
        );
      else if (isArrow(feature))
        existingElement = renderArrow(
          arrowsRoot,
          feature,
          this.minArrowHeight,
          this.maxArrowHeight,
          existingElement,
          state
        );
      if (existingElement) {
        this.features.set(feature.id, existingElement);
      }
    }

    // Apply state classes after rendering
    this.applyStateClasses(root, hoveredFeature, selectedFeatures);
    root.appendChild(annotationsRoot);
  };

  private getViewportBounds(): Bounds {
    const size = this.ogma.view.getSize();

    // Convert screen corners to graph coordinates
    const topLeft = this.ogma.view.screenToGraphCoordinates({ x: 0, y: 0 });
    const bottomRight = this.ogma.view.screenToGraphCoordinates({
      x: size.width,
      y: size.height
    });

    return [topLeft.x, topLeft.y, bottomRight.x, bottomRight.y];
  }

  private isFeatureVisible(feature: Annotation, viewport: Bounds): boolean {
    const bbox = feature.geometry.bbox;
    if (!bbox) return true; // If no bbox, render it to be safe

    const [x0, y0, x1, y1] = bbox;

    // Check if bboxes intersect
    return !(
      (
        x1 < viewport[0] || // feature is left of viewport
        x0 > viewport[2] || // feature is right of viewport
        y1 < viewport[1] || // feature is above viewport
        y0 > viewport[3]
      ) // feature is below viewport
    );
  }

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
    this.features.clear();
    this.layer.destroy();
    super.destroy();
  }
}
