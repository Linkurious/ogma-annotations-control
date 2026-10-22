import { Ogma } from "@linkurious/ogma";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createOgma } from "./utils";
import { Arrow, Control, createBox, createCommentWithArrow } from "../../src";

describe("canDetach", () => {
  let ogma: Ogma;
  let control: Control;

  beforeEach(() => {
    ogma = createOgma();
  });

  afterEach(() => {
    try {
      control?.destroy();
    } catch (e) {
      // headless mode
    }
    try {
      ogma?.destroy();
    } catch (e) {
      // headless mode
    }
  });

  function setup(
    options: ConstructorParameters<typeof Control>[1],
    target: { id: string; type: "node" | "edge" | "box" }
  ) {
    control = new Control(ogma, options);
    const { comment, arrow } = createCommentWithArrow(0, 0, 100, 100, "note");
    arrow.properties.link = {
      ...arrow.properties.link,
      end: {
        side: "end",
        id: target.id,
        type: target.type,
        magnet: { x: 0, y: 0 }
      }
    };
    control.add(comment);
    control.add(arrow);
    return { comment, arrow };
  }

  it("deletes the comment when its node is removed (default)", () => {
    ogma.addNode({ id: "n1", attributes: { x: 0, y: 0 } });
    const { comment, arrow } = setup({}, { id: "n1", type: "node" });

    ogma.removeNode("n1");

    expect(control.getAnnotation(comment.id)).toBeUndefined();
    expect(control.getAnnotation(arrow.id)).toBeUndefined();
  });

  it("deletes the comment when its edge is removed (default)", () => {
    ogma.addNodes([
      { id: "n1", attributes: { x: 0, y: 0 } },
      { id: "n2", attributes: { x: 100, y: 0 } }
    ]);
    ogma.addEdge({ id: "e1", source: "n1", target: "n2" });
    const { comment, arrow } = setup({}, { id: "e1", type: "edge" });

    ogma.removeEdge("e1");

    expect(control.getAnnotation(comment.id)).toBeUndefined();
    expect(control.getAnnotation(arrow.id)).toBeUndefined();
  });

  it("keeps the comment and frees the arrow end when canDetach is true", () => {
    ogma.addNode({ id: "n1", attributes: { x: 0, y: 0 } });
    const { comment, arrow } = setup(
      { canDetach: () => true },
      { id: "n1", type: "node" }
    );

    ogma.removeNode("n1");

    expect(control.getAnnotation(comment.id)).toBeDefined();
    const a = control.getAnnotation<Arrow>(arrow.id)!;
    expect(a.properties.link?.end).toBeUndefined();
    expect(a.properties.link?.start?.id).toBe(comment.id);
  });

  it("deleting an annotation takes its non-detachable comments along", () => {
    const box = createBox(0, 0, 50, 50);
    control = new Control(ogma);
    control.add(box);
    const { comment, arrow } = createCommentWithArrow(0, 0, 100, 100, "note");
    arrow.properties.link = {
      ...arrow.properties.link,
      end: { side: "end", id: box.id, type: "box", magnet: { x: 0, y: 0 } }
    };
    control.add(comment);
    control.add(arrow);

    control.remove(box);

    expect(control.getAnnotation(box.id)).toBeUndefined();
    expect(control.getAnnotation(comment.id)).toBeUndefined();
    expect(control.getAnnotation(arrow.id)).toBeUndefined();
  });

  it("deleting an annotation keeps detachable comments", () => {
    const box = createBox(0, 0, 50, 50);
    control = new Control(ogma, { canDetach: () => true });
    control.add(box);
    const { comment, arrow } = createCommentWithArrow(0, 0, 100, 100, "note");
    arrow.properties.link = {
      ...arrow.properties.link,
      end: { side: "end", id: box.id, type: "box", magnet: { x: 0, y: 0 } }
    };
    control.add(comment);
    control.add(arrow);

    control.remove(box);

    expect(control.getAnnotation(comment.id)).toBeDefined();
    expect(control.getAnnotation(arrow.id)).toBeDefined();
  });

  it("refuses to drag a comment connector's tip off its node unless canDetach", () => {
    ogma.addNode({ id: "n1", attributes: { x: 0, y: 0 } });
    const { arrow } = setup({}, { id: "n1", type: "node" });
    control.select(arrow.id);
    const handler = control["editor"]["handlers"].get("arrow") as any;
    const grab = () => {
      handler.hoveredHandle = { type: "end", point: { x: 0, y: 0 } };
      return handler.onDragStart({ clientX: 0, clientY: 0 });
    };

    expect(grab()).toBe(false);

    control.setOptions({ canDetach: () => true });
    expect(grab()).toBe(true);
  });
});
