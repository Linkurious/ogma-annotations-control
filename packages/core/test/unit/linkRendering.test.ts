import { describe, it, expect } from "vitest";
import {
  createUrlPattern,
  isAnnotationLinkTarget,
  ANNOTATION_LINK_CLASS
} from "../../src/utils/rendering";
import { formatContent } from "../../src/renderer/shapes/comment";
import { renderText } from "../../src/renderer/shapes/text";
import { createText } from "../../src";
import type { AnnotationState } from "../../src/store";

// Minimal AnnotationState stub: the text renderer only reads hoveredFeature and
// the two transform helpers. Identity transforms (no rotation/zoom) are enough
// to exercise the URL → <a> path.
function mockState(): AnnotationState {
  return {
    hoveredFeature: undefined,
    selectedFeatures: [],
    editingFeature: undefined,
    getScreenAlignedTransform: (x: number, y: number) =>
      `matrix(1, 0, 0, 1, ${x}, ${y})`,
    getRotationTransform: () => "matrix(1, 0, 0, 1, 0, 0)"
  } as unknown as AnnotationState;
}

describe("URL pattern (createUrlPattern)", () => {
  it("matches http and https URLs", () => {
    expect("see https://example.com".match(createUrlPattern())).toEqual([
      "https://example.com"
    ]);
    expect("see http://example.com".match(createUrlPattern())).toEqual([
      "http://example.com"
    ]);
  });

  it("matches multiple URLs in one string", () => {
    const matches = "a https://one.com b https://two.com".match(
      createUrlPattern()
    );
    expect(matches).toEqual(["https://one.com", "https://two.com"]);
  });

  it("does not swallow a following < (so escaped HTML tags stay intact)", () => {
    const m = createUrlPattern().exec("https://example.com<next");
    expect(m?.[0]).toBe("https://example.com");
  });

  it("returns a fresh instance each call (no shared lastIndex)", () => {
    const a = createUrlPattern();
    const b = createUrlPattern();
    expect(a).not.toBe(b);
    a.exec("https://example.com");
    // b is untouched by a's exec
    expect(b.lastIndex).toBe(0);
  });

  it("does not match plain text", () => {
    expect("just some words".match(createUrlPattern())).toBeNull();
  });
});

describe("link target detection (isAnnotationLinkTarget)", () => {
  it("detects the anchor element itself", () => {
    const a = document.createElement("a");
    a.className = ANNOTATION_LINK_CLASS;
    expect(isAnnotationLinkTarget(a)).toBe(true);
  });

  it("detects a node nested inside the anchor", () => {
    const a = document.createElement("a");
    a.className = ANNOTATION_LINK_CLASS;
    const span = document.createElement("span");
    a.appendChild(span);
    expect(isAnnotationLinkTarget(span)).toBe(true);
  });

  it("returns false for a non-link element", () => {
    const div = document.createElement("div");
    expect(isAnnotationLinkTarget(div)).toBe(false);
  });

  it("returns false for null", () => {
    expect(isAnnotationLinkTarget(null)).toBe(false);
  });
});

describe("comment content formatting (formatContent)", () => {
  it("wraps a URL in an anchor with the themeable link class", () => {
    const html = formatContent("visit https://example.com now");
    expect(html).toContain('class="ogma-annotation-link"');
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("escapes HTML before linkifying (no XSS via raw markup)", () => {
    const html = formatContent('<img src=x onerror=alert(1)> https://ok.com');
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
    // the real URL is still linked
    expect(html).toContain('href="https://ok.com"');
  });

  it("does not produce an anchor when there is no URL", () => {
    expect(formatContent("plain text")).not.toContain("<a ");
  });

  it("returns empty string for empty content", () => {
    expect(formatContent("")).toBe("");
  });
});

describe("text annotation link rendering (renderText)", () => {
  it("renders URLs in text content as clickable SVG anchors", () => {
    const root = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    ) as SVGElement;
    const text = createText(0, 0, 400, 100, "Go to https://example.com today");

    renderText(root, text, undefined, mockState());

    const anchors = root.querySelectorAll("a");
    expect(anchors.length).toBeGreaterThan(0);
    const a = anchors[0];
    expect(a.getAttribute("href")).toBe("https://example.com");
    expect(a.getAttribute("class")).toBe("ogma-annotation-link");
    expect(a.getAttribute("target")).toBe("_blank");
    expect(a.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("does not create anchors for plain text", () => {
    const root = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    ) as SVGElement;
    const text = createText(0, 0, 400, 100, "no links here");

    renderText(root, text, undefined, mockState());

    expect(root.querySelectorAll("a").length).toBe(0);
  });
});
