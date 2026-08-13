import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  initialRecentColors,
  withColorFromAnnotation,
  rgbaToString,
  attachPanelVisibility,
  svgIcon,
  ICON_PATHS,
  AnnotationPanel,
  type PanelVisibilityControl
} from "../../src/ui";
import type { Annotation, Control } from "../../src";

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
