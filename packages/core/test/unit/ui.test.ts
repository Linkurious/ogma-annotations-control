import { describe, it, expect, vi } from "vitest";
import {
  initialRecentColors,
  withColorFromAnnotation,
  rgbaToString,
  attachPanelVisibility,
  svgIcon,
  ICON_PATHS,
  type PanelVisibilityControl
} from "../../src/ui";
import type { Annotation } from "../../src";

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
      const wrapped = (...args: never[]) => {
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

  it("shows on click after a single selection", () => {
    const { control, emit } = createFakeControl(annotation);
    const onShow = vi.fn();
    const onHide = vi.fn();
    attachPanelVisibility(control, { onShow, onHide });

    emit("select", { ids: ["a1"] });
    expect(onShow).not.toHaveBeenCalled(); // pending, not shown yet
    emit("click");
    expect(onShow).toHaveBeenCalledWith(annotation);
  });

  it("does not show on click when a drag started after selection", () => {
    const { control, emit } = createFakeControl(annotation);
    const onShow = vi.fn();
    const onHide = vi.fn();
    attachPanelVisibility(control, { onShow, onHide });

    emit("select", { ids: ["a1"] });
    emit("dragstart");
    expect(onHide).toHaveBeenCalled();
    emit("click");
    expect(onShow).not.toHaveBeenCalled();
  });

  it("hides on a multi-selection", () => {
    const { control, emit } = createFakeControl(annotation);
    const onShow = vi.fn();
    const onHide = vi.fn();
    attachPanelVisibility(control, { onShow, onHide });

    emit("select", { ids: ["a1", "a2"] });
    expect(onHide).toHaveBeenCalled();
    expect(onShow).not.toHaveBeenCalled();
  });

  it("defers showing until drawing completes", () => {
    const { control, emit, setDrawing } = createFakeControl(annotation);
    const onShow = vi.fn();
    attachPanelVisibility(control, { onShow, onHide: vi.fn() });

    setDrawing(true);
    emit("select", { ids: ["a1"] });
    expect(onShow).not.toHaveBeenCalled();
    emit("completeDrawing");
    expect(onShow).toHaveBeenCalledWith(annotation);
  });

  it("detach removes every registered listener", () => {
    const { control, emit, listenerCount } = createFakeControl(annotation);
    const onShow = vi.fn();
    const detach = attachPanelVisibility(control, { onShow, onHide: vi.fn() });

    detach();
    expect(listenerCount("select")).toBe(0);
    expect(listenerCount("click")).toBe(0);
    emit("select", { ids: ["a1"] });
    emit("click");
    expect(onShow).not.toHaveBeenCalled();
  });
});
