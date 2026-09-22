import { render, fireEvent, act } from "@testing-library/react";
import React from "react";
import { vi, describe, beforeEach, it, expect, Mock } from "vitest";
import { useAnnotationsContext } from "@linkurious/ogma-annotations-react";
import { AddMenu } from "../../src/ui/AddMenu";

vi.mock("@linkurious/ogma-annotations-react", () => ({
  useAnnotationsContext: vi.fn()
}));

describe("AddMenu", () => {
  let editor: {
    on: Mock;
    off: Mock;
    enableArrowDrawing: Mock;
    enableTextDrawing: Mock;
    enableBoxDrawing: Mock;
    enablePolygonDrawing: Mock;
    enableCommentDrawing: Mock;
    enableStickyNoteDrawing: Mock;
    isEraseModeActive: Mock;
    enableEraseMode: Mock;
    disableEraseMode: Mock;
    getSelectedAnnotations: Mock;
  };
  let undo: Mock;
  let redo: Mock;
  let remove: Mock;

  const tooltip = (container: HTMLElement, label: string) =>
    container.querySelector(`[data-tooltip="${label}"]`) as HTMLElement;

  beforeEach(() => {
    editor = {
      on: vi.fn(),
      off: vi.fn(),
      enableArrowDrawing: vi.fn(),
      enableTextDrawing: vi.fn(),
      enableBoxDrawing: vi.fn(),
      enablePolygonDrawing: vi.fn(),
      enableCommentDrawing: vi.fn(),
      enableStickyNoteDrawing: vi.fn(),
      isEraseModeActive: vi.fn().mockReturnValue(false),
      enableEraseMode: vi.fn(),
      disableEraseMode: vi.fn(),
      getSelectedAnnotations: vi.fn().mockReturnValue({ features: [] })
    };
    undo = vi.fn();
    redo = vi.fn();
    remove = vi.fn();
    (useAnnotationsContext as Mock).mockReturnValue({
      editor,
      canUndo: false,
      canRedo: false,
      undo,
      redo,
      remove
    });
  });

  it("renders all six drawing-tool buttons by default", () => {
    const { container } = render(<AddMenu />);
    [
      "Add arrow",
      "Add comment",
      "Add sticky note",
      "Add box",
      "Add text",
      "Add polygon (click points, Esc to finish)"
    ].forEach((label) => {
      expect(tooltip(container, label)).toBeTruthy();
    });
  });

  it("exposes a group label and an aria-label mirroring every button's data-tooltip", () => {
    const { container } = render(<AddMenu />);
    expect(container.querySelector(".add-menu")?.getAttribute("role")).toBe(
      "group"
    );
    expect(container.querySelector(".add-menu")?.getAttribute("aria-label")).toBe(
      "Annotation tools"
    );
    container.querySelectorAll(".add-menu > button").forEach((btn) => {
      expect(btn.getAttribute("aria-label")).toBe(
        btn.getAttribute("data-tooltip")
      );
    });
  });

  it("only renders the requested subset of enabledTypes", () => {
    const { container } = render(<AddMenu enabledTypes={["arrow", "text"]} />);
    expect(tooltip(container, "Add arrow")).toBeTruthy();
    expect(tooltip(container, "Add text")).toBeTruthy();
    expect(tooltip(container, "Add box")).toBeNull();
    expect(tooltip(container, "Add polygon (click points, Esc to finish)")).toBeNull();
  });

  it("enables arrow drawing and marks the button active when clicked", () => {
    const { container } = render(<AddMenu />);
    fireEvent.click(tooltip(container, "Add arrow"));

    expect(editor.enableArrowDrawing).toHaveBeenCalledWith(
      expect.objectContaining({ strokeType: "plain", head: "arrow" })
    );
    expect(tooltip(container, "Add arrow").className).toContain("active");
    expect(tooltip(container, "Add arrow").getAttribute("aria-pressed")).toBe(
      "true"
    );
  });

  it("merges per-type style overrides into the drawing call", () => {
    const { container } = render(
      <AddMenu styles={{ arrow: { strokeColor: "#ff0000" } }} />
    );
    fireEvent.click(tooltip(container, "Add arrow"));

    expect(editor.enableArrowDrawing).toHaveBeenCalledWith(
      expect.objectContaining({ strokeColor: "#ff0000" })
    );
  });

  it("clears the active mode when drawing completes", () => {
    const { container } = render(<AddMenu />);
    fireEvent.click(tooltip(container, "Add arrow"));
    expect(tooltip(container, "Add arrow").className).toContain("active");

    const completeHandler = editor.on.mock.calls.find(
      (call) => call[0] === "completeDrawing"
    )![1];
    act(() => completeHandler());

    expect(tooltip(container, "Add arrow").className).not.toContain("active");
  });

  it("disables undo/redo buttons based on context flags and calls them on click", () => {
    (useAnnotationsContext as Mock).mockReturnValue({
      editor,
      canUndo: true,
      canRedo: false,
      undo,
      redo,
      remove
    });
    const { container } = render(<AddMenu />);
    const undoBtn = tooltip(container, "Undo") as HTMLButtonElement;
    const redoBtn = tooltip(container, "Redo") as HTMLButtonElement;

    expect(undoBtn.disabled).toBe(false);
    expect(redoBtn.disabled).toBe(true);

    fireEvent.click(undoBtn);
    expect(undo).toHaveBeenCalled();
  });

  it("toggles erase mode on the erase button", () => {
    const { container } = render(<AddMenu />);
    const eraseBtn = tooltip(container, "Erase (click annotations to delete them)");

    fireEvent.click(eraseBtn);
    expect(editor.enableEraseMode).toHaveBeenCalled();
    expect(eraseBtn.className).toContain("active");

    editor.isEraseModeActive.mockReturnValue(true);
    fireEvent.click(eraseBtn);
    expect(editor.disableEraseMode).toHaveBeenCalled();
  });

  it("hides the select-delete button unless deleteMode includes 'select'", () => {
    const { container, rerender } = render(<AddMenu />);
    expect(tooltip(container, "Delete selected")).toBeNull();

    rerender(<AddMenu deleteMode="select" />);
    expect(tooltip(container, "Delete selected")).toBeTruthy();
    expect(tooltip(container, "Erase (click annotations to delete them)")).toBeNull();
  });

  it("removes the current selection when 'Delete selected' is clicked", () => {
    const selected = { features: [{ id: "1" }] };
    editor.getSelectedAnnotations.mockReturnValue(selected);
    const { container } = render(<AddMenu deleteMode="select" />);

    fireEvent.click(tooltip(container, "Delete selected"));
    expect(remove).toHaveBeenCalledWith(selected);
  });

  it("does not render export buttons unless the corresponding callback is passed", () => {
    const { container, rerender } = render(<AddMenu />);
    expect(tooltip(container, "Export annotations")).toBeNull();
    expect(tooltip(container, "Export SVG")).toBeNull();

    const onJsonExport = vi.fn();
    const onSvgExport = vi.fn();
    rerender(<AddMenu onJsonExport={onJsonExport} onSvgExport={onSvgExport} />);

    fireEvent.click(tooltip(container, "Export annotations"));
    fireEvent.click(tooltip(container, "Export SVG"));
    expect(onJsonExport).toHaveBeenCalled();
    expect(onSvgExport).toHaveBeenCalled();
  });
});
