import { render, fireEvent } from "@testing-library/react";
import React from "react";
import { vi, describe, beforeEach, it, expect, Mock } from "vitest";
import { DEFAULT_RECENT_COLORS } from "@linkurious/ogma-annotations/ui";
import { useAnnotationsContext } from "@linkurious/ogma-annotations-react";
import { ColorController } from "../../../src/ui/controllers/ColorController";

vi.mock("@linkurious/ogma-annotations-react", () => ({
  useAnnotationsContext: vi.fn()
}));

describe("ColorController", () => {
  const annotation = { id: "a1" } as never;
  let updateStyle: Mock;

  beforeEach(() => {
    updateStyle = vi.fn();
    (useAnnotationsContext as Mock).mockReturnValue({
      editor: { updateStyle }
    });
  });

  it("renders a swatch for every recent color", () => {
    const { container } = render(
      <ColorController
        annotation={annotation}
        mode="arrow"
        initialColor={DEFAULT_RECENT_COLORS[0]}
      />
    );
    expect(container.querySelectorAll(".color-circle").length).toBe(
      DEFAULT_RECENT_COLORS.length
    );
  });

  it("marks the swatch matching initialColor as primary", () => {
    const { container } = render(
      <ColorController
        annotation={annotation}
        mode="arrow"
        initialColor={DEFAULT_RECENT_COLORS[1]}
      />
    );
    expect(
      container.querySelectorAll(".color-circle-primary").length
    ).toBe(1);
  });

  it("does not render the color picker overlay until a swatch is clicked", () => {
    const { container } = render(
      <ColorController
        annotation={annotation}
        mode="arrow"
        initialColor={DEFAULT_RECENT_COLORS[0]}
      />
    );
    expect(container.querySelector(".color-picker-overlay")).toBeNull();
  });

  it("exposes an aria-label per swatch and aria-pressed on the active one", () => {
    const { container } = render(
      <ColorController
        annotation={annotation}
        mode="arrow"
        initialColor={DEFAULT_RECENT_COLORS[1]}
      />
    );
    expect(
      container.querySelector(".color-selector")?.getAttribute("aria-label")
    ).toBe("Color");
    const swatches = container.querySelectorAll(".color-circle");
    expect(swatches[0].getAttribute("aria-label")).toBe(
      `Set color to ${DEFAULT_RECENT_COLORS[0]}`
    );
    expect(swatches[1].getAttribute("aria-pressed")).toBe("true");
  });

  it("labels the color picker overlay as a dialog when open", () => {
    const { container } = render(
      <ColorController
        annotation={annotation}
        mode="arrow"
        initialColor={DEFAULT_RECENT_COLORS[0]}
      />
    );
    fireEvent.click(container.querySelectorAll(".color-circle")[1]);
    const overlay = container.querySelector(".color-picker-overlay");
    expect(overlay?.getAttribute("role")).toBe("dialog");
    expect(overlay?.getAttribute("aria-label")).toBe("Custom color picker");
  });

  it("updates strokeColor and opens the picker when a non-active swatch is clicked (arrow/polygon mode)", () => {
    const { container } = render(
      <ColorController
        annotation={annotation}
        mode="arrow"
        initialColor={DEFAULT_RECENT_COLORS[0]}
      />
    );
    const swatches = container.querySelectorAll(".color-circle");
    fireEvent.click(swatches[1]);

    expect(updateStyle).toHaveBeenCalledWith("a1", {
      strokeColor: DEFAULT_RECENT_COLORS[1]
    });
    expect(container.querySelector(".color-picker-overlay")).not.toBeNull();
  });

  it("updates color (not strokeColor) in text mode", () => {
    const { container } = render(
      <ColorController
        annotation={annotation}
        mode="text"
        initialColor={DEFAULT_RECENT_COLORS[0]}
      />
    );
    const swatches = container.querySelectorAll(".color-circle");
    fireEvent.click(swatches[1]);

    expect(updateStyle).toHaveBeenCalledWith("a1", {
      color: DEFAULT_RECENT_COLORS[1]
    });
  });

  it("closes the picker when the already-active swatch is clicked again", () => {
    const { container } = render(
      <ColorController
        annotation={annotation}
        mode="arrow"
        initialColor={DEFAULT_RECENT_COLORS[0]}
      />
    );
    const swatches = container.querySelectorAll(".color-circle");
    // First click on swatch[1]: opens picker, makes it active.
    fireEvent.click(swatches[1]);
    expect(container.querySelector(".color-picker-overlay")).not.toBeNull();

    // Second click on the same (now active) swatch: closes it.
    fireEvent.click(swatches[1]);
    expect(container.querySelector(".color-picker-overlay")).toBeNull();
  });

  it("re-syncs the active swatch when initialColor changes", () => {
    const { container, rerender } = render(
      <ColorController
        annotation={annotation}
        mode="arrow"
        initialColor={DEFAULT_RECENT_COLORS[0]}
      />
    );
    expect(
      container.querySelectorAll(".color-circle-primary").length
    ).toBe(1);
    expect(
      container.querySelectorAll(".color-circle")[0].className
    ).toContain("color-circle-primary");

    rerender(
      <ColorController
        annotation={annotation}
        mode="arrow"
        initialColor={DEFAULT_RECENT_COLORS[1]}
      />
    );
    expect(
      container.querySelectorAll(".color-circle")[1].className
    ).toContain("color-circle-primary");
  });
});
