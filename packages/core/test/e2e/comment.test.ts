import { beforeAll, afterAll, beforeEach, expect, describe, it } from "vitest";
import type { Point } from "geojson";
import { BrowserSession } from "./utils";

describe("Comments", () => {
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
      await ogma.addNodes([
        { id: "n1", attributes: { x: -100, y: -100 } },
        { id: "n2", attributes: { x: 100, y: 100 } }
      ]);
      await ogma.addEdge({ id: "e1", source: "n1", target: "n2" });
      await ogma.view.locateGraph();
      await ogma.view.setZoom(2);
      createEditor();
    });
  });

  async function drawComment(
    session: BrowserSession,
    target: { x: number; y: number }
  ) {
    await session.page.mouse.move(target.x, target.y);
    await session.page.mouse.down();
    await session.page.mouse.move(target.x + 80, target.y - 80, { steps: 10 });
    await session.page.mouse.up();
  }

  function getCommentResult(session: BrowserSession) {
    return session.page.evaluate(() => {
      const annotations = editor.getAnnotations();
      const comment = annotations.features.find(
        (f) => f.properties.type === "comment"
      );
      const arrow = annotations.features.find(
        (f) => f.properties.type === "arrow"
      );
      return {
        hasComment: !!comment,
        hasArrow: !!arrow,
        arrowEndLink: (arrow as any)?.properties?.link?.end ?? null
      };
    });
  }

  it("should create comment on void", async () => {
    const pos = await session.page.evaluate(() => {
      editor.enableCommentDrawing({ offsetX: 50, offsetY: -50 });
      // Far from any node or edge (off-diagonal from the n1-n2 edge)
      return ogma.view.graphToScreenCoordinates({ x: 0, y: -50 });
    });

    await drawComment(session, pos);
    const result = await getCommentResult(session);

    expect(result.hasComment).toBe(true);
    expect(result.hasArrow).toBe(true);
    expect(result.arrowEndLink).toBeNull();
  }, 10000);

  it("should create comment on node", async () => {
    const pos = await session.page.evaluate(() => {
      editor.enableCommentDrawing({ offsetX: 50, offsetY: -50 });
      // On node n1 at (-100, -100)
      return ogma.view.graphToScreenCoordinates({ x: -100, y: -100 });
    });

    await drawComment(session, pos);
    const result = await getCommentResult(session);

    expect(result.hasComment).toBe(true);
    expect(result.hasArrow).toBe(true);
    expect(result.arrowEndLink).not.toBeNull();
    expect(result.arrowEndLink.type).toBe("node");
  }, 10000);

  it("should create comment on edge", async () => {
    const pos = await session.page.evaluate(() => {
      editor.enableCommentDrawing({ offsetX: 50, offsetY: -50 });
      // Midpoint of edge e1 between (-100,-100) and (100,100) is (0,0)
      return ogma.view.graphToScreenCoordinates({ x: 0, y: 0 });
    });

    await drawComment(session, pos);
    const result = await getCommentResult(session);

    expect(result.hasComment).toBe(true);
    expect(result.hasArrow).toBe(true);
    expect(result.arrowEndLink).not.toBeNull();
    expect(result.arrowEndLink.type).toBe("edge");
  }, 10000);

  it("should create comment on annotation", async () => {
    const pos = await session.page.evaluate(() => {
      // Create a polygon annotation far from nodes/edges (off-diagonal)
      const polygon = createPolygon(
        [
          [
            [80, -100],
            [130, -100],
            [130, -50],
            [80, -50],
            [80, -100]
          ]
        ],
        { id: "poly1" }
      );
      editor.add(polygon);
      editor.unselect();

      editor.enableCommentDrawing({ offsetX: 50, offsetY: -50 });
      // Center of the polygon
      return ogma.view.graphToScreenCoordinates({ x: 105, y: -75 });
    });

    await drawComment(session, pos);
    const result = await getCommentResult(session);

    expect(result.hasComment).toBe(true);
    expect(result.hasArrow).toBe(true);
    expect(result.arrowEndLink).not.toBeNull();
    expect(result.arrowEndLink.type).toBe("polygon");
  }, 10000);

  // Regression test: a second comment must be created at its own coordinate,
  // independent of the first. Both draw points are kept close to the graph
  // centre so they map to on-screen positions — Playwright drops synthetic
  // mouse events dispatched at off-viewport coordinates.
  it("should create a second comment at its own coordinate, not the first's", async () => {
    // First comment, drawn near graph centre at (-40, -40).
    const firstPos = await session.page.evaluate(() => {
      editor.enableCommentDrawing({ offsetX: 50, offsetY: -50 });
      return ogma.view.graphToScreenCoordinates({ x: -40, y: -40 });
    });
    await drawComment(session, firstPos);

    // Second comment, drawn at a different on-screen graph point (40, 40).
    const secondPos = await session.page.evaluate(() => {
      editor.enableCommentDrawing({ offsetX: 50, offsetY: -50 });
      return ogma.view.graphToScreenCoordinates({ x: 40, y: 40 });
    });
    await drawComment(session, secondPos);

    const result = await session.page.evaluate(() => {
      const comments = editor
        .getAnnotations()
        .features.filter((f) => f.properties.type === "comment");
      return {
        count: comments.length,
        coords: comments.map((c) => (c.geometry as Point).coordinates)
      };
    });

    // Both comments exist as distinct annotations.
    expect(result.count).toBe(2);

    const [first, second] = result.coords;
    // The second comment must not collapse onto the first comment's position.
    const dx = second[0] - first[0];
    const dy = second[1] - first[1];
    const distance = Math.hypot(dx, dy);
    // The two draw points are ~110 graph units apart; if the second comment
    // were mis-anchored to the first's coordinate they'd be near-identical.
    expect(distance).toBeGreaterThan(50);
  }, 10000);
});
