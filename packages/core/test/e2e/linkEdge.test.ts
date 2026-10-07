import { beforeAll, afterAll, beforeEach, expect, describe, it } from "vitest";
import { BrowserSession, captureScreenshotOnTestEnd } from "./utils";

describe("control.link() to an edge", () => {
  const session = new BrowserSession();

  beforeAll(async () => {
    await session.start();
  });

  afterAll(async () => {
    await session.close();
  });

  beforeEach(async () => {
    captureScreenshotOnTestEnd(session, "linkEdge");
    await session.refresh();
  });

  it("relinks the same arrow to a new edge and follows it, without history", async () => {
    const res = await session.page.evaluate(() => {
      const ogma = createOgma({});
      ogma.addNodes([
        { id: "a", attributes: { x: 0, y: 0 } },
        { id: "b", attributes: { x: 200, y: 0 } }
      ]);
      ogma.addEdge({ id: "e1", source: "a", target: "b" });
      const editor = createEditor();
      const arrow = createArrow(100, -100, 100, -50);
      editor.add(arrow);
      editor.link(arrow.id, ogma.getEdge("e1")!, "end");

      // grouping off, then on: a different edge appears
      ogma.removeEdge("e1");
      ogma.addEdge({ id: "e2", source: "a", target: "b" });
      const undoBefore = editor.canUndo();
      editor.link(arrow.id, ogma.getEdge("e2")!, "end");

      const end = () =>
        (editor.getAnnotation(arrow.id) as any).geometry.coordinates[1];
      const linked = (editor.getAnnotation(arrow.id) as any).properties.link
        .end;
      const first = end();
      // connector follows the new edge
      ogma.getNode("b")!.setAttributes({ x: 400, y: 0 });
      return {
        ids: editor.getAnnotations().features.map((f) => f.id),
        arrowId: arrow.id,
        linked,
        first,
        moved: end(),
        undoBefore,
        undoAfter: editor.canUndo()
      };
    });

    expect(res.ids).toEqual([res.arrowId]);
    expect(res.linked).toMatchObject({ id: "e2", type: "edge" });
    expect(res.first[0]).toBeCloseTo(100);
    expect(res.first[1]).toBeCloseTo(0);
    await session.page.waitForFunction(
      () => (editor.getAnnotation(editor.getAnnotations().features[0].id) as any)
        .geometry.coordinates[1][0] > 150
    );
    expect(res.undoAfter).toBe(res.undoBefore);
  }, 15000);
});
