import { render, fireEvent } from "@testing-library/react";
import React from "react";
import { vi, describe, beforeEach, it, expect, Mock } from "vitest";
import { EXTREMITY_OPTIONS } from "@linkurious/ogma-annotations/ui";
import { useAnnotationsContext } from "@linkurious/ogma-annotations-react";
import { ExtremityController } from "../../../src/ui/controllers/ExtremityController";

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

  it("each side is a real keyboard-reachable button with listbox/option semantics", () => {
    const { container } = render(
      <ExtremityController annotation={makeAnnotation("none", "arrow")} />
    );
    const [head, tail] = container.querySelectorAll(".extremity-wrapper");

    const headTrigger = head.querySelector(".custom-select-trigger")!;
    expect(headTrigger.tagName).toBe("BUTTON");
    expect(headTrigger.getAttribute("aria-haspopup")).toBe("listbox");
    expect(headTrigger.getAttribute("aria-expanded")).toBe("false");
    expect(headTrigger.getAttribute("aria-label")).toBe("head: None");

    const tailTrigger = tail.querySelector(".custom-select-trigger")!;
    expect(tailTrigger.getAttribute("aria-label")).toBe("tail: Open Arrow");

    const headList = head.querySelector(".custom-select-options")!;
    expect(headList.getAttribute("role")).toBe("listbox");
    expect(headList.getAttribute("aria-label")).toBe("head options");

    head.querySelectorAll(".custom-select-option").forEach((opt) => {
      expect(opt.tagName).toBe("BUTTON");
      expect(opt.getAttribute("role")).toBe("option");
    });
  });

  it("sets aria-expanded on the trigger that is open", () => {
    const { container } = render(
      <ExtremityController annotation={makeAnnotation("none", "none")} />
    );
    const [head] = container.querySelectorAll(".extremity-wrapper");
    const headTrigger = head.querySelector(".custom-select-trigger")!;

    fireEvent.click(headTrigger);
    expect(headTrigger.getAttribute("aria-expanded")).toBe("true");
  });

  it("opening moves focus to the currently-selected option, with a roving tabIndex", () => {
    const { container } = render(
      <ExtremityController annotation={makeAnnotation("dot", "none")} />
    );
    const [head] = container.querySelectorAll(".extremity-wrapper");
    fireEvent.click(head.querySelector(".custom-select-trigger")!);

    const options = head.querySelectorAll<HTMLButtonElement>(
      ".custom-select-option"
    );
    const dotIndex = Array.from(options).findIndex(
      (o) => o.getAttribute("title") === "Dot"
    );
    expect(document.activeElement).toBe(options[dotIndex]);
    options.forEach((opt, i) => {
      expect(opt.tabIndex).toBe(i === dotIndex ? 0 : -1);
    });
  });

  it("ArrowDown/ArrowUp move the roving tabIndex within one side only", () => {
    const { container } = render(
      <ExtremityController annotation={makeAnnotation("none", "none")} />
    );
    const [head, tail] = container.querySelectorAll(".extremity-wrapper");
    fireEvent.click(head.querySelector(".custom-select-trigger")!);
    const headOptions = head.querySelectorAll<HTMLButtonElement>(
      ".custom-select-option"
    );

    fireEvent.keyDown(headOptions[0], { key: "ArrowDown" });
    expect(document.activeElement).toBe(headOptions[1]);

    // The tail dropdown wasn't touched - still closed, and its own
    // never-opened roving tabIndex is untouched by head's key handling
    // (display: none keeps it out of the tab order regardless either way).
    expect(tail.querySelector(".custom-select")!.className).not.toContain(
      "open"
    );
  });

  it("Enter on a focused option selects it, closes, and returns focus to that side's trigger", () => {
    const { container } = render(
      <ExtremityController annotation={makeAnnotation("none", "none")} />
    );
    const [head] = container.querySelectorAll(".extremity-wrapper");
    const headTrigger = head.querySelector(".custom-select-trigger")!;
    fireEvent.click(headTrigger);
    const options = head.querySelectorAll<HTMLButtonElement>(
      ".custom-select-option"
    );

    fireEvent.keyDown(options[0], { key: "ArrowDown" });
    fireEvent.keyDown(options[1], { key: "Enter" });

    expect(updateStyle).toHaveBeenCalledWith("a1", {
      head: EXTREMITY_OPTIONS[1].value
    });
    expect(head.querySelector(".custom-select")!.className).not.toContain(
      "open"
    );
    expect(document.activeElement).toBe(headTrigger);
  });

  it("Escape from an option closes that side and returns focus to its trigger", () => {
    const { container } = render(
      <ExtremityController annotation={makeAnnotation("none", "none")} />
    );
    const [head] = container.querySelectorAll(".extremity-wrapper");
    const headTrigger = head.querySelector(".custom-select-trigger")!;
    fireEvent.click(headTrigger);
    const options = head.querySelectorAll<HTMLButtonElement>(
      ".custom-select-option"
    );

    fireEvent.keyDown(options[0], { key: "Escape" });

    expect(head.querySelector(".custom-select")!.className).not.toContain(
      "open"
    );
    expect(document.activeElement).toBe(headTrigger);
  });
});
