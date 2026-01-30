import { beforeAll, afterAll, beforeEach, expect, describe, it } from "vitest";
import { BrowserSession } from "./utils";

describe("Snapping", () => {
  const session = new BrowserSession();

  beforeAll(async () => {
    await session.start();
  });

  afterAll(async () => {
    await session.close();
  });

  beforeEach(async () => {
    await session.refresh();
    await session.page.evaluate(async () => {
      const ogma = createOgma({});
      const x = 0;
      const y = 0;

      await ogma.addNodes([
        { id: "1", attributes: { x: -100, y: -100 } },
        { id: "2", attributes: { x: 100, y: 100 } },
        { id: "test", attributes: { x, y } }
      ]);
      await ogma.view.locateGraph();
      await ogma.view.setZoom(2);
    });
  });

  it("should start drawing arrow by dragging", async () => {
    const pos = await session.page.evaluate(async () => {
      const editor = createEditor();
      editor.startArrow(20, 20, createArrow(20, 20, 20, 20));
      return ogma.view.graphToScreenCoordinates({ x: 20, y: 20 });
    });
    await session.page.mouse.move(pos.x, pos.y);
    await session.page.mouse.down();
    await session.page.mouse.move(pos.x + 100, pos.y + 20, { steps: 20 });
    await session.page.mouse.up();

    const annotations = await session.page.evaluate(async () => {
      editor.cancelDrawing();
      return editor.getAnnotations();
    });

    expect(annotations.features.length).toBe(1);
    expect(annotations.features[0].geometry.type).toEqual("LineString");
    expect(annotations.features[0].geometry.coordinates).toEqual([
      [20, 20],
      [70, 30]
    ]);
  }, 5000);
});
