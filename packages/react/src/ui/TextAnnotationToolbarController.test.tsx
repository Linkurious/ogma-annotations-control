import { render } from "@testing-library/react";
import React from "react";
import { vi, describe, beforeEach, it, expect, Mock } from "vitest";
import { TextAnnotationToolbar } from "@linkurious/ogma-annotations/ui";
import { useAnnotationsContext } from "@linkurious/ogma-annotations-react";
import { TextAnnotationToolbarController } from "./TextAnnotationToolbarController";

vi.mock("@linkurious/ogma-annotations-react", () => ({
  useAnnotationsContext: vi.fn()
}));

vi.mock("@linkurious/ogma-annotations/ui", () => ({
  TextAnnotationToolbar: vi.fn().mockImplementation(function () {
    return { destroy: vi.fn() };
  })
}));

describe("TextAnnotationToolbarController", () => {
  const editor = { id: "editor" } as never;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing", () => {
    (useAnnotationsContext as Mock).mockReturnValue({ editor });
    const { container } = render(<TextAnnotationToolbarController />);
    expect(container.innerHTML).toBe("");
  });

  it("does not construct the toolbar until an editor is available", () => {
    (useAnnotationsContext as Mock).mockReturnValue({ editor: null });
    render(<TextAnnotationToolbarController />);
    expect(TextAnnotationToolbar).not.toHaveBeenCalled();
  });

  it("constructs the toolbar with the editor and forwarded props once ready", () => {
    (useAnnotationsContext as Mock).mockReturnValue({ editor });
    render(<TextAnnotationToolbarController fontSizes={[12, 14, 16]} />);

    expect(TextAnnotationToolbar).toHaveBeenCalledWith(
      expect.objectContaining({ control: editor, fontSizes: [12, 14, 16] })
    );
  });

  it("destroys the toolbar instance on unmount", () => {
    (useAnnotationsContext as Mock).mockReturnValue({ editor });
    const destroy = vi.fn();
    (TextAnnotationToolbar as unknown as Mock).mockImplementation(function () {
      return { destroy };
    });

    const { unmount } = render(<TextAnnotationToolbarController />);
    unmount();

    expect(destroy).toHaveBeenCalled();
  });
});
