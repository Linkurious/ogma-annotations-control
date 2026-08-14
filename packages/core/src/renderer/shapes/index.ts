import { SVGLayer, Ogma, Size } from "@linkurious/ogma";
import { renderArrow } from "./arrow";
import { renderBox } from "./box";
import { getCommentDefs, renderComment } from "./comment";
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
  isComment,
  isPolygon,
  isText
} from "../../types";
import { createSVGElement, throttle } from "../../utils/utils";
import { Renderer } from "../base";

export class Shapes extends Renderer<SVGLayer> {
  private features = new Map<Id, SVGGElement>();
  private arrowsRoot: SVGGElement | null = null;
  private shapesRoot: SVGGElement | null = null;
  private commentsRoot: SVGGElement | null = null;
  private annotationsRoot: SVGGElement | null = null;
  // Second SVG layer, moved below Ogma's own graph layer, that boxes and
  // polygons render into instead of `shapesRoot` - see `renderUnderGraph`.
  private underLayer!: SVGLayer;
  private underGraphRoot: SVGGElement | null = null;
  private visibleFeatures = new Set<Id>();
  private isExporting: boolean = false;
  constructor(ogma: Ogma, store: Store) {
    super(ogma, store);
    ogma.events.on("viewExportStart", this.onExportStart);
    ogma.events.on("afterImageExport", this.onExportEnd);
    this.layer = this.ogma.layers.addSVGLayer(
      {
        draw: this.render
      },
      LAYERS.SHAPES
    );
    // Boxes/polygons render behind the graph: create the layer, then send it
    // to the bottom of the stack (below the graph's own layer, which is
    // always registered before any plugin/Control code runs).
    this.underLayer = this.ogma.layers.addSVGLayer({
      draw: this.renderUnderGraph
    });
    this.underLayer.moveToBottom();
    this.store.subscribe(
      (state) => ({
        features: state.features,
        liveUpdates: state.liveUpdates,
        hoveredFeature: state.hoveredFeature,
        selectedFeatures: state.selectedFeatures,
        editingFeature: state.editingFeature,
        rotation: state.rotation,
        zoom: state.zoom
      }),
      this.throttleRender,
      {
        equalityFn: (a, b) => {
          const equal =
            a.features === b.features &&
            a.liveUpdates === b.liveUpdates &&
            a.hoveredFeature === b.hoveredFeature &&
            a.selectedFeatures === b.selectedFeatures &&
            a.editingFeature === b.editingFeature &&
            a.rotation === b.rotation &&
            a.zoom === b.zoom;
          return equal;
        }
      }
    );
  }

