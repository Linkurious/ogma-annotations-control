import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  initialRecentColors,
  withColorFromAnnotation,
  rgbaToString,
  attachPanelVisibility,
  svgIcon,
  ICON_PATHS,
  AnnotationPanel,
  AnnotationToolbar,
  type PanelVisibilityControl
} from "../../src/ui";
import type { Annotation, AnnotationCollection, Control } from "../../src";

describe("ui/color", () => {
  it("seeds three default recent colors with the first active", () => {
    const state = initialRecentColors();
    expect(state.colors).toHaveLength(3);
    expect(state.activeIndex).toBe(0);
  });

  it("activates an existing color without reordering", () => {
    const state = initialRecentColors();
    const target = state.colors[2];
    const next = withColorFromAnnotation(state, target);
    expect(next.colors).toEqual(state.colors);
    expect(next.activeIndex).toBe(2);
  });

  it("unshifts a new color and caps the list at three", () => {
    const state = initialRecentColors();
    const next = withColorFromAnnotation(state, "#123456");
    expect(next.colors[0]).toBe("#123456");
    expect(next.colors).toHaveLength(3);
    expect(next.activeIndex).toBe(0);
  });

  it("serializes rgba channels to a CSS string", () => {
    expect(rgbaToString({ r: 1, g: 2, b: 3, a: 0.5 })).toBe(
      "rgba(1, 2, 3, 0.5)"
    );
  });
});

describe("ui/icons", () => {
  it("wraps icon paths in a complete svg element", () => {
    const svg = svgIcon("circle", 24);
    expect(svg).toContain("<svg");
    expect(svg).toContain('width="24"');
    expect(svg).toContain(ICON_PATHS.circle);
  });
});

/** Minimal fake Control implementing the structural slice the panel needs. */
function createFakeControl(annotation: Annotation) {
  const handlers = new Map<string, Set<(...args: never[]) => void>>();
  let drawing = false;

  const emit = (event: string, ...args: unknown[]) => {
    handlers
      .get(event)
      ?.forEach((h) => (h as (...a: unknown[]) => void)(...args));
  };

  const control: PanelVisibilityControl = {
    on(event, handler) {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)!.add(handler);
      return control;
    },
    off(event, handler) {
      handlers.get(event)?.delete(handler);
      return control;
    },
    once(event, handler) {
      const wrapped = (...args: unknown[]) => {
        control.off(event, wrapped);
        handler(...args);
      };
      control.on(event, wrapped);
      return control;
    },
    getAnnotation: () => annotation,
    isDrawing: () => drawing
  };

  return {
    control,
    emit,
    setDrawing: (v: boolean) => (drawing = v),
    listenerCount: (event: string) => handlers.get(event)?.size ?? 0
  };
}

describe("ui/panelVisibility", () => {
  const annotation = { id: "a1" } as unknown as Annotation;

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("shows after the delay following a single selection (no click needed)", () => {
    const { control, emit } = createFakeControl(annotation);
    const onShow = vi.fn();
    attachPanelVisibility(control, { onShow, onHide: vi.fn() });

    emit("select", { ids: ["a1"] });
    expect(onShow).not.toHaveBeenCalled(); // pending, timer not yet fired
    vi.runAllTimers();
    expect(onShow).toHaveBeenCalledWith(annotation);
  });

  it("shows immediately on click, pre-empting the timer", () => {
    const { control, emit } = createFakeControl(annotation);
    const onShow = vi.fn();
    attachPanelVisibility(control, { onShow, onHide: vi.fn() });

    emit("select", { ids: ["a1"] });
    emit("click");
    expect(onShow).toHaveBeenCalledTimes(1);
    // Timer was cleared, so no second show.
    vi.runAllTimers();
    expect(onShow).toHaveBeenCalledTimes(1);
  });

  it("does not show when a drag starts after selection", () => {
    const { control, emit } = createFakeControl(annotation);
    const onShow = vi.fn();
    const onHide = vi.fn();
    attachPanelVisibility(control, { onShow, onHide });

    emit("select", { ids: ["a1"] });
    emit("dragstart"); // cancels the pending show
    expect(onHide).toHaveBeenCalled();
    vi.runAllTimers();
    expect(onShow).not.toHaveBeenCalled();
  });

  it("hides on a multi-selection", () => {
    const { control, emit } = createFakeControl(annotation);
    const onShow = vi.fn();
    const onHide = vi.fn();
    attachPanelVisibility(control, { onShow, onHide });

    emit("select", { ids: ["a1", "a2"] });
    vi.runAllTimers();
    expect(onHide).toHaveBeenCalled();
    expect(onShow).not.toHaveBeenCalled();
  });

  it("defers showing until drawing completes", () => {
    const { control, emit, setDrawing } = createFakeControl(annotation);
    const onShow = vi.fn();
    attachPanelVisibility(control, { onShow, onHide: vi.fn() });

    setDrawing(true);
    emit("select", { ids: ["a1"] });
    vi.runAllTimers();
    expect(onShow).not.toHaveBeenCalled(); // no timer while drawing
    emit("completeDrawing");
    expect(onShow).toHaveBeenCalledWith(annotation);
  });

  it("detach removes every registered listener and pending timer", () => {
    const { control, emit, listenerCount } = createFakeControl(annotation);
    const onShow = vi.fn();
    const detach = attachPanelVisibility(control, { onShow, onHide: vi.fn() });

    emit("select", { ids: ["a1"] }); // arms the timer
    detach();
    expect(listenerCount("select")).toBe(0);
    expect(listenerCount("click")).toBe(0);
    vi.runAllTimers();
    emit("select", { ids: ["a1"] });
    emit("click");
    expect(onShow).not.toHaveBeenCalled();
  });
});

