import { render, fireEvent } from "@testing-library/react";
import React from "react";
import { vi, describe, beforeEach, it, expect, Mock } from "vitest";
import { LINE_TYPES } from "@linkurious/ogma-annotations/ui";
import { useAnnotationsContext } from "@linkurious/ogma-annotations-react";
import { LineTypeController } from "./LineTypeController";

vi.mock("@linkurious/ogma-annotations-react", () => ({
  useAnnotationsContext: vi.fn()
}));

describe("LineTypeController", () => {
  const annotation = { id: "a1" } as never;
  let updateStyle: Mock;

  beforeEach(() => {
    updateStyle = vi.fn();
    (useAnnotationsContext as Mock).mockReturnValue({
      editor: { updateStyle }
    });
  });

  it("renders a button for every configured line type", () => {
    const { container } = render(
      <LineTypeController annotation={annotation} currentLineType="plain" />
    );
    const buttons = container.querySelectorAll(".linetype-button");
    expect(buttons.length).toBe(LINE_TYPES.length);
  });

  it("marks the button matching currentLineType as active", () => {
    const { container } = render(
      <LineTypeController annotation={annotation} currentLineType="dashed" />
    );
    const active = container.querySelector(".linetype-button.active");
    expect(active?.getAttribute("title")).toBe("dashed");
    expect(active?.getAttribute("aria-pressed")).toBe("true");
  });

  it("exposes a group label and marks every non-active button aria-pressed=false", () => {
    const { container } = render(
      <LineTypeController annotation={annotation} currentLineType="plain" />
    );
    expect(
      container.querySelector(".linetype-section")?.getAttribute("aria-label")
    ).toBe("Line type");
    const dashed = Array.from(
      container.querySelectorAll(".linetype-button")
    ).find((btn) => btn.getAttribute("title") === "dashed")!;
    expect(dashed.getAttribute("aria-pressed")).toBe("false");
  });

  it("updates the annotation's strokeType when a line type is clicked", () => {
    const { container } = render(
      <LineTypeController annotation={annotation} currentLineType="plain" />
    );
    const dashedButton = Array.from(
      container.querySelectorAll(".linetype-button")
    ).find((btn) => btn.getAttribute("title") === "dashed")!;

    fireEvent.click(dashedButton);

    expect(updateStyle).toHaveBeenCalledWith("a1", { strokeType: "dashed" });
  });
});
