import { render, fireEvent } from "@testing-library/react";
import React from "react";
import { vi, describe, beforeEach, it, expect, Mock } from "vitest";
import { FONTS } from "@linkurious/ogma-annotations/ui";
import { useAnnotationsContext } from "@linkurious/ogma-annotations-react";
import { FontController } from "../../../src/ui/controllers/Font";

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

  it("is a real keyboard-reachable button, not a div, with listbox/option semantics", () => {
    const { container } = render(
      <FontController annotation={annotation} currentFont={FONTS[0].value} />
    );
    const trigger = container.querySelector(".custom-select-trigger")!;
    expect(trigger.tagName).toBe("BUTTON");
    expect(trigger.getAttribute("aria-haspopup")).toBe("listbox");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.getAttribute("aria-label")).toBe(
      `Font: ${FONTS[0].label}`
    );

    const list = container.querySelector(".custom-select-options")!;
    expect(list.getAttribute("role")).toBe("listbox");

    const options = container.querySelectorAll(".custom-select-option");
    options.forEach((opt, i) => {
      expect(opt.tagName).toBe("BUTTON");
      expect(opt.getAttribute("role")).toBe("option");
      expect(opt.getAttribute("aria-selected")).toBe(
        String(FONTS[i].value === FONTS[0].value)
      );
    });
  });

  it("sets aria-expanded to true while open", () => {
    const { container } = render(
      <FontController annotation={annotation} currentFont={FONTS[0].value} />
    );
    const trigger = container.querySelector(".custom-select-trigger")!;
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });

  it("closes the dropdown on Escape from the trigger", () => {
    const { container } = render(
      <FontController annotation={annotation} currentFont={FONTS[0].value} />
    );
    const trigger = container.querySelector(".custom-select-trigger")!;
    fireEvent.click(trigger);
    expect(container.querySelector(".custom-select")!.className).toContain(
      "open"
    );

    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(
      container.querySelector(".custom-select")!.className
    ).not.toContain("open");
  });

  it("opening moves focus to the currently-selected option (roving tabIndex)", () => {
    const { container } = render(
      <FontController annotation={annotation} currentFont={FONTS[1].value} />
    );
    fireEvent.click(container.querySelector(".custom-select-trigger")!);

    const options = container.querySelectorAll<HTMLButtonElement>(
      ".custom-select-option"
    );
    expect(document.activeElement).toBe(options[1]);
    options.forEach((opt, i) => {
      expect(opt.tabIndex).toBe(i === 1 ? 0 : -1);
    });
  });

  it("ArrowDown/ArrowUp move the roving tabIndex and focus between options", () => {
    const { container } = render(
      <FontController annotation={annotation} currentFont={FONTS[0].value} />
    );
    fireEvent.click(container.querySelector(".custom-select-trigger")!);
    const options = container.querySelectorAll<HTMLButtonElement>(
      ".custom-select-option"
    );

    fireEvent.keyDown(options[0], { key: "ArrowDown" });
    expect(document.activeElement).toBe(options[1]);
    expect(options[1].tabIndex).toBe(0);
    expect(options[0].tabIndex).toBe(-1);

    fireEvent.keyDown(options[1], { key: "ArrowUp" });
    expect(document.activeElement).toBe(options[0]);
  });

  it("ArrowDown/ArrowUp clamp at the first/last option instead of wrapping", () => {
    const { container } = render(
      <FontController annotation={annotation} currentFont={FONTS[0].value} />
    );
    fireEvent.click(container.querySelector(".custom-select-trigger")!);
    const options = container.querySelectorAll<HTMLButtonElement>(
      ".custom-select-option"
    );

    fireEvent.keyDown(options[0], { key: "ArrowUp" });
    expect(document.activeElement).toBe(options[0]);

    fireEvent.keyDown(options[0], { key: "End" });
    expect(document.activeElement).toBe(options[options.length - 1]);

    fireEvent.keyDown(options[options.length - 1], { key: "ArrowDown" });
    expect(document.activeElement).toBe(options[options.length - 1]);

    fireEvent.keyDown(options[options.length - 1], { key: "Home" });
    expect(document.activeElement).toBe(options[0]);
  });

  it("Enter/Space on a focused option selects it and returns focus to the trigger", () => {
    const { container } = render(
      <FontController annotation={annotation} currentFont={FONTS[0].value} />
    );
    const trigger = container.querySelector(".custom-select-trigger")!;
    fireEvent.click(trigger);
    const options = container.querySelectorAll<HTMLButtonElement>(
      ".custom-select-option"
    );

    fireEvent.keyDown(options[0], { key: "ArrowDown" }); // -> options[1]
    fireEvent.keyDown(options[1], { key: "Enter" });

    expect(updateStyle).toHaveBeenCalledWith("a1", { font: FONTS[1].value });
    expect(container.querySelector(".custom-select")!.className).not.toContain(
      "open"
    );
    expect(document.activeElement).toBe(trigger);
  });

  it("Escape from an option closes the dropdown and returns focus to the trigger", () => {
    const { container } = render(
      <FontController annotation={annotation} currentFont={FONTS[0].value} />
    );
    const trigger = container.querySelector(".custom-select-trigger")!;
    fireEvent.click(trigger);
    const options = container.querySelectorAll<HTMLButtonElement>(
      ".custom-select-option"
    );

    fireEvent.keyDown(options[0], { key: "Escape" });

    expect(container.querySelector(".custom-select")!.className).not.toContain(
      "open"
    );
    expect(document.activeElement).toBe(trigger);
  });

  it("ArrowDown on the trigger opens the dropdown and moves focus in", () => {
    const { container } = render(
      <FontController annotation={annotation} currentFont={FONTS[0].value} />
    );
    const trigger = container.querySelector(".custom-select-trigger")!;
    fireEvent.keyDown(trigger, { key: "ArrowDown" });

    expect(container.querySelector(".custom-select")!.className).toContain(
      "open"
    );
    const options = container.querySelectorAll<HTMLButtonElement>(
      ".custom-select-option"
    );
    expect(document.activeElement).toBe(options[0]);
  });
});