describe("ui/AnnotationPanel layout", () => {
  const annotation = { id: "a1" } as unknown as Annotation;

  function createPanel(
    options?: Partial<{ placement: string; orientation: string }>
  ) {
    const { control } = createFakeControl(annotation);
    return new AnnotationPanel({
      control: control as unknown as Control,
      ...options
    } as ConstructorParameters<typeof AnnotationPanel>[0]);
  }

  it("defaults to right placement and vertical orientation", () => {
    const panel = createPanel();
    const root = document.querySelector(".annotation-panel")!;
    expect(root.getAttribute("data-placement")).toBe("right");
    expect(root.getAttribute("data-orientation")).toBe("vertical");
    panel.destroy();
  });

  it("applies the placement and orientation passed to the constructor", () => {
    const panel = createPanel({
      placement: "top-left",
      orientation: "horizontal"
    });
    const root = document.querySelector(".annotation-panel")!;
    expect(root.getAttribute("data-placement")).toBe("top-left");
    expect(root.getAttribute("data-orientation")).toBe("horizontal");
    panel.destroy();
  });

  it("updates placement and orientation at runtime", () => {
    const panel = createPanel();
    const root = document.querySelector(".annotation-panel")!;

    panel.setPlacement("bottom-right");
    expect(root.getAttribute("data-placement")).toBe("bottom-right");

    panel.setOrientation("horizontal");
    expect(root.getAttribute("data-orientation")).toBe("horizontal");

    panel.destroy();
  });

  it("supports the top/bottom center placements alongside the corners", () => {
    const panel = createPanel();
    const root = document.querySelector(".annotation-panel")!;

    panel.setPlacement("top");
    expect(root.getAttribute("data-placement")).toBe("top");

    panel.setPlacement("bottom");
    expect(root.getAttribute("data-placement")).toBe("bottom");

    panel.destroy();
  });
});

/** Minimal fake Control implementing the slice AnnotationToolbar needs. */
function createFakeToolbarControl(selected: AnnotationCollection) {
  const handlers = new Map<string, Set<(...args: never[]) => void>>();
  let undoable = false;
  let redoable = false;

  const on = (event: string, handler: (...args: never[]) => void) => {
    if (!handlers.has(event)) handlers.set(event, new Set());
    handlers.get(event)!.add(handler);
    return control;
  };
  const off = (event: string, handler: (...args: never[]) => void) => {
    handlers.get(event)?.delete(handler);
    return control;
  };
  const emit = (event: string, ...args: unknown[]) => {
    handlers
      .get(event)
      ?.forEach((h) => (h as (...a: unknown[]) => void)(...args));
  };

  const control = {
    on,
    off,
    once: on,
    canUndo: () => undoable,
    canRedo: () => redoable,
    undo: vi.fn(),
    redo: vi.fn(),
    remove: vi.fn(),
    getSelectedAnnotations: () => selected,
    enableArrowDrawing: vi.fn(),
    enableCommentDrawing: vi.fn(),
    enableBoxDrawing: vi.fn(),
    enableTextDrawing: vi.fn(),
    enablePolygonDrawing: vi.fn()
  };

  return {
    control,
    emit,
    listenerCount: (event: string) => handlers.get(event)?.size ?? 0,
    setUndoable: (v: boolean) => (undoable = v),
    setRedoable: (v: boolean) => (redoable = v)
  };
}

