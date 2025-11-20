import { beforeAll, afterAll, beforeEach, expect, describe, it } from "vitest";
import { BrowserSession } from "./utils";
describe("Snapping", () => {
  const session = new BrowserSession();
  let bottomRight: { x: number; y: number };
  let nodeBottom: { x: number; y: number };

  beforeAll(async () => {
    await session.start(false);
  });

  afterAll(async () => {
    await session.close();
  });

  beforeEach(async () => {
    await session.refresh();
    const pts = await session.page.evaluate(() => {
      const ogma = createOgma({});
      const x = 0;
      const y = 0;
      ogma.addNodes([
        { id: "1", attributes: { x: -100, y: -100 } },
        { id: "2", attributes: { x: 100, y: 100 } },
        { id: "test", attributes: { x, y } }
      ]);

      ogma.view.set({
        x: 0,
        y: 0,
        zoom: 2
      });
      const editor = createEditor();
      const [topLeft, bottomRight, center] = ogma
        .getNodes()
        .map((n) => n.getPosition());

      const nodeBottom = ogma.view.graphToScreenCoordinates({
        x,
        y: y + +ogma.getNode("test")!.getAttribute("radius")
      });
      const start = {
        x: (topLeft.x + center.x) / 2,
        y: (topLeft.y + center.y) / 2
      };
      editor.startArrow(
        start.x,
        start.y,
        createArrow(start.x, start.y, start.x, start.y)
      );
      console.log("ICI", editor.getAnnotations().features);
      return { topLeft, center, bottomRight, nodeBottom, start };
    });
    bottomRight = pts.bottomRight;
    nodeBottom = pts.nodeBottom;
  });

  it("should snap to a node", async () => {
    // attach the arrow to the node
    await session.page.mouse.move(nodeBottom.x, nodeBottom.y, { steps: 10 });
    await session.page.mouse.up();
    await session.page.evaluate(() => {
      ogma.getNode("test")?.setSelected(true);
    });
    await session.page.mouse.down();
    await session.page.mouse.move(bottomRight.x, bottomRight.y, { steps: 10 });
    const { node, arrowPoints } = await session.page.evaluate(() => {
      return {
        node: ogma.getNode("test")!.getPosition(),
        arrowPoints: editor.getAnnotations().features[0].geometry
          .coordinates as number[][]
      };
    });
    expect(
      arrowPoints.some(([x1, y1]) => {
        const { x, y } = node;
        const dx = x1 - x;
        const dy = y1 - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist < 10;
      })
    ).toBe(true);
  }, 5000);
});
