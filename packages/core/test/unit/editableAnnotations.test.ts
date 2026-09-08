import { Ogma } from "@linkurious/ogma";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createOgma } from "./utils";
import {
  Control,
  createArrow,
  createBox,
  createCommentWithArrow,
  createText
} from "../../src";

describe("isEditable", () => {
  let ogma: Ogma;
  let control: Control;

  beforeEach(() => {
    ogma = createOgma();
  });

  afterEach(() => {
    try {
      control?.destroy();
    } catch (e) {
      // Ignore - headless mode
    }
    try {
      ogma?.destroy();
    } catch (e) {
      // Ignore - headless mode
    }
  });

  function lockedControl(lockedId: string) {
    control = new Control(ogma, {
      isEditable: (a) => a.id !== lockedId
    });
    return control;
  }

  it("store.updateFeature refuses a locked annotation, state unchanged", () => {
    const text = createText(0, 0, 50, 50, "a");
    control = lockedControl(text.id);
    control.add(text);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    control["store"].getState().updateFeature(text.id, {
      properties: { ...text.properties, content: "changed" }
    });

    expect(control.getAnnotation(text.id)?.properties.content).toBe("a");
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("store.removeFeature refuses a locked annotation, state unchanged", () => {
    const box = createBox(0, 0, 50, 50);
    control = lockedControl(box.id);
    control.add(box);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    control["store"].getState().removeFeature(box.id);

    expect(control.getAnnotation(box.id)).toBeDefined();
    errorSpy.mockRestore();
  });

  it("control.update/updateStyle/setScale/remove all no-op for a locked annotation", () => {
    const text = createText(0, 0, 50, 50, "a");
    control = lockedControl(text.id);
    control.add(text);
    vi.spyOn(console, "error").mockImplementation(() => {});

    control.update({ id: text.id, properties: { content: "changed" } });
    expect((control.getAnnotation(text.id)?.properties as { content?: string }).content).toBe(
      "a"
    );

    control.updateStyle(text.id, { color: "red" });
    expect(control.getAnnotation(text.id)?.properties.style?.color).not.toBe("red");

    const before = control.getAnnotation(text.id)?.geometry.coordinates;
    control.setScale(text.id, 2, 0, 0);
    expect(control.getAnnotation(text.id)?.geometry.coordinates).toEqual(before);

    control.remove(text);
    expect(control.getAnnotation(text.id)).toBeDefined();
  });

  it("control.link no-ops when the arrow itself is locked (the arrow is what's mutated, not its target)", () => {
    const text = createText(0, 0, 50, 50, "a");
    const arrow = createArrow(0, 0, 200, 200);
    control = lockedControl(arrow.id);
    control.add(text);
    control.add(arrow);
    vi.spyOn(console, "error").mockImplementation(() => {});

    control.link(arrow.id, text.id, "start");

    expect(
      control.getAnnotation<typeof arrow>(arrow.id)?.properties.link?.start
    ).toBeUndefined();
  });

  it("selection still works on a locked annotation", () => {
    const text = createText(0, 0, 50, 50, "a");
    control = lockedControl(text.id);
    control.add(text);

    control.select(text.id);

    expect(control.getSelectedAnnotations().features.map((f) => f.id)).toEqual([
      text.id
    ]);
    expect(control.isAnnotationEditable(text.id)).toBe(false);
  });

  it("deleting a comment is refused entirely if its cascade includes a locked arrow", () => {
    const { comment, arrow } = createCommentWithArrow(0, 0, 100, 100, "note");
    control = lockedControl(arrow.id);
    control.add(comment);
    control.add(arrow);
    vi.spyOn(console, "error").mockImplementation(() => {});

    control.remove(comment);

    expect(control.getAnnotation(comment.id)).toBeDefined();
    expect(control.getAnnotation(arrow.id)).toBeDefined();
  });

  it("an in-progress drawing stays cancelable even if isEditable would refuse it", () => {
    // A predicate that refuses everything - the harshest possible case.
    control = new Control(ogma, { isEditable: () => false });
    control.startBox(0, 0);

    expect(control.isDrawing()).toBe(true);
    control.cancelDrawing();
    expect(control.isDrawing()).toBe(false);
  });

  it("a locked, selected comment doesn't render its own edit/send button", () => {
    const { comment, arrow } = createCommentWithArrow(0, 0, 100, 100, "note");
    control = lockedControl(comment.id);
    control.add(comment);
    control.add(arrow);
    control.select(comment.id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const shapes = control["renderers"]["shapes"] as any;
    shapes.render(shapes.layer.element);

    expect(
      (shapes.layer.element as SVGSVGElement).querySelector(".ogma-send-button")
    ).toBeNull();
  });

  it("a locked, selected box keeps its selection outline but drops the resize handles", () => {
    // Default box style has a borderRadius, so renderOutline draws via
    // quadraticCurveTo; renderBoxHandles draws the corner squares via rect -
    // distinct enough to tell the two apart via a plain context spy.
    const box = createBox(0, 0, 50, 50);
    control = lockedControl(box.id);
    control.add(box);
    control.select(box.id);

    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      rect: vi.fn(),
      strokeRect: vi.fn(),
      quadraticCurveTo: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (control["renderers"]["handles"] as any).render(ctx);

    expect(ctx.quadraticCurveTo).toHaveBeenCalled(); // outline: still selected
    expect(ctx.rect).not.toHaveBeenCalled(); // corner handles: locked, none drawn
  });

  it("an unlocked, selected box still shows resize handles (no regression)", () => {
    const box = createBox(0, 0, 50, 50);
    control = new Control(ogma);
    control.add(box);
    control.select(box.id);

    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      rect: vi.fn(),
      strokeRect: vi.fn(),
      quadraticCurveTo: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (control["renderers"]["handles"] as any).render(ctx);

    expect(ctx.quadraticCurveTo).toHaveBeenCalled();
    expect(ctx.rect).toHaveBeenCalled();
  });
});
