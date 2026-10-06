import { describe, it, expect } from "vitest";
import { renderComment } from "../../src/renderer/shapes/comment";
import { createComment } from "../../src";
import type { AnnotationState } from "../../src/store";

const state = {
  hoveredFeature: null,
  selectedFeatures: new Set(),
  editingFeature: null,
  options: {},
  getScreenAlignedTransform: () => ""
} as unknown as AnnotationState;

function icon(iconSymbol?: string, commentIcon?: string | ((c: any) => string | undefined)) {
  const root = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const c = createComment(0, 0, "hi", { mode: "collapsed", style: { iconSymbol } });
  const g = renderComment(
    root,
    c,
    undefined,
    { ...state, options: { commentIcon } } as unknown as AnnotationState,
    true
  );
  return { g, group: g.querySelector(".comment-icon")! };
}

describe("comment collapsed icon", () => {
  it("renders the built-in SVG bubble by default", () => {
    const { group } = icon();
    expect(group.querySelector("path")).toBeTruthy();
    expect(group.querySelector("text")).toBeNull();
  });

  it("renders a string symbol as text", () => {
    const { group } = icon("💬");
    expect(group.querySelector("text")!.textContent).toBe("💬");
    expect(group.querySelector("path")).toBeNull();
  });

  it("renders a custom <svg> string and strips unsafe content", () => {
    const { group } = icon(
      '<svg viewBox="0 0 24 24" onload="x()"><script>x()</script><circle r="5" fill="red" onclick="x()"/></svg>'
    );
    const svg = group.querySelector("svg")!;
    expect(svg.querySelector("circle")!.getAttribute("fill")).toBe("red");
    expect(svg.querySelector("script")).toBeNull();
    expect(svg.hasAttribute("onload")).toBe(false);
    expect(svg.querySelector("circle")!.hasAttribute("onclick")).toBe(false);
    expect(group.querySelector("text")).toBeNull();
  });

  it("renders nothing for invalid svg markup", () => {
    expect(icon("<svg><oops</svg>").group.querySelector("svg")).toBeNull();
  });

  it("falls back to the control-level commentIcon, own iconSymbol wins", () => {
    expect(icon(undefined, "🔔").group.querySelector("text")!.textContent).toBe("🔔");
    expect(icon("💬", "🔔").group.querySelector("text")!.textContent).toBe("💬");
  });

  it("supports a per-comment commentIcon callback", () => {
    const fn = (c: any) => (c.properties.content === "hi" ? "🔔" : undefined);
    expect(icon(undefined, fn).group.querySelector("text")!.textContent).toBe("🔔");
  });
});
