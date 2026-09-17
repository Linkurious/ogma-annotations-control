import { describe, it, expect } from "vitest";
import { renderText } from "../../src/renderer/shapes/text";
import { createText } from "../../src";
import type { AnnotationState } from "../../src/store";

// Regression test for: a blank line (consecutive "\n" in content) visually
// collapsing once a Text/sticky-note annotation is committed. Root cause -
// each line used to be positioned via a `dy` chained off the previous
// tspan; a blank line's tspan has zero characters, and browsers don't
// advance the SVG text-layout cursor by a tspan's dy when it has no glyphs
// to attach it to, so the blank line's vertical space silently vanished
// and the next line rendered right under the one before the gap. Fixed by
// giving every line an absolute `y` derived from its own index instead.
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

describe("blank line rendering (renderText)", () => {
  it("keeps every line's y position independent of earlier blank lines", () => {
    const root = svgRoot();
    const text = createText(0, 0, 300, 200, "Sticky note\n\nMore text here");

    renderText(root, text, undefined, mockState());

    const tspans = Array.from(root.querySelectorAll("tspan"));
    expect(tspans.map((t) => t.textContent)).toEqual([
      "Sticky note",
      "",
      "More text here"
    ]);

    // Each tspan must carry its own absolute `y`, not a `dy` chained off
    // the previous one - otherwise the blank tspan (no characters) can't
    // pass its vertical offset on to "More text here".
    const ys = tspans.map((t) => Number(t.getAttribute("y")));
    expect(tspans.every((t) => t.getAttribute("dy") === null)).toBe(true);
    expect(ys.every((y) => !Number.isNaN(y))).toBe(true);

    const [firstY, blankY, lastY] = ys;
    const lineHeight = blankY - firstY;
    expect(lineHeight).toBeGreaterThan(0);
    // The line after the blank one must be a full two line-heights below
    // the first line - i.e. the blank line still occupies its own row.
    expect(lastY - firstY).toBeCloseTo(2 * lineHeight, 5);
  });

  it("renders multiple consecutive blank lines with even spacing", () => {
    const root = svgRoot();
    const text = createText(0, 0, 300, 200, "a\n\n\nb");

    renderText(root, text, undefined, mockState());

    const tspans = Array.from(root.querySelectorAll("tspan"));
    expect(tspans.map((t) => t.textContent)).toEqual(["a", "", "", "b"]);

    const ys = tspans.map((t) => Number(t.getAttribute("y")));
    const step = ys[1] - ys[0];
    expect(step).toBeGreaterThan(0);
    for (let i = 1; i < ys.length; i++) {
      expect(ys[i] - ys[i - 1]).toBeCloseTo(step, 5);
    }
  });
});
