import { render, fireEvent } from "@testing-library/react";
import React from "react";
import { vi, describe, beforeEach, it, expect, Mock } from "vitest";
import { EXTREMITY_OPTIONS } from "@linkurious/ogma-annotations/ui";
import { useAnnotationsContext } from "@linkurious/ogma-annotations-react";
import { ExtremityController } from "./ExtremityController";

vi.mock("@linkurious/ogma-annotations-react", () => ({
  useAnnotationsContext: vi.fn()
}));

describe("ExtremityController", () => {
  let updateStyle: Mock;

  const makeAnnotation = (head: string, tail: string) =>
    ({
      id: "a1",
      properties: { style: { head, tail } }
    }) as never;

  beforeEach(() => {
    updateStyle = vi.fn();
    (useAnnotationsContext as Mock).mockReturnValue({
      editor: { updateStyle }
    });
  });

  it("renders a head and a tail selector", () => {
    const { getByText } = render(
      <ExtremityController annotation={makeAnnotation("none", "none")} />
    );
    expect(getByText("head")).toBeTruthy();
    expect(getByText("tail")).toBeTruthy();
  });

  it("lists every extremity option under each selector", () => {
    const { container } = render(
      <ExtremityController annotation={makeAnnotation("none", "none")} />
    );
    const wrappers = container.querySelectorAll(".extremity-wrapper");
    expect(wrappers.length).toBe(2);
    wrappers.forEach((wrapper) => {
      expect(
        wrapper.querySelectorAll(".custom-select-option").length
      ).toBe(EXTREMITY_OPTIONS.length);
    });
  });

  it("only opens one dropdown at a time", () => {
    const { container } = render(
      <ExtremityController annotation={makeAnnotation("none", "none")} />
    );
    const [head, tail] = container.querySelectorAll(".extremity-wrapper");

    fireEvent.click(head.querySelector(".custom-select-trigger")!);
    expect(head.querySelector(".custom-select")!.className).toContain("open");

    fireEvent.click(tail.querySelector(".custom-select-trigger")!);
    expect(head.querySelector(".custom-select")!.className).not.toContain(
      "open"
    );
    expect(tail.querySelector(".custom-select")!.className).toContain("open");
  });

  it("updates the head style independently of the tail", () => {
    const { container } = render(
      <ExtremityController annotation={makeAnnotation("none", "none")} />
    );
    const [head] = container.querySelectorAll(".extremity-wrapper");
    fireEvent.click(head.querySelector(".custom-select-trigger")!);

    const dotOption = Array.from(
      head.querySelectorAll(".custom-select-option")
    ).find((el) => el.getAttribute("title") === "Dot")!;
    fireEvent.click(dotOption);

    expect(updateStyle).toHaveBeenCalledWith("a1", { head: "dot" });
  });
});
