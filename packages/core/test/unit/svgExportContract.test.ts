import { describe, it, expect } from "vitest";
import { renderText } from "../../src/renderer/shapes/text";
import { createText } from "../../src";
import type { AnnotationState } from "../../src/store";

/**
 * Pins the exact DOM shape `renderText` produces for a Text annotation's
 * content - not because this repo cares about the shape for its own sake,
 * but because an external consumer does: clients post-process the
 * exported SVG through `@linkurious/svg-font-embedder` to vectorize
 * custom fonts (turn <text>/<tspan> into <path>). That tool reads
 * font-family/font-size/fill/text-anchor off specific ancestor levels of
 * each run, and used to silently mis-locate all of them for this exact
 * shape, so every note's text was either dropped or mis-styled once
 * vectorized (now fixed upstream). See svgFontEmbedderIntegration.test.ts
 * for a test against the real post-processor; this one locks down the
 * shape it depends on so a future refactor that moves one of these
 * attributes doesn't silently reopen the same bug with zero signal here.
 */
function mockState(): AnnotationState {
  return {
    hoveredFeature: undefined,
    selectedFeatures: [],
    editingFeature: undefined,
    options: {},
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

describe("Text annotation export shape (contract external post-processors rely on)", () => {
  it("puts font-family/font-size on <text> itself, not a wrapping element", () => {
    const root = svgRoot();
    const text = createText(0, 0, 300, 150, "Sticky note\n\nMore text here", {
      font: "IBM Plex Sans",
      fontSize: 18
    });
    renderText(root, text, undefined, mockState());

    const textEl = root.querySelector(".annotation-text text");
    expect(textEl).not.toBeNull();
    expect(textEl!.getAttribute("font-family")).toBe("IBM Plex Sans");
    expect(textEl!.getAttribute("font-size")).toBe("18");
  });

  it("positions <text> via transform, not x/y attributes", () => {
    const root = svgRoot();
    const text = createText(10, 20, 300, 150, "Hello World");
    renderText(root, text, undefined, mockState());

    const textEl = root.querySelector(".annotation-text text")!;
    expect(textEl.getAttribute("x")).toBeNull();
    expect(textEl.getAttribute("y")).toBeNull();
    expect(textEl.getAttribute("transform")).toMatch(/^translate\(/);
  });

  it("gives every line an absolute-positioned <tspan>, never bare text on <text>", () => {
    const root = svgRoot();
    const text = createText(0, 0, 300, 150, "Sticky note\n\nMore text here");
    renderText(root, text, undefined, mockState());

    const textEl = root.querySelector(".annotation-text text")!;
    const tspans = Array.from(textEl.querySelectorAll("tspan"));
    expect(tspans.length).toBe(3);
    tspans.forEach((tspan) => {
      expect(tspan.getAttribute("x")).not.toBeNull();
      expect(tspan.getAttribute("y")).not.toBeNull();
      expect(tspan.getAttribute("dy")).toBeNull();
    });
    // textContent of <text> is only ever the concatenation of its tspans -
    // no direct text node child of its own.
    const directTextNodes = Array.from(textEl.childNodes).filter(
      (n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim()
    );
    expect(directTextNodes.length).toBe(0);
  });

  it("sets fill on the annotation group, not duplicated onto <text>", () => {
    const root = svgRoot();
    const text = createText(0, 0, 300, 150, "Hello World", {
      color: "#7c3aed"
    });
    renderText(root, text, undefined, mockState());

    const group = root.querySelector(".annotation-text")!;
    const textEl = group.querySelector("text")!;
    expect(group.getAttribute("fill")).toBe("#7c3aed");
    expect(textEl.getAttribute("fill")).toBeNull();
  });
});
