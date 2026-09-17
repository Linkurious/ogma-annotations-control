import { Ogma } from "@linkurious/ogma";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createOgma } from "./utils";
import { Control, createBox, createText } from "../../src";

describe("isVisible", () => {
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

  // Exercises the real Shapes render loop directly (Ogma's own draw-callback
  // scheduling doesn't run in this headless harness) - same technique as
  // reading its layer element in other renderer-facing tests.
  function renderAll() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const shapes = control["renderers"]["shapes"] as any;
    shapes.render(shapes.layer.element);
    shapes.renderUnderGraph(shapes.underLayer.element);
    return shapes.layer.element as SVGSVGElement;
  }

  it("never creates a DOM node for a hidden text annotation", () => {
    const text = createText(0, 0, 50, 50, "a");
    control = new Control(ogma, { isVisible: (a) => a.id !== text.id });
    control.add(text);

    const root = renderAll();

    expect(root.querySelector(`[data-annotation="${text.id}"]`)).toBeNull();
  });

  it("never creates a DOM node for a hidden box annotation", () => {
    const box = createBox(0, 0, 50, 50);
    control = new Control(ogma, { isVisible: (a) => a.id !== box.id });
    control.add(box);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const shapes = control["renderers"]["shapes"] as any;
    shapes.render(shapes.layer.element);
    shapes.renderUnderGraph(shapes.underLayer.element);
    const underRoot = shapes.underLayer.element as SVGSVGElement;

    expect(underRoot.querySelector(`[data-annotation="${box.id}"]`)).toBeNull();
  });

  it("removes an existing DOM node once a feature goes visible -> hidden", () => {
    const text = createText(0, 0, 50, 50, "a");
    let hidden = false;
    control = new Control(ogma, { isVisible: (a) => !(hidden && a.id === text.id) });
    control.add(text);

    let root = renderAll();
    expect(root.querySelector(`[data-annotation="${text.id}"]`)).not.toBeNull();

    hidden = true;
    // Same predicate function reference - isVisible's *answer* changed, not
    // the reference, so this also exercises that a plain re-render (not
    // just setOptions) still picks it up on the next pass.
    root = renderAll();

    expect(root.querySelector(`[data-annotation="${text.id}"]`)).toBeNull();
  });

  it("getAnnotations/getAnnotation/getSelectedAnnotations still return a hidden annotation's full data", () => {
    const text = createText(0, 0, 50, 50, "a");
    control = new Control(ogma, { isVisible: (a) => a.id !== text.id });
    control.add(text);
    control.select(text.id);

    expect(control.getAnnotations().features.map((f) => f.id)).toContain(text.id);
    expect(control.getAnnotation(text.id)).toBeDefined();
    expect(control.getSelectedAnnotations().features.map((f) => f.id)).toContain(
      text.id
    );
    expect(control.isAnnotationVisible(text.id)).toBe(false);
  });
});