  render = (root: SVGSVGElement) => {
    //const root = this.layer.element;
    if (!root) return; // Guard against null root

    const { features, hoveredFeature, selectedFeatures, liveUpdates } =
      this.store.getState();
    // Initialize persistent container groups on first render
    if (!this.annotationsRoot || !root.contains(this.annotationsRoot)) {
      // Clear root only on first render
      root.innerHTML = "";

      // Add defs
      root.appendChild(this.getDefs());

      // Create persistent container groups
      this.arrowsRoot = createSVGElement<SVGGElement>("g");
      this.commentsRoot = createSVGElement<SVGGElement>("g");
      this.annotationsRoot = createSVGElement<SVGGElement>("g");
      this.shapesRoot = createSVGElement<SVGGElement>("g");
      this.annotationsRoot.appendChild(this.arrowsRoot);
      this.annotationsRoot.appendChild(this.shapesRoot);
      this.annotationsRoot.appendChild(this.commentsRoot);
      root.appendChild(this.annotationsRoot);
    }

    root.removeChild(this.annotationsRoot);

    const arrowsRoot = this.arrowsRoot!;
    const annotationsRoot = this.annotationsRoot!;
    const commentsRoot = this.commentsRoot!;
    const shapesRoot = this.shapesRoot!;

    const state = this.store.getState();

    // Get viewport bounds for culling
    const viewportBounds = this.getViewportBounds();

    // delete features that are no longer present
    this.removeFeatures(features);
    const visibleFeatures = new Set<Id>();
    for (let feature of Object.values(features)) {
      if (liveUpdates[feature.id]) {
        feature = { ...feature, ...liveUpdates[feature.id] } as Annotation;
      }

      // Skip features outside viewport
      if (!this.isExporting && !this.isFeatureVisible(feature, viewportBounds))
        continue;
      visibleFeatures.add(feature.id);
      // Boxes and polygons render on the under-graph layer instead - see
      // `renderUnderGraph`.
      if (isBox(feature) || isPolygon(feature)) continue;
      let existingElement = this.features.get(feature.id);
      if (isText(feature))
        existingElement = renderText(
          shapesRoot,
          feature,
          existingElement,
          state
        );
      else if (isComment(feature))
        existingElement = renderComment(
          commentsRoot,
          feature,
          existingElement,
          state,
          this.visibleFeatures.has(feature.id)
        );
      else if (isArrow(feature)) {
        existingElement = renderArrow(
          arrowsRoot,
          feature,
          state.options.minArrowHeight,
          state.options.maxArrowHeight,
          existingElement,
          state
        );
      }
      if (existingElement) this.features.set(feature.id, existingElement);
    }

    // Apply state classes after rendering
    this.applyStateClasses(annotationsRoot, hoveredFeature, selectedFeatures);
    root.appendChild(annotationsRoot);
    this.visibleFeatures.clear();
    this.visibleFeatures = visibleFeatures;
  };

  /** Draw callback for the under-graph layer: boxes and polygons only. */
  renderUnderGraph = (root: SVGSVGElement) => {
    if (!root) return;

    const { features, liveUpdates, hoveredFeature, selectedFeatures } =
      this.store.getState();

    if (!this.underGraphRoot || !root.contains(this.underGraphRoot)) {
      root.innerHTML = "";
      this.underGraphRoot = createSVGElement<SVGGElement>("g");
      root.appendChild(this.underGraphRoot);
    }

    root.removeChild(this.underGraphRoot);
    const underGraphRoot = this.underGraphRoot;

    const state = this.store.getState();
    const viewportBounds = this.getViewportBounds();
    this.removeFeatures(features);

    for (let feature of Object.values(features)) {
      if (!(isBox(feature) || isPolygon(feature))) continue;
      if (liveUpdates[feature.id]) {
        feature = { ...feature, ...liveUpdates[feature.id] } as Annotation;
      }
      if (!this.isExporting && !this.isFeatureVisible(feature, viewportBounds))
        continue;

      let existingElement = this.features.get(feature.id);
      if (isBox(feature))
        existingElement = renderBox(
          underGraphRoot,
          feature,
          existingElement,
          state
        );
      else if (isPolygon(feature))
        existingElement = renderPolygon(
          underGraphRoot,
          feature,
          existingElement,
          state
        );
      if (existingElement) this.features.set(feature.id, existingElement);
    }

    this.applyStateClasses(underGraphRoot, hoveredFeature, selectedFeatures);
    root.appendChild(underGraphRoot);
  };

  private throttleRender = throttle(
    () => {
      this.render(this.layer.element as unknown as SVGSVGElement);
      this.renderUnderGraph(this.underLayer.element as unknown as SVGSVGElement);
    },
    16,
    true
  );

