import { describe, it, expect } from "vitest";
import { renderText, DEFAULT_AUTHOR_STYLE } from "../../src/renderer/shapes/text";
import { createText } from "../../src";
import type { AnnotationState } from "../../src/store";
import type { AuthorLineStyle } from "../../src/types";

// Minimal AnnotationState stub, extending linkRendering.test.ts's shape with
// `options.authorStyle` since drawContent() now reads the global default
// through it.
function mockState(authorStyle?: Partial<AuthorLineStyle>): AnnotationState {
  return {
    hoveredFeature: undefined,
    selectedFeatures: [],
    editingFeature: undefined,
    options: { authorStyle },
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

describe("author line rendering (renderText)", () => {
  it("renders when showAuthor is true and author is set", () => {
    const root = svgRoot();
    const text = createText(0, 0, 400, 200, "Some note content", {
      showAuthor: true
    });
    text.properties.author = "Jane Doe";

    renderText(root, text, undefined, mockState());

    const authorEl = root.querySelector(".annotation-text-author");
    expect(authorEl).not.toBeNull();
    expect(authorEl?.textContent).toBe("Jane Doe");
  });

  it("does not render when showAuthor is false", () => {
    const root = svgRoot();
    const text = createText(0, 0, 400, 200, "Some note content", {
      showAuthor: false
    });
    text.properties.author = "Jane Doe";

    renderText(root, text, undefined, mockState());

    expect(root.querySelector(".annotation-text-author")).toBeNull();
  });

  it("does not render when author is missing", () => {
    const root = svgRoot();
    const text = createText(0, 0, 400, 200, "Some note content", {
      showAuthor: true
    });

    renderText(root, text, undefined, mockState());

    expect(root.querySelector(".annotation-text-author")).toBeNull();
  });

  it("does not render when author is empty/whitespace-only", () => {
    const root = svgRoot();
    const text = createText(0, 0, 400, 200, "Some note content", {
      showAuthor: true
    });
    text.properties.author = "   ";

    renderText(root, text, undefined, mockState());

    expect(root.querySelector(".annotation-text-author")).toBeNull();
  });

  it("truncates a long author line with an ellipsis", () => {
    const root = svgRoot();
    // vitest-canvas-mock's TextMetrics reports width === text.length, so a
    // box narrower than the author string's char count is enough to force
    // wrapping/truncation without needing real font metrics.
    const text = createText(0, 0, 60, 200, "Some note content", {
      showAuthor: true
    });
    text.properties.author =
      "A very long author signature that will not fit on one line at all";

    renderText(root, text, undefined, mockState());

    const authorEl = root.querySelector(".annotation-text-author");
    expect(authorEl?.textContent?.endsWith("…")).toBe(true);
    expect(authorEl?.textContent?.length).toBeLessThan(
      text.properties.author.length
    );
  });

  it("per-annotation authorStyle overrides the global default", () => {
    const root = svgRoot();
    const text = createText(0, 0, 400, 200, "Some note content", {
      showAuthor: true,
      authorStyle: { color: "#222222" }
    });
    text.properties.author = "Jane Doe";

    renderText(root, text, undefined, mockState({ color: "#111111" }));

    const authorEl = root.querySelector(".annotation-text-author");
    expect(authorEl?.getAttribute("fill")).toBe("#222222");
  });

  it("applies the global authorStyle when there is no per-annotation override", () => {
    const root = svgRoot();
    const text = createText(0, 0, 400, 200, "Some note content", {
      showAuthor: true
    });
    text.properties.author = "Jane Doe";

    renderText(root, text, undefined, mockState({ color: "#111111" }));

    const authorEl = root.querySelector(".annotation-text-author");
    expect(authorEl?.getAttribute("fill")).toBe("#111111");
  });

  it("falls back to the built-in default when neither override is set", () => {
    const root = svgRoot();
    const text = createText(0, 0, 400, 200, "Some note content", {
      showAuthor: true
    });
    text.properties.author = "Jane Doe";

    renderText(root, text, undefined, mockState());

    const authorEl = root.querySelector(".annotation-text-author");
    expect(authorEl?.getAttribute("fill")).toBe(DEFAULT_AUTHOR_STYLE.color);
    expect(authorEl?.getAttribute("font-size")).toBe(
      `${DEFAULT_AUTHOR_STYLE.fontSize}`
    );
  });

  it("renders a clickable link inside the author line", () => {
    const root = svgRoot();
    const text = createText(0, 0, 400, 200, "Some note content", {
      showAuthor: true
    });
    text.properties.author = "Jane Doe - https://example.com";

    renderText(root, text, undefined, mockState());

    const authorEl = root.querySelector(".annotation-text-author");
    const link = authorEl?.querySelector("a.ogma-annotation-link");
    expect(link).toBeTruthy();
    expect(link?.getAttribute("href")).toBe("https://example.com");
  });

  it("renders a markdown-style author link with a label instead of the raw URL", () => {
    const root = svgRoot();
    const text = createText(0, 0, 400, 200, "Some note content", {
      showAuthor: true
    });
    text.properties.author = "Jane Doe - [reach out](https://example.com/contact)";

    renderText(root, text, undefined, mockState());

    const authorEl = root.querySelector(".annotation-text-author");
    const link = authorEl?.querySelector("a.ogma-annotation-link");
    expect(link?.textContent).toBe("reach out");
    expect(link?.getAttribute("href")).toBe("https://example.com/contact");
  });

  it("does not reserve space or change content when the author line is hidden", () => {
    const withoutAuthor = svgRoot();
    const textA = createText(0, 0, 200, 100, "Line one Line two Line three", {
      showAuthor: false
    });
    renderText(withoutAuthor, textA, undefined, mockState());

    const withAuthorHidden = svgRoot();
    const textB = createText(0, 0, 200, 100, "Line one Line two Line three", {
      showAuthor: false
    });
    textB.properties.author = "Jane Doe";
    renderText(withAuthorHidden, textB, undefined, mockState());

    const tspansA = withoutAuthor.querySelectorAll(".annotation-text tspan");
    const tspansB = withAuthorHidden.querySelectorAll(".annotation-text tspan");
    expect(tspansB.length).toBe(tspansA.length);
    expect(withAuthorHidden.querySelector(".annotation-text-author")).toBeNull();
  });
});
