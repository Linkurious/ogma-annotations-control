import { render, fireEvent } from "@testing-library/react";
import React from "react";
import { vi, describe, beforeEach, it, expect, Mock } from "vitest";
import { BACKGROUNDS } from "@linkurious/ogma-annotations/ui";
import { useAnnotationsContext } from "@linkurious/ogma-annotations-react";
import { BackgroundController } from "./BackgroundController";

vi.mock("@linkurious/ogma-annotations-react", () => ({
  useAnnotationsContext: vi.fn()
}));

describe("BackgroundController", () => {
  const annotation = { id: "a1" } as never;
  let updateStyle: Mock;

  beforeEach(() => {
    updateStyle = vi.fn();
    (useAnnotationsContext as Mock).mockReturnValue({
      editor: { updateStyle }
    });
  });

  it("renders a swatch for every configured background", () => {
    const { container } = render(
      <BackgroundController
        annotation={annotation}
        currentBackground={BACKGROUNDS[0].value}
      />
    );
    expect(container.querySelectorAll(".color-circle").length).toBe(
      BACKGROUNDS.length
    );
  });

  it("defaults the section title to 'Background'", () => {
    const { getByText } = render(
      <BackgroundController
        annotation={annotation}
        currentBackground={BACKGROUNDS[0].value}
      />
    );
    expect(getByText("Background")).toBeTruthy();
  });

  it("accepts a custom title (e.g. 'Fill' for polygons)", () => {
    const { getByText } = render(
      <BackgroundController
        annotation={annotation}
        currentBackground={BACKGROUNDS[0].value}
        title="Fill"
      />
    );
    expect(getByText("Fill")).toBeTruthy();
  });

  it("marks the swatch matching currentBackground as primary", () => {
    const { container } = render(
      <BackgroundController
        annotation={annotation}
        currentBackground={BACKGROUNDS[1].value}
      />
    );
    expect(
      container.querySelectorAll(".color-circle-primary").length
    ).toBe(1);
  });

  it("updates the annotation's background style when a swatch is clicked", () => {
    const { container } = render(
      <BackgroundController
        annotation={annotation}
        currentBackground={BACKGROUNDS[0].value}
      />
    );
    const swatches = container.querySelectorAll(".color-circle");
    fireEvent.click(swatches[1]);

    expect(updateStyle).toHaveBeenCalledWith("a1", {
      background: BACKGROUNDS[1].value
    });
  });
});