  private getViewportBounds(): Bounds {
    const ogma = this.ogma;
    let viewSize: Size | null = null;
    try {
      viewSize = ogma.view.getSize();
    } catch {
      // Guard against errors during cleanup
      return [0, 0, 0, 0];
    }
    // Guard against null view during cleanup
    if (!viewSize) return [0, 0, 0, 0];
    const { width, height } = viewSize;
    const margin = 1.5;

    // Convert all four screen corners to graph coordinates to account for rotation
    const tl = ogma.view.screenToGraphCoordinates({ x: 0, y: 0 });
    const tr = ogma.view.screenToGraphCoordinates({ x: width * margin, y: 0 });
    const bl = ogma.view.screenToGraphCoordinates({ x: 0, y: height * margin });
    const br = ogma.view.screenToGraphCoordinates({
      x: width * margin,
      y: height * margin
    });

    return [
      Math.min(tl.x, tr.x, bl.x, br.x),
      Math.min(tl.y, tr.y, bl.y, br.y),
      Math.max(tl.x, tr.x, bl.x, br.x),
      Math.max(tl.y, tr.y, bl.y, br.y)
    ];
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

  private getDefs(): SVGDefsElement {
    // Add filter definitions
    const defs = createSVGElement<SVGDefsElement>("defs");

    // Add comment styles
    defs.appendChild(getCommentDefs());

    // Soft drop shadow filter
    // Figma box-shadow: 0px 1px 4px 0px #00000026
    const filter = createSVGElement<SVGFilterElement>("filter");
    filter.setAttribute("id", "softShadow");
    filter.setAttribute("x", "-50%");
    filter.setAttribute("y", "-50%");
    filter.setAttribute("width", "200%");
    filter.setAttribute("height", "200%");

    // 1. Blur the shape's alpha to make the shadow
    const feGaussianBlur =
      createSVGElement<SVGFEGaussianBlurElement>("feGaussianBlur");
    feGaussianBlur.setAttribute("in", "SourceAlpha");
    feGaussianBlur.setAttribute("stdDeviation", "2");
    feGaussianBlur.setAttribute("result", "blur");

    // 2. Shift the shadow (0px horizontal, 1px vertical)
    const feOffset = createSVGElement<SVGFEOffsetElement>("feOffset");
    feOffset.setAttribute("in", "blur");
    feOffset.setAttribute("dx", "0");
    feOffset.setAttribute("dy", "1");
    feOffset.setAttribute("result", "offsetBlur");

    // 3. Adjust opacity (#00000026 = 15% opacity)
    const feComponentTransfer = createSVGElement<SVGFEComponentTransferElement>(
      "feComponentTransfer"
    );
    feComponentTransfer.setAttribute("in", "offsetBlur");
    feComponentTransfer.setAttribute("result", "shadow");

    const feFuncA = createSVGElement<SVGFEFuncAElement>("feFuncA");
    feFuncA.setAttribute("type", "linear");
    feFuncA.setAttribute("slope", "0.25");

    feComponentTransfer.appendChild(feFuncA);

    // 4. Merge shadow + original shape
    const feMerge = createSVGElement<SVGFEMergeElement>("feMerge");

    const feMergeNode1 = createSVGElement<SVGFEMergeNodeElement>("feMergeNode");
    feMergeNode1.setAttribute("in", "shadow");

    const feMergeNode2 = createSVGElement<SVGFEMergeNodeElement>("feMergeNode");
    feMergeNode2.setAttribute("in", "SourceGraphic");

    feMerge.appendChild(feMergeNode1);
    feMerge.appendChild(feMergeNode2);

    // Assemble filter
    filter.appendChild(feGaussianBlur);
    filter.appendChild(feOffset);
    filter.appendChild(feComponentTransfer);
    filter.appendChild(feMerge);

    defs.appendChild(filter);
    return defs;
  }

  /**
   * Drop this class's cached DOM elements for any feature no longer in the
   * store. Takes `features` (not a pre-built id set) and builds the set from
   * the values' actual `id` here - `Object.keys()` always returns strings,
   * but `Id` can be numeric, and stringifying would make numeric-id features
   * never match, so they'd get needlessly removed/recreated every render.
   */
  private removeFeatures(features: Record<Id, Annotation>) {
    const featureIds = new Set(Object.values(features).map((f) => f.id));
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
    this.underLayer.refresh();
  };

  private onExportStart = () => {
    this.isExporting = true;
  };
  private onExportEnd = () => {
    this.isExporting = false;
  };
  public destroy(): void {
    this.features.clear();
    this.layer.destroy();
    this.underLayer.destroy();
    this.ogma.events.off(this.onExportStart);
    this.ogma.events.off(this.onExportEnd);
    super.destroy();
  }
}
