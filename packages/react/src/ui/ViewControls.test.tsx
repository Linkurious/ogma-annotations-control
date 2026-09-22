import { render, fireEvent } from "@testing-library/react";
import React from "react";
import { vi, describe, beforeEach, it, expect, Mock } from "vitest";
import { useOgma } from "@linkurious/ogma-react";
import { useAnnotationsContext } from "@linkurious/ogma-annotations-react";
import { ViewControls } from "./ViewControls";

vi.mock("@linkurious/ogma-react", () => ({
  useOgma: vi.fn()
}));

vi.mock("@linkurious/ogma-annotations-react", () => ({
  useAnnotationsContext: vi.fn()
}));

describe("ViewControls", () => {
  let ogma: {
    view: {
      getGraphBoundingBox: Mock;
      moveToBounds: Mock;
      rotate: Mock;
    };
  };

  beforeEach(() => {
    ogma = {
      view: {
        getGraphBoundingBox: vi.fn().mockReturnValue({
          extend: vi.fn().mockReturnValue("extended-bounds")
        }),
        moveToBounds: vi.fn().mockResolvedValue(undefined),
        rotate: vi.fn().mockResolvedValue(undefined)
      }
    };
    (useOgma as Mock).mockReturnValue(ogma);
    (useAnnotationsContext as Mock).mockReturnValue({
      annotations: { type: "FeatureCollection", features: [] }
    });
  });

  it("renders center/rotate buttons", () => {
    const { container } = render(<ViewControls />);
    expect(container.querySelector('[data-tooltip="Center view"]')).toBeTruthy();
    expect(
      container.querySelector('[data-tooltip="Rotate clockwise"]')
    ).toBeTruthy();
    expect(
      container.querySelector('[data-tooltip="Rotate counter-clockwise"]')
    ).toBeTruthy();
  });

  it("moves the view to the extended bounds on center click", () => {
    const { container } = render(<ViewControls />);
    fireEvent.click(
      container.querySelector('[data-tooltip="Center view"]')!
    );

    expect(ogma.view.moveToBounds).toHaveBeenCalledWith("extended-bounds", {
      duration: 200
    });
  });

  it("rotates clockwise with a negative angle", () => {
    const { container } = render(<ViewControls />);
    fireEvent.click(
      container.querySelector('[data-tooltip="Rotate clockwise"]')!
    );

    expect(ogma.view.rotate).toHaveBeenCalledWith(-Math.PI / 8, {
      duration: 200
    });
  });

  it("rotates counter-clockwise with a positive angle", () => {
    const { container } = render(<ViewControls />);
    fireEvent.click(
      container.querySelector('[data-tooltip="Rotate counter-clockwise"]')!
    );

    expect(ogma.view.rotate).toHaveBeenCalledWith(Math.PI / 8, {
      duration: 200
    });
  });

  it("stops click and mousemove propagation so the graph underneath doesn't react", () => {
    const { container } = render(
      <div
        onClick={() => {
          throw new Error("event should not bubble");
        }}
        onMouseMove={() => {
          throw new Error("event should not bubble");
        }}
      >
        <ViewControls />
      </div>
    );
    const controls = container.querySelector(".view-controls")!;
    expect(() => fireEvent.click(controls)).not.toThrow();
    expect(() => fireEvent.mouseMove(controls)).not.toThrow();
  });
});
