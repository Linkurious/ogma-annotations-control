import { render, fireEvent } from "@testing-library/react";
import React from "react";
import { vi, describe, beforeEach, it, expect, Mock } from "vitest";
import { FONTS } from "@linkurious/ogma-annotations/ui";
import { useAnnotationsContext } from "@linkurious/ogma-annotations-react";
import { FontController } from "./FontController";

vi.mock("@linkurious/ogma-annotations-react", () => ({
  useAnnotationsContext: vi.fn()
}));

describe("FontController", () => {
  const annotation = { id: "a1" } as never;
  let updateStyle: Mock;

  beforeEach(() => {
    updateStyle = vi.fn();
    (useAnnotationsContext as Mock).mockReturnValue({
      editor: { updateStyle }
    });
  });

  it("shows the label of the currently selected font", () => {
    const { container } = render(
      <FontController annotation={annotation} currentFont={FONTS[1].value} />
    );
    const trigger = container.querySelector(".custom-select-trigger")!;
    expect(trigger.textContent).toContain(FONTS[1].label);
  });

  it("falls back to the first font for an unknown currentFont", () => {
    const { container } = render(
      <FontController annotation={annotation} currentFont="unknown-font" />
    );
    const trigger = container.querySelector(".custom-select-trigger")!;
    expect(trigger.textContent).toContain(FONTS[0].label);
  });

  it("lists every configured font as an option", () => {
    const { container } = render(
      <FontController annotation={annotation} currentFont={FONTS[0].value} />
    );
    expect(container.querySelectorAll(".custom-select-option").length).toBe(
      FONTS.length
    );
  });

  it("toggles open when the trigger is clicked", () => {
    const { container } = render(
      <FontController annotation={annotation} currentFont={FONTS[0].value} />
    );
    const select = container.querySelector(".custom-select")!;
    expect(select.className).not.toContain("open");

    fireEvent.click(container.querySelector(".custom-select-trigger")!);
    expect(select.className).toContain("open");
  });

  it("updates the annotation's font and closes the dropdown on selection", () => {
    const { container } = render(
      <FontController annotation={annotation} currentFont={FONTS[0].value} />
    );
    fireEvent.click(container.querySelector(".custom-select-trigger")!);

    const options = container.querySelectorAll(".custom-select-option");
    fireEvent.click(options[2]);

    expect(updateStyle).toHaveBeenCalledWith("a1", { font: FONTS[2].value });
    expect(container.querySelector(".custom-select")!.className).not.toContain(
      "open"
    );
  });
});