describe("ui/AnnotationToolbar", () => {
  const empty = { type: "FeatureCollection", features: [] } as AnnotationCollection;

  function createToolbar(
    options?: Partial<{ placement: string; orientation: string }>,
    selected: AnnotationCollection = empty
  ) {
    const fake = createFakeToolbarControl(selected);
    const toolbar = new AnnotationToolbar({
      control: fake.control as unknown as Control,
      ...options
    } as ConstructorParameters<typeof AnnotationToolbar>[0]);
    return { toolbar, ...fake };
  }

  it("defaults to bottom placement and horizontal orientation", () => {
    const { toolbar } = createToolbar();
    const root = document.querySelector(".annotation-toolbar")!;
    expect(root.getAttribute("data-placement")).toBe("bottom");
    expect(root.getAttribute("data-orientation")).toBe("horizontal");
    toolbar.destroy();
  });

  it("applies the placement and orientation passed to the constructor", () => {
    const { toolbar } = createToolbar({
      placement: "top-left",
      orientation: "vertical"
    });
    const root = document.querySelector(".annotation-toolbar")!;
    expect(root.getAttribute("data-placement")).toBe("top-left");
    expect(root.getAttribute("data-orientation")).toBe("vertical");
    toolbar.destroy();
  });

  it("updates placement and orientation at runtime", () => {
    const { toolbar } = createToolbar();
    const root = document.querySelector(".annotation-toolbar")!;

    toolbar.setPlacement("left");
    expect(root.getAttribute("data-placement")).toBe("left");

    toolbar.setOrientation("vertical");
    expect(root.getAttribute("data-orientation")).toBe("vertical");

    toolbar.destroy();
  });

  it("arms arrow drawing and marks the button active until drawing ends", () => {
    const { toolbar, control, emit } = createToolbar();
    const arrowButton = document.querySelector<HTMLButtonElement>(
      '[data-tooltip="Add arrow"]'
    )!;

    arrowButton.click();
    expect(control.enableArrowDrawing).toHaveBeenCalled();
    expect(arrowButton.classList.contains("active")).toBe(true);

    emit("completeDrawing", { id: "a1" });
    expect(arrowButton.classList.contains("active")).toBe(false);

    toolbar.destroy();
  });

  it("reflects canUndo/canRedo and calls undo/redo on click", () => {
    const { toolbar, control, emit, setUndoable, setRedoable } = createToolbar();
    const undoButton = document.querySelector<HTMLButtonElement>(
      '[data-tooltip="Undo"]'
    )!;
    const redoButton = document.querySelector<HTMLButtonElement>(
      '[data-tooltip="Redo"]'
    )!;

    expect(undoButton.disabled).toBe(true);
    expect(redoButton.disabled).toBe(true);

    setUndoable(true);
    setRedoable(true);
    emit("history", { canUndo: true, canRedo: true });
    expect(undoButton.disabled).toBe(false);
    expect(redoButton.disabled).toBe(false);

    undoButton.click();
    redoButton.click();
    expect(control.undo).toHaveBeenCalledTimes(1);
    expect(control.redo).toHaveBeenCalledTimes(1);

    toolbar.destroy();
  });

  it("deletes the current selection, no-ops when nothing is selected", () => {
    const selected = {
      type: "FeatureCollection",
      features: [{ id: "a1" }]
    } as unknown as AnnotationCollection;
    const { toolbar, control } = createToolbar({}, selected);
    const deleteButton = document.querySelector<HTMLButtonElement>(
      '[data-tooltip="Delete selected"]'
    )!;

    deleteButton.click();
    expect(control.remove).toHaveBeenCalledWith(selected);

    toolbar.destroy();
  });

  it("does not call remove when the selection is empty", () => {
    const { toolbar, control } = createToolbar();
    const deleteButton = document.querySelector<HTMLButtonElement>(
      '[data-tooltip="Delete selected"]'
    )!;

    deleteButton.click();
    expect(control.remove).not.toHaveBeenCalled();

    toolbar.destroy();
  });

  it("destroy removes the root and detaches its listeners", () => {
    const { toolbar, listenerCount } = createToolbar();
    expect(listenerCount("completeDrawing")).toBeGreaterThan(0);

    toolbar.destroy();
    expect(document.querySelector(".annotation-toolbar")).toBeNull();
    expect(listenerCount("completeDrawing")).toBe(0);
  });
});
