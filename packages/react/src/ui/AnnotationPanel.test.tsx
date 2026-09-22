import { render } from "@testing-library/react";
import React from "react";
import { vi, describe, beforeEach, it, expect, Mock } from "vitest";
import { useAnnotationsContext } from "@linkurious/ogma-annotations-react";
import { AnnotationPanel } from "./AnnotationPanel";

// AnnotationPanel composes the already-tested controllers; mock the shared
// context they all read from so mounting doesn't require a real editor.
vi.mock("@linkurious/ogma-annotations-react", () => ({
  useAnnotationsContext: vi.fn()
}));

const arrow = {
  id: "1",
  properties: { type: "arrow", style: { strokeColor: "#000", strokeWidth: 2 } }
} as never;

const text = {
  id: "2",
  properties: {
    type: "text",
    content: "",
    style: { color: "#000", background: "#fff", font: "sans-serif" }
  }
} as never;

const box = {
  id: "3",
  properties: { type: "box", style: { color: "#000", background: "#fff" } }
} as never;

const comment = {
  id: "4",
  properties: {
    type: "comment",
    content: "",
    style: { color: "#000", background: "#fff" }
  }
} as never;

const polygon = {
  id: "5",
  properties: {
    type: "polygon",
    style: { strokeColor: "#000", background: "transparent" }
  }
} as never;

describe("AnnotationPanel", () => {
  beforeEach(() => {
    (useAnnotationsContext as Mock).mockReturnValue({
      editor: { updateStyle: vi.fn() }
    });
  });

  it("renders nothing when not visible", () => {
    const { container } = render(
      <AnnotationPanel visible={false} annotation={arrow} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when there is no annotation", () => {
    const { container } = render(
      <AnnotationPanel visible={true} annotation={null} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders arrow-specific sections for an arrow annotation", () => {
    const { getByText, queryByText } = render(
      <AnnotationPanel visible={true} annotation={arrow} />
    );
    expect(getByText("Color")).toBeTruthy();
    expect(getByText("Extremities")).toBeTruthy();
    expect(getByText("Stroke width")).toBeTruthy();
    expect(getByText("Line type")).toBeTruthy();
    expect(queryByText("Background")).toBeNull();
    expect(queryByText("Font")).toBeNull();
  });

  it("renders text-specific sections for a text annotation", () => {
    const { getByText } = render(
      <AnnotationPanel visible={true} annotation={text} />
    );
    expect(getByText("Color")).toBeTruthy();
    expect(getByText("Background")).toBeTruthy();
    expect(getByText("Font")).toBeTruthy();
    expect(getByText("Font size")).toBeTruthy();
    expect(getByText("Stroke width")).toBeTruthy();
    expect(getByText("Line type")).toBeTruthy();
  });

  it("treats box and comment annotations as text for panel purposes", () => {
    const boxPanel = render(<AnnotationPanel visible={true} annotation={box} />);
    expect(boxPanel.getByText("Font")).toBeTruthy();
    boxPanel.unmount();

    const commentPanel = render(
      <AnnotationPanel visible={true} annotation={comment} />
    );
    expect(commentPanel.getByText("Font")).toBeTruthy();
  });

  it("renders polygon-specific sections (Fill instead of Background, no Font)", () => {
    const { getByText, queryByText } = render(
      <AnnotationPanel visible={true} annotation={polygon} />
    );
    expect(getByText("Color")).toBeTruthy();
    expect(getByText("Fill")).toBeTruthy();
    expect(getByText("Stroke width")).toBeTruthy();
    expect(getByText("Line type")).toBeTruthy();
    expect(queryByText("Font")).toBeNull();
    expect(queryByText("Background")).toBeNull();
  });

  it("exposes placement and orientation as data attributes", () => {
    const { container } = render(
      <AnnotationPanel
        visible={true}
        annotation={arrow}
        placement="bottom-left"
        orientation="horizontal"
      />
    );
    const panel = container.querySelector(".annotation-panel")!;
    expect(panel.getAttribute("data-placement")).toBe("bottom-left");
    expect(panel.getAttribute("data-orientation")).toBe("horizontal");
  });

  it("is a labeled landmark region for screen-reader navigation", () => {
    const { container } = render(
      <AnnotationPanel visible={true} annotation={arrow} />
    );
    const panel = container.querySelector(".annotation-panel")!;
    expect(panel.getAttribute("role")).toBe("region");
    expect(panel.getAttribute("aria-label")).toBe("Annotation style panel");
  });
});
