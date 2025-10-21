import React from "react";
import { render, act } from "@testing-library/react";
import { AnnotationsContextProvider } from "./AnnotationsContext";
import { useOgma } from "@linkurious/ogma-react";
import * as Annotations from "@linkurious/ogma-annotations";
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
import { AnnotationCollection } from "@linkurious/ogma-annotations";

vi.mock("@linkurious/ogma-react", () => ({
  useOgma: vi.fn()
}));

vi.mock("@linkurious/ogma-annotations", () => ({
  Control: vi.fn(),
  isArrow: vi.fn((x) => x.properties.type === "arrow"),
  isText: vi.fn((x) => x.properties.type === "text")
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
    (Annotations.Control as unknown as Mock).mockImplementation(
      () => mockEditor
    );
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

  it("should handle arrow annotation selection", () => {
    const { rerender } = render(
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

    rerender(
      <AnnotationsContextProvider>
        <div>Test</div>
      </AnnotationsContextProvider>
    );
    expect(mockEditor.updateStyle).toHaveBeenCalledWith("1", {
      strokeWidth: 2,
      color: "red"
    });
  });

  it("should handle text annotation selection", () => {
    const { rerender } = render(
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

    rerender(
      <AnnotationsContextProvider>
        <div>Test</div>
      </AnnotationsContextProvider>
    );
    expect(mockEditor.updateStyle).toHaveBeenCalledWith("2", {
      fontSize: 14,
      color: "blue"
    });
  });

  it("should handle annotation unselection", () => {
    const { rerender } = render(
      <AnnotationsContextProvider>
        <div>Test</div>
      </AnnotationsContextProvider>
    );

    // Mock empty selection
    (mockEditor.getSelectedAnnotations as Mock).mockReturnValue({
      type: "FeatureCollection",
      features: []
    });

    act(() => {
      const selectCallback = (mockEditor.on as MockedEditorOn).mock.calls.find(
        (call) => call[0] === "select"
      )![1];
      selectCallback({ ids: [] });
    });

    rerender(
      <AnnotationsContextProvider>
        <div>Test</div>
      </AnnotationsContextProvider>
    );
    expect(mockEditor.updateStyle).not.toHaveBeenCalled();
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
  });
});
