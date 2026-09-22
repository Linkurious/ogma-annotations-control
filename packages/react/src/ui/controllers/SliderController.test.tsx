import { render, fireEvent } from "@testing-library/react";
import React from "react";
import { vi, describe, beforeEach, it, expect, Mock } from "vitest";
import { useAnnotationsContext } from "@linkurious/ogma-annotations-react";
import { SliderController } from "./SliderController";

vi.mock("@linkurious/ogma-annotations-react", () => ({
  useAnnotationsContext: vi.fn()
}));

describe("SliderController", () => {
  const annotation = { id: "a1" } as never;
  let updateStyle: Mock;

  beforeEach(() => {
    updateStyle = vi.fn();
    (useAnnotationsContext as Mock).mockReturnValue({
      editor: { updateStyle }
    });
  });

  it("renders the title and initial value", () => {
    const { getByText } = render(
      <SliderController
        annotation={annotation}
        title="Stroke width"
        property="strokeWidth"
        value={5}
        min={1}
        max={20}
      />
    );
    expect(getByText("Stroke width")).toBeTruthy();
    expect(getByText("5")).toBeTruthy();
  });

  it("sets min/max on the range input", () => {
    const { container } = render(
      <SliderController
        annotation={annotation}
        title="Font size"
        property="fontSize"
        value={18}
        min={8}
        max={72}
      />
    );
    const input = container.querySelector(
      "input[type='range']"
    ) as HTMLInputElement;
    expect(input.min).toBe("8");
    expect(input.max).toBe("72");
  });

  it("updates fontSize style when property is fontSize", () => {
    const { container } = render(
      <SliderController
        annotation={annotation}
        title="Font size"
        property="fontSize"
        value={18}
        min={8}
        max={72}
      />
    );
    const input = container.querySelector("input[type='range']")!;
    fireEvent.change(input, { target: { value: "24" } });

    expect(updateStyle).toHaveBeenCalledWith("a1", { fontSize: 24 });
  });

  it("updates strokeWidth style when property is strokeWidth", () => {
    const { container } = render(
      <SliderController
        annotation={annotation}
        title="Stroke width"
        property="strokeWidth"
        value={2}
        min={1}
        max={20}
      />
    );
    const input = container.querySelector("input[type='range']")!;
    fireEvent.change(input, { target: { value: "10" } });

    expect(updateStyle).toHaveBeenCalledWith("a1", { strokeWidth: 10 });
  });

  it("includes strokeColor in a text-mode strokeWidth update", () => {
    const { container } = render(
      <SliderController
        annotation={annotation}
        title="Stroke width"
        property="strokeWidth"
        value={2}
        min={1}
        max={20}
        mode="text"
        currentColor="#123456"
      />
    );
    const input = container.querySelector("input[type='range']")!;
    fireEvent.change(input, { target: { value: "10" } });

    expect(updateStyle).toHaveBeenCalledWith("a1", {
      strokeWidth: 10,
      strokeColor: "#123456"
    });
  });

  it("re-syncs displayed value when the value prop changes", () => {
    const { getByText, rerender } = render(
      <SliderController
        annotation={annotation}
        title="Stroke width"
        property="strokeWidth"
        value={2}
        min={1}
        max={20}
      />
    );
    expect(getByText("2")).toBeTruthy();

    rerender(
      <SliderController
        annotation={annotation}
        title="Stroke width"
        property="strokeWidth"
        value={9}
        min={1}
        max={20}
      />
    );
    expect(getByText("9")).toBeTruthy();
  });
});
