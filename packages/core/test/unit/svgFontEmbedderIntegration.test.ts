import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { describe, it, expect } from "vitest";
import processWithFontEmbedder from "@linkurious/svg-font-embedder";
import { renderText } from "../../src/renderer/shapes/text";
import { createText } from "../../src";
import type { AnnotationState } from "../../src/store";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Runs this app's real exported SVG through the real, published
 * `@linkurious/svg-font-embedder` post-processor - clients pipe every
 * exported note through it to vectorize custom fonts for vector graphics
 * editors. It used to drop or mis-position/mis-color every note's text
 * for this exact export shape (see svgExportContract.test.ts for the
 * shape itself); this locks in that the *actual* published fix still
 * handles it, not just that our local understanding of the shape hasn't
 * drifted.
 *
 * PINNED VERSION: devDependencies pins the exact stable release (1.1.0)
 * containing the fix, rather than a loose range - the package's `latest`
 * dist-tag still points at the old, broken 0.0.87 as of this writing, so
 * an unpinned/caret install would silently resolve to the broken version.
 * Re-check that before loosening this pin.
 */
const FONT_FAMILY = "IBM Plex Sans";
const FONT_WOFF2_BASE64 = readFileSync(
  resolve(__dirname, "../fixtures/fonts/ibm-plex-sans-subset.woff2.base64"),
  "utf-8"
).trim();

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

/** A standalone SVG document carrying a real exported note plus an
 * embedded `@font-face`, matching what `ogma.export.svg()` hands to the
 * post-processor in production. */
function buildNoteSvg(content: string, color = "#1a1a1a"): string {
  const svgNS = "http://www.w3.org/2000/svg";
  const root = document.createElementNS(svgNS, "svg") as unknown as SVGElement;
  root.setAttribute("xmlns", svgNS);
  root.setAttribute("width", "400");
  root.setAttribute("height", "300");

  const text = createText(20, 20, 300, 150, content, {
    font: FONT_FAMILY,
    fontSize: 18,
    color
  });
  renderText(root, text, undefined, mockState());

  const defs = document.createElementNS(svgNS, "defs");
  const style = document.createElementNS(svgNS, "style");
  style.textContent = `@font-face { font-family: '${FONT_FAMILY}'; src: url(data:application/octet-stream;base64,${FONT_WOFF2_BASE64}) format('woff2'); }`;
  defs.appendChild(style);
  root.insertBefore(defs, root.firstChild);

  return root.outerHTML;
}

describe("real @linkurious/svg-font-embedder against this app's export", () => {
  it("keeps a multi-line note's text visible after vectorization", () => {
    const svg = buildNoteSvg("Sticky note\n\nMore text here");
    const processed: string = processWithFontEmbedder(svg);
    const doc = new DOMParser().parseFromString(processed, "image/svg+xml");

    // No leftover <text>/<tspan> and no glyph paths stranded inside one -
    // the note's lines converted to standalone, valid <path> elements.
    expect(doc.querySelectorAll("text").length).toBe(0);
    expect(doc.querySelectorAll("text path").length).toBe(0);
    expect(doc.querySelectorAll("g[data-text] path").length).toBe(3);
  });

  it("keeps the converted text at the note's actual position", () => {
    const svg = buildNoteSvg("Hello World");
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
    const originalTransform = doc.querySelector("text")!.getAttribute("transform");

    const processed: string = processWithFontEmbedder(svg);
    const processedDoc = new DOMParser().parseFromString(processed, "image/svg+xml");
    const wrapper = processedDoc.querySelector("g[data-text]")!.parentElement!;

    expect(wrapper.getAttribute("transform")).toBe(originalTransform);
  });

  it("keeps the note's actual text color", () => {
    const svg = buildNoteSvg("Hello World", "#7c3aed");
    const processed: string = processWithFontEmbedder(svg);
    const doc = new DOMParser().parseFromString(processed, "image/svg+xml");

    expect(doc.querySelector("g[data-text] path")!.getAttribute("fill")).toBe(
      "#7c3aed"
    );
  });
});
