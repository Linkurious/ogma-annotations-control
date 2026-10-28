import { render } from "@testing-library/react";
import React from "react";
import { vi, describe, beforeEach, it, expect, Mock } from "vitest";
import {
  ContextToolbars,
  TextAnnotationToolbar
} from "@linkurious/ogma-annotations/ui";
import { useAnnotationsContext } from "@linkurious/ogma-annotations-react";
import {
  ContextToolbarsController,
  TextAnnotationToolbarController
} from "../../../src/ui/controllers/ContextToolbars";

vi.mock("@linkurious/ogma-annotations-react", () => ({
  useAnnotationsContext: vi.fn()
}));

vi.mock("@linkurious/ogma-annotations/ui", () => ({
  ContextToolbars: vi.fn().mockImplementation(function () {
    return { destroy: vi.fn() };
  }),
  TextAnnotationToolbar: vi.fn().mockImplementation(function () {
    return { destroy: vi.fn() };
  })
}));

describe("ContextToolbarsController", () => {
  const editor = { id: "editor" } as never;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing", () => {
    (useAnnotationsContext as Mock).mockReturnValue({ editor });
    const { container } = render(<ContextToolbarsController />);
    expect(container.innerHTML).toBe("");
  });

  it("does not construct the toolbar until an editor is available", () => {
    (useAnnotationsContext as Mock).mockReturnValue({ editor: null });
    render(<ContextToolbarsController />);
    expect(ContextToolbars).not.toHaveBeenCalled();
  });

  it("constructs the toolbar with the editor and forwarded props once ready", () => {
    (useAnnotationsContext as Mock).mockReturnValue({ editor });
    render(<ContextToolbarsController box={false} />);

    expect(ContextToolbars).toHaveBeenCalledWith(
      expect.objectContaining({ control: editor, box: false })
    );
  });

  it("destroys the toolbar instance on unmount", () => {
    (useAnnotationsContext as Mock).mockReturnValue({ editor });
    const destroy = vi.fn();
    (ContextToolbars as unknown as Mock).mockImplementation(function () {
      return { destroy };
    });

    const { unmount } = render(<ContextToolbarsController />);
    unmount();

    expect(destroy).toHaveBeenCalled();
  });

  it("deprecated TextAnnotationToolbarController forwards flat props", () => {
    (useAnnotationsContext as Mock).mockReturnValue({ editor });
    render(<TextAnnotationToolbarController fontSizes={[12, 14]} />);

    expect(TextAnnotationToolbar).toHaveBeenCalledWith(
      expect.objectContaining({ control: editor, fontSizes: [12, 14] })
    );
  });
});
