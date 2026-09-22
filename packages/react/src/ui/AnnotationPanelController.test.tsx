import { render, act } from "@testing-library/react";
import React from "react";
import { vi, describe, beforeEach, it, expect, Mock } from "vitest";
import {
  attachPanelVisibility,
  classifyPanelAnnotationType
} from "@linkurious/ogma-annotations/ui";
import { useAnnotationsContext } from "@linkurious/ogma-annotations-react";
import {
  AnnotationPanelController,
  useAnnotationPanel
} from "./AnnotationPanelController";

vi.mock("@linkurious/ogma-annotations-react", () => ({
  useAnnotationsContext: vi.fn()
}));

vi.mock("@linkurious/ogma-annotations/ui", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@linkurious/ogma-annotations/ui")>();
  return {
    ...actual,
    attachPanelVisibility: vi.fn(),
    classifyPanelAnnotationType: vi.fn()
  };
});

function TestHarness({ enabledTypes }: { enabledTypes?: string[] }) {
  const { annotation, visible } = useAnnotationPanel(enabledTypes as never);
  return (
    <div data-visible={visible} data-annotation-id={annotation?.id ?? ""} />
  );
}

describe("useAnnotationPanel / AnnotationPanelController", () => {
  const editor = { id: "editor" } as never;
  let detach: Mock;
  let handlers: { onShow: (a: unknown) => void; onHide: () => void };

  beforeEach(() => {
    detach = vi.fn();
    (attachPanelVisibility as Mock).mockImplementation((_control, h) => {
      handlers = h;
      return detach;
    });
    (classifyPanelAnnotationType as Mock).mockReturnValue("arrow");
    (useAnnotationsContext as Mock).mockReturnValue({ editor });
  });

  it("does not attach visibility handling until an editor is available", () => {
    (useAnnotationsContext as Mock).mockReturnValue({ editor: null });
    render(<TestHarness />);
    expect(attachPanelVisibility).not.toHaveBeenCalled();
  });

  it("attaches visibility handling once the editor is ready", () => {
    render(<TestHarness />);
    expect(attachPanelVisibility).toHaveBeenCalledWith(
      editor,
      expect.objectContaining({
        onShow: expect.any(Function),
        onHide: expect.any(Function)
      })
    );
  });

  it("shows the annotation reported by onShow when its type is enabled", () => {
    const { container } = render(<TestHarness />);
    const arrow = { id: "a1" };

    act(() => handlers.onShow(arrow));

    expect(container.firstChild).toHaveProperty(
      "dataset.visible",
      "true"
    );
    expect(container.firstChild).toHaveProperty(
      "dataset.annotationId",
      "a1"
    );
  });

  it("stays hidden when onShow fires for a type not in enabledTypes", () => {
    const { container } = render(<TestHarness enabledTypes={["text"]} />);
    const arrow = { id: "a1" };

    act(() => handlers.onShow(arrow));

    expect(container.firstChild).toHaveProperty("dataset.visible", "false");
  });

  it("stays hidden when the annotation has no classifiable type", () => {
    (classifyPanelAnnotationType as Mock).mockReturnValue(null);
    const { container } = render(<TestHarness />);

    act(() => handlers.onShow({ id: "a1" }));

    expect(container.firstChild).toHaveProperty("dataset.visible", "false");
  });

  it("hides on onHide", () => {
    const { container } = render(<TestHarness />);
    act(() => handlers.onShow({ id: "a1" }));
    act(() => handlers.onHide());

    expect(container.firstChild).toHaveProperty("dataset.visible", "false");
    expect(container.firstChild).toHaveProperty("dataset.annotationId", "");
  });

  it("detaches on unmount", () => {
    const { unmount } = render(<TestHarness />);
    unmount();
    expect(detach).toHaveBeenCalled();
  });

  it("AnnotationPanelController renders nothing while hidden", () => {
    const { container } = render(<AnnotationPanelController />);
    expect(container.innerHTML).toBe("");
  });

  it("AnnotationPanelController renders the panel once shown", () => {
    const { container } = render(<AnnotationPanelController />);
    act(() => handlers.onShow({ id: "a1", properties: { type: "arrow" } }));
    expect(container.querySelector(".annotation-panel")).toBeTruthy();
  });
});
