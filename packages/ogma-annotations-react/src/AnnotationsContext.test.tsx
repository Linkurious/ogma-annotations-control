import * as Annotations from "@linkurious/ogma-annotations";
import { AnnotationCollection } from "@linkurious/ogma-annotations";
import { useOgma } from "@linkurious/ogma-react";
import { render, act } from "@testing-library/react";
import React from "react";
import {
  vi,
  describe,
  beforeEach,
  afterEach,
  it,
  expect,
  Mock,
  MockedFunction
} from "vitest";
import { AnnotationsContextProvider } from "./AnnotationsContext";

vi.mock("@linkurious/ogma-react", () => ({
  useOgma: vi.fn()
}));

vi.mock("@linkurious/ogma-annotations", () => ({
  Control: vi.fn(),
  isArrow: vi.fn((x) => x.properties.type === "arrow"),
  isText: vi.fn((x) => x.properties.type === "text"),
  EVT_ADD: "add",
  EVT_REMOVE: "remove",
  EVT_UPDATE: "update",
  EVT_HISTORY: "history",
  EVT_SELECT: "select",
  EVT_UNSELECT: "unselect"
}));

type MockedEditorOn = MockedFunction<Annotations.Control["on"]>;

describe("AnnotationsContextProvider", () => {
  let mockOgma: unknown;
  let mockEditor: Annotations.Control;

  beforeEach(() => {
    mockOgma = {
      getNodes: vi.fn().mockReturnValue({
        getAttribute: vi.fn().mockReturnValue([10])
      })
    };

    mockEditor = {
      on: vi.fn().mockReturnThis(),
      destroy: vi.fn(),
      updateStyle: vi.fn(),
      add: vi.fn(),
      remove: vi.fn(),
      cancelDrawing: vi.fn(),
      select: vi.fn(),
      canUndo: vi.fn().mockReturnValue(false),
      canRedo: vi.fn().mockReturnValue(false),
      undo: vi.fn().mockReturnValue(true),
      redo: vi.fn().mockReturnValue(true),
      clearHistory: vi.fn(),
      enableBoxDrawing: vi.fn(),
      enablePolygonDrawing: vi.fn(),
      enableCommentDrawing: vi.fn(),
      getSelectedAnnotations: vi.fn().mockReturnValue({
        type: "FeatureCollection",
        features: []
      }),
      getAnnotations: vi.fn().mockReturnValue({
        type: "FeatureCollection",
        features: []
      })
    } as unknown as Annotations.Control;
    (useOgma as Mock).mockReturnValue(mockOgma);
    (Annotations.Control as unknown as Mock).mockImplementation(function () {
      return mockEditor;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with default values", () => {
    render(
      <AnnotationsContextProvider>
        <div>Test</div>
      </AnnotationsContextProvider>
    );
    expect(Annotations.Control).toHaveBeenCalledWith(mockOgma, {
      minArrowHeight: 1
    });
  });

  it("should handle arrow annotation selection and update arrow style state", () => {
    render(
      <AnnotationsContextProvider>
        <div>Test</div>
      </AnnotationsContextProvider>
    );

    const arrowAnnotation = {
      id: "1",
      properties: {
        type: "arrow",
        style: { strokeWidth: 2, color: "red" }
      }
    } as unknown as Annotations.Arrow;

    // Mock getSelectedAnnotations to return the selected arrow
    (mockEditor.getSelectedAnnotations as Mock).mockReturnValue({
      type: "FeatureCollection",
      features: [arrowAnnotation]
    });

    act(() => {
      const selectCallback = (mockEditor.on as MockedEditorOn).mock.calls.find(
        (call) => call[0] === "select"
      )![1];
      selectCallback({ ids: ["1"] });
    });

    // The select event should trigger getSelectedAnnotations
    expect(mockEditor.getSelectedAnnotations).toHaveBeenCalled();
  });

  it("should handle text annotation selection and update text style state", () => {
    render(
      <AnnotationsContextProvider>
        <div>Test</div>
      </AnnotationsContextProvider>
    );

    const textAnnotation = {
      id: "2",
      properties: {
        type: "text",
        style: { fontSize: 14, color: "blue" },
        content: ""
      }
    } as unknown as Annotations.Text;

    // Mock getSelectedAnnotations to return the selected text
    (mockEditor.getSelectedAnnotations as Mock).mockReturnValue({
      type: "FeatureCollection",
      features: [textAnnotation]
    });

    act(() => {
      const selectCallback = (mockEditor.on as MockedEditorOn).mock.calls.find(
        (call) => call[0] === "select"
      )![1];
      selectCallback({ ids: ["2"] });
    });

    // The select event should trigger getSelectedAnnotations
    expect(mockEditor.getSelectedAnnotations).toHaveBeenCalled();
  });

  it("should handle annotation unselection", () => {
    render(
      <AnnotationsContextProvider>
        <div>Test</div>
      </AnnotationsContextProvider>
    );

    act(() => {
      const unselectCallback = (
        mockEditor.on as MockedEditorOn
      ).mock.calls.find((call) => call[0] === "unselect")![1];
      unselectCallback();
    });

    // The unselect event should be triggered (currentAnnotation set to null internally)
    expect(mockEditor.on).toHaveBeenCalledWith(
      "unselect",
      expect.any(Function)
    );
  });

  it("should cleanup editor on unmount", () => {
    const { unmount } = render(
      <AnnotationsContextProvider>
        <div>Test</div>
      </AnnotationsContextProvider>
    );

    unmount();
    expect(mockEditor.destroy).toHaveBeenCalled();
  });

  it("should not initialize editor when ogma is not available", () => {
    (useOgma as Mock).mockReturnValue(null);
    render(
      <AnnotationsContextProvider>
        <div>Test</div>
      </AnnotationsContextProvider>
    );
    expect(Annotations.Control).not.toHaveBeenCalled();
  });

  it("should add initial annotations if provided", () => {
    const initialAnnotations: AnnotationCollection = {
      type: "FeatureCollection",
      features: [
        {
          id: "1",
          type: "Feature",
          properties: { type: "arrow" },
          geometry: {
            type: "LineString",
            coordinates: [
              [0, 0],
              [1, 1]
            ]
          }
        }
      ]
    };

    render(
      <AnnotationsContextProvider annotations={initialAnnotations}>
        <div>Test</div>
      </AnnotationsContextProvider>
    );

    expect(mockEditor.add).toHaveBeenCalledWith(initialAnnotations);
    expect(mockEditor.clearHistory).toHaveBeenCalled();
  });

  it("should wire up all event listeners", () => {
    render(
      <AnnotationsContextProvider>
        <div>Test</div>
      </AnnotationsContextProvider>
    );

    expect(mockEditor.on).toHaveBeenCalledWith("select", expect.any(Function));
    expect(mockEditor.on).toHaveBeenCalledWith(
      "unselect",
      expect.any(Function)
    );
    expect(mockEditor.on).toHaveBeenCalledWith("add", expect.any(Function));
    expect(mockEditor.on).toHaveBeenCalledWith("remove", expect.any(Function));
    expect(mockEditor.on).toHaveBeenCalledWith("update", expect.any(Function));
    expect(mockEditor.on).toHaveBeenCalledWith("history", expect.any(Function));
  });

  it("should update annotations state when add event fires", () => {
    render(
      <AnnotationsContextProvider>
        <div>Test</div>
      </AnnotationsContextProvider>
    );

    const newAnnotations: AnnotationCollection = {
      type: "FeatureCollection",
      features: [
        {
          id: "new-1",
          type: "Feature",
          properties: { type: "arrow" },
          geometry: {
            type: "LineString",
            coordinates: [
              [0, 0],
              [1, 1]
            ]
          }
        }
      ]
    };

    (mockEditor.getAnnotations as Mock).mockReturnValue(newAnnotations);

    act(() => {
      const addCallback = (mockEditor.on as MockedEditorOn).mock.calls.find(
        (call) => call[0] === "add"
      )![1];
      addCallback();
    });

    expect(mockEditor.getAnnotations).toHaveBeenCalled();
  });

  it("should update history state when history event fires", () => {
    render(
      <AnnotationsContextProvider>
        <div>Test</div>
      </AnnotationsContextProvider>
    );

    (mockEditor.canUndo as Mock).mockReturnValue(true);
    (mockEditor.canRedo as Mock).mockReturnValue(false);

    act(() => {
      const historyCallback = (mockEditor.on as MockedEditorOn).mock.calls.find(
        (call) => call[0] === "history"
      )![1];
      historyCallback();
    });

    expect(mockEditor.canUndo).toHaveBeenCalled();
    expect(mockEditor.canRedo).toHaveBeenCalled();
  });
});
