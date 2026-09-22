import { render } from "@testing-library/react";
import React from "react";
import { describe, it, expect } from "vitest";
import { ICON_PATHS } from "@linkurious/ogma-annotations/ui";
import { Icon } from "./Icon";

describe("Icon", () => {
  it("renders the inner markup for the given icon name", () => {
    const { container } = render(<Icon name="trash" />);
    const svg = container.querySelector("svg")!;
    const expectedPathCount = (ICON_PATHS.trash.match(/<path/g) || []).length;
    expect(svg.querySelectorAll("path").length).toBe(expectedPathCount);
  });

  it("defaults to size 18 and no rotation", () => {
    const { container } = render(<Icon name="x" />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("width")).toBe("18");
    expect(svg.getAttribute("height")).toBe("18");
    expect(svg.style.transform).toBe("");
  });

  it("applies a custom size", () => {
    const { container } = render(<Icon name="x" size={32} />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("width")).toBe("32");
    expect(svg.getAttribute("height")).toBe("32");
  });

  it("applies the rotate style when rotate is true", () => {
    const { container } = render(<Icon name="arrow-right" rotate />);
    const svg = container.querySelector("svg")!;
    expect(svg.style.transform).toBe("rotate(180deg)");
  });

  it("forwards a custom className", () => {
    const { container } = render(<Icon name="x" className="my-icon" />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("class")).toBe("my-icon");
  });

  it("is hidden from assistive tech (decorative - the parent control supplies the label)", () => {
    const { container } = render(<Icon name="x" />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("aria-hidden")).toBe("true");
  });
});
