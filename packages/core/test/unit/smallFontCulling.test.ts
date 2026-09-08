import { describe, it, expect } from "vitest";
import { renderText } from "../../src/renderer/shapes/text";
import { createText } from "../../src";
import type { AnnotationState } from "../../src/store";

// Mirrors authorLine.test.ts's mockState(), extended with `zoom` and
// `options.minReadableFontSize` - the two new inputs drawContent() reads
// to decide whether a scalable Text's on-screen font size is too small to
// render.
function mockState(overrides: {
  zoom?: number;
  minReadableFontSize?: number;
} = {}): AnnotationState {
  return {
    hoveredFeature: undefined,
    selectedFeatures: [],
    editingFeature: undefined,
    zoom: overrides.zoom ?? 1,
    options: { minReadableFontSize: overrides.minReadableFontSize ?? 0 },
    getScreenAlignedTransform: (x: number, y: number) =>
      `matrix(1, 0, 0, 1, ${x}, ${y})`,
    getRotationTransform: () => "matrix(1, 0, 0, 1, 0, 0)"
  } as unknown as AnnotationState;
}

function svgRoot(): SVGElement {
  return document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  ) as SVGElement;
}

describe("small on-screen font size culling (renderText)", () => {
  it("skips content text when zoomed-out effective size is below the threshold, but keeps the box", () => {
    const root = svgRoot();
    // fontSize 10 * zoom 0.1 = 1px on screen, under a 2px threshold.
    const text = createText(0, 0, 200, 100, "Hello there", { fontSize: 10 });

    renderText(root, text, undefined, mockState({ zoom: 0.1, minReadableFontSize: 2 }));

    expect(root.querySelector("text")).toBeNull();
    expect(root.querySelector("rect")).not.toBeNull();
  });

  it("still renders when the on-screen size is above the threshold", () => {
    const root = svgRoot();
    // fontSize 10 * zoom 1 = 10px, well above a 2px threshold.
    const text = createText(0, 0, 200, 100, "Hello there", { fontSize: 10 });

    renderText(root, text, undefined, mockState({ zoom: 1, minReadableFontSize: 2 }));

    expect(root.querySelector("text")).not.toBeNull();
  });

  it("skips the author line independently of content, when only its (smaller) font is sub-threshold", () => {
    const root = svgRoot();
    // Content at 10px * zoom 0.5 = 5px (visible); author's built-in default
    // fontSize (12, but *before* effective-size math it's the DEFAULT_AUTHOR_STYLE
    // fontSize, unrelated to content's) - force it below threshold via a tiny
    // authorStyle fontSize instead, to isolate the author-only case.
    const text = createText(0, 0, 200, 100, "Hello there", {
      fontSize: 10,
      showAuthor: true,
      authorStyle: { fontSize: 2 }
    });
    text.properties.author = "Jane Doe";

    renderText(root, text, undefined, mockState({ zoom: 0.5, minReadableFontSize: 2 }));

    // Content: 10 * 0.5 = 5px, renders.
    expect(root.querySelector("text")).not.toBeNull();
    // Author: 2 * 0.5 = 1px, skipped.
    expect(root.querySelector(".annotation-text-author")).toBeNull();
  });

  it("never skips fixedSize text, regardless of how low zoom is", () => {
    const root = svgRoot();
    const text = createText(0, 0, 200, 100, "Hello there", {
      fontSize: 10,
      fixedSize: true
    });

    renderText(root, text, undefined, mockState({ zoom: 0.001, minReadableFontSize: 2 }));

    expect(root.querySelector("text")).not.toBeNull();
  });

  it("does not skip while exporting, even when the zoomed-out size is sub-threshold", () => {
    const root = svgRoot();
    const text = createText(0, 0, 200, 100, "Hello there", { fontSize: 10 });

    renderText(
      root,
      text,
      undefined,
      mockState({ zoom: 0.1, minReadableFontSize: 2 }),
      /* isExporting */ true
    );

    expect(root.querySelector("text")).not.toBeNull();
  });

  it("is disabled when minReadableFontSize is 0 (the default)", () => {
    const root = svgRoot();
    const text = createText(0, 0, 200, 100, "Hello there", { fontSize: 10 });

    renderText(root, text, undefined, mockState({ zoom: 0.001, minReadableFontSize: 0 }));

    expect(root.querySelector("text")).not.toBeNull();
  });

  it("removes previously-rendered text once a re-render crosses the threshold (zooming out)", () => {
    const root = svgRoot();
    const text = createText(0, 0, 200, 100, "Hello there", { fontSize: 10 });

    const g = renderText(root, text, undefined, mockState({ zoom: 1, minReadableFontSize: 2 }));
    expect(root.querySelector("text")).not.toBeNull();

    renderText(root, text, g, mockState({ zoom: 0.1, minReadableFontSize: 2 }));

    expect(root.querySelector("text")).toBeNull();
    expect(root.querySelector("tspan")).toBeNull();
    expect(root.querySelector("a")).toBeNull();
    expect(root.querySelector("rect")).not.toBeNull();
  });
});
