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

  // Regression test: the free end of a comment's connector arrow (the node
  // side, not the comment side) must be draggable away from its target and
  // stay detached - not snap back or drag the whole comment along with it.
  it("should detach the arrow's node end when dragged away by hand", async () => {
    const pos = await session.page.evaluate(() => {
      editor.enableCommentDrawing({ offsetX: 50, offsetY: -50 });
      // On node n1 at (-100, -100)
      return ogma.view.graphToScreenCoordinates({ x: -100, y: -100 });
    });
    await drawComment(session, pos);

    const before = await getCommentResult(session);
    expect(before.arrowEndLink).not.toBeNull();
    expect(before.arrowEndLink.type).toBe("node");

    const { arrowId, endScreen, commentBefore } = await session.page.evaluate(() => {
      const annotations = editor.getAnnotations();
      const arrow = annotations.features.find(
        (f) => f.properties.type === "arrow"
      ) as any;
      const comment = annotations.features.find(
        (f) => f.properties.type === "comment"
      ) as any;
      const end = arrow.geometry.coordinates[1];
      editor.select(arrow.id);
      return {
        arrowId: arrow.id,
        endScreen: ogma.view.graphToScreenCoordinates({ x: end[0], y: end[1] }),
        commentBefore: comment.geometry.coordinates
      };
    });

    // Clear of the click-suppression window a drag-end sets (see
    // InteractionController.suppressClicksTemporarily), which would
    // otherwise swallow the mousedown below and stop the drag from ever
    // starting.
    await session.page.waitForTimeout(150);

    // Grab the free (node-side) end handle and drag it well away from the
    // node, out into empty space, then release.
    await session.page.mouse.move(endScreen.x, endScreen.y);
    await session.page.mouse.down();
    await session.page.mouse.move(endScreen.x + 150, endScreen.y - 150, {
      steps: 10
    });
    await session.page.mouse.up();

    const after = await session.page.evaluate((id) => {
      const annotations = editor.getAnnotations();
      const arrow = annotations.features.find((f) => f.id === id) as any;
      const comment = annotations.features.find(
        (f) => f.properties.type === "comment"
      ) as any;
      return {
        arrowEndLink: arrow.properties.link?.end ?? null,
        commentCoordinates: comment.geometry.coordinates
      };
    }, arrowId);

    // The tip is no longer linked to the node.
    expect(after.arrowEndLink).toBeNull();
    // The comment must not have been dragged along with the tip.
    expect(after.commentCoordinates[0]).toBeCloseTo(commentBefore[0], 0);
    expect(after.commentCoordinates[1]).toBeCloseTo(commentBefore[1], 0);
  }, 10000);

  // Regression test: Ogma must not detect (hover, cursor-change, highlight)
  // nodes/edges under the pointer while our own handler is driving a drag
  // (comment, arrow, ...) - even when the pointer passes over an unrelated
  // node mid-drag. options.detect.nodes/edges is the actual hit-testing
  // toggle (ogma.getHoveredElement() stays null while it's off) - turning
  // that off is stronger and cleaner than fighting cursor/hover-style
  // options individually, and it's readable back via getOptions() so the
  // host app's own detect config survives the drag untouched.
  it("should turn off node/edge detection while dragging a comment over a node", async () => {
    const pos = await session.page.evaluate(() => {
      editor.enableCommentDrawing({ offsetX: 50, offsetY: -50 });
      // Far from any node, so this comment's connector doesn't attach to n1.
      return ogma.view.graphToScreenCoordinates({ x: 0, y: -50 });
    });
    await drawComment(session, pos);

    const { commentScreen, nodeScreen } = await session.page.evaluate(() => {
      const comment = editor
        .getAnnotations()
        .features.find((f) => f.properties.type === "comment") as any;
      const [cx, cy] = comment.geometry.coordinates;
      return {
        commentScreen: ogma.view.graphToScreenCoordinates({ x: cx, y: cy }),
        nodeScreen: ogma.view.graphToScreenCoordinates({ x: -100, y: -100 })
      };
    });

    // Clear of the click-suppression window a drag-end sets (see
    // InteractionController.suppressClicksTemporarily), which would
    // otherwise swallow the mousedown below and stop the drag from ever
    // starting.
    await session.page.waitForTimeout(150);

    // Grab the comment (selecting it, same as any first click would) and
    // drag it across node n1's position. An initial small move is needed to
    // engage the drag (mirrors how Handler.handleMouseMove recognizes a
    // drag starting) before jumping straight to the node - a single big
    // synthetic move from mousedown straight onto the node isn't a reliable
    // way to engage it.
    await session.page.mouse.move(commentScreen.x, commentScreen.y);
    await session.page.mouse.down();
    await session.page.mouse.move(commentScreen.x + 10, commentScreen.y - 10, {
      steps: 3
    });
    await session.page.mouse.move(nodeScreen.x, nodeScreen.y, { steps: 10 });

    const midDrag = await session.page.evaluate(() => ({
      detect: ogma.getOptions().detect,
      hovered: ogma.getHoveredElement()
    }));

    await session.page.mouse.up();

    const afterDrag = await session.page.evaluate(
      () => ogma.getOptions().detect
    );

    // While dragging, node/edge detection is off - the node under the
    // pointer never becomes "hovered" in the first place.
    expect(midDrag.detect?.nodes).toBe(false);
    expect(midDrag.detect?.edges).toBe(false);
    expect(midDrag.hovered).toBeNull();
    // Once released, Ogma's real detect options (on by default) are back.
    expect(afterDrag?.nodes).toBe(true);
    expect(afterDrag?.edges).toBe(true);
  }, 10000);

  // Regression test: dragging a polygon must persist the rigid-follow
  // translation of its attached comments into the committed store, not just
  // the live/visual position - exporting right after a drag (export reads
  // committed state) must reflect where the comments ended up on screen.
  it("should persist a comment's rigid-follow move after dragging its polygon", async () => {
    const pos = await session.page.evaluate(() => {
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
      // Inside the polygon, so the arrow's free end snaps to it.
      return ogma.view.graphToScreenCoordinates({ x: 105, y: -75 });
    });
    await drawComment(session, pos);
    await session.page.waitForTimeout(150);

    const before = await session.page.evaluate(() => {
      const feats = editor.getAnnotations().features;
      return {
        comment: (feats.find((f) => f.properties.type === "comment") as any)
          .geometry.coordinates
      };
    });

    // Drag the polygon body by (40, -40) graph units - computed via screen
    // coordinates for both graph-space endpoints, not raw pixel offsets,
    // since locateGraph()'s auto-fit zoom here isn't 1:1.
    const { dragFrom, dragTo, dragMid } = await session.page.evaluate(() => {
      const polygon = editor
        .getAnnotations()
        .features.find((f) => f.properties.type === "polygon") as any;
      editor.select(polygon.id);
      return {
        dragFrom: ogma.view.graphToScreenCoordinates({ x: 105, y: -75 }),
        dragMid: ogma.view.graphToScreenCoordinates({ x: 110, y: -80 }),
        dragTo: ogma.view.graphToScreenCoordinates({ x: 145, y: -115 })
      };
    });
    await session.page.waitForTimeout(150);
    await session.page.mouse.move(dragFrom.x, dragFrom.y);
    await session.page.mouse.down();
    await session.page.mouse.move(dragMid.x, dragMid.y, { steps: 3 });
    await session.page.mouse.move(dragTo.x, dragTo.y, { steps: 10 });
    await session.page.mouse.up();

    // Committed state - what export/getAnnotations reflects after the drag,
    // not the live in-progress position.
    const after = await session.page.evaluate(() => {
      const feats = editor.getAnnotations().features;
      return {
        comment: (feats.find((f) => f.properties.type === "comment") as any)
          .geometry.coordinates
      };
    });

    expect(after.comment[0]).toBeCloseTo(before.comment[0] + 40, 0);
    expect(after.comment[1]).toBeCloseTo(before.comment[1] - 40, 0);
  }, 10000);

  // Regression test: exporting a polygon-attached comment and re-importing
  // that exact export (a save/reload cycle) must not corrupt the link -
  // dragging the polygon afterward must still rigidly carry the comment.
  // Links.add() only ever receives an ABSOLUTE point for a fresh polygon
  // snap, but the format it stores/exports is the bbox-relative fraction;
  // re-adding a link straight from that already-relative exported magnet
  // (as import does) must not run it through the absolute conversion again.
  it("should survive an export/re-import round trip before dragging its polygon", async () => {
    await session.page.evaluate(() => {
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
    });

    const pos = await session.page.evaluate(() => {
      editor.enableCommentDrawing({ offsetX: 50, offsetY: -50 });
      return ogma.view.graphToScreenCoordinates({ x: 105, y: -75 });
    });
    await drawComment(session, pos);
    await session.page.waitForTimeout(150);

    // Export, then reset to a fresh Ogma+Control and re-import that export -
    // simulating a save followed by a reload.
    const before = await session.page.evaluate(async () => {
      const exported = editor.getAnnotations();
      document.getElementById("graph-container")!.innerHTML = "";
      const ogma2 = createOgma({});
      window.ogma = ogma2;
      window.editor = createEditor();
      editor.add(exported);
      await ogma.view.locateGraph();
      const feats = editor.getAnnotations().features;
      return {
        comment: (feats.find((f) => f.properties.type === "comment") as any)
          .geometry.coordinates
      };
    });

    const { dragFrom, dragMid, dragTo } = await session.page.evaluate(() => {
      const polygon = editor
        .getAnnotations()
        .features.find((f) => f.properties.type === "polygon") as any;
      editor.select(polygon.id);
      return {
        dragFrom: ogma.view.graphToScreenCoordinates({ x: 105, y: -75 }),
        dragMid: ogma.view.graphToScreenCoordinates({ x: 110, y: -80 }),
        dragTo: ogma.view.graphToScreenCoordinates({ x: 145, y: -115 })
      };
    });
    await session.page.waitForTimeout(150);
    await session.page.mouse.move(dragFrom.x, dragFrom.y);
    await session.page.mouse.down();
    await session.page.mouse.move(dragMid.x, dragMid.y, { steps: 3 });
    await session.page.mouse.move(dragTo.x, dragTo.y, { steps: 10 });
    await session.page.mouse.up();

    const after = await session.page.evaluate(() => {
      const feats = editor.getAnnotations().features;
      return {
        comment: (feats.find((f) => f.properties.type === "comment") as any)
          .geometry.coordinates
      };
    });

    expect(after.comment[0]).toBeCloseTo(before.comment[0] + 40, 0);
    expect(after.comment[1]).toBeCloseTo(before.comment[1] - 40, 0);
  }, 10000);

  // Regression test: clicking/dragging a connector's endpoint that
  // geometrically sits inside a polygon must not steal the selection away
  // to the polygon underneath it. InteractionController.detect() used to
  // hand the click to whichever feature the spatial index happened to
  // check first - a polygon's filled body matches almost any point inside
  // it, so it very often won over a much more specific arrow-endpoint
  // match, replacing the selection and tearing down the arrow handler's
  // listeners mid-gesture. Thin/point targets (arrows) must win over
  // area-filling ones (polygons/boxes) at the same point.
  it("should keep an arrow endpoint selectable when it sits inside a polygon", async () => {
    const arrowId = await session.page.evaluate(async () => {
      const polygon = createPolygon(
        [
          [
            [-100, -100],
            [100, -100],
            [100, 100],
            [-100, 100],
            [-100, -100]
          ]
        ],
        { id: "poly1" }
      );
      editor.add(polygon);
      editor.unselect();
      // Free-standing arrow (not linked to the polygon) whose end point
      // sits well inside the polygon's body.
      const arrow = createArrow(-300, -300, 0, 0);
      editor.add(arrow);
      editor.unselect();
      await ogma.view.setCenter({ x: -100, y: -100 });
      await ogma.view.setZoom(1.2);
      return arrow.id;
    });

    const endScreen = await session.page.evaluate((id) => {
      editor.select(id);
      return ogma.view.graphToScreenCoordinates({ x: 0, y: 0 });
    }, arrowId);

    await session.page.waitForTimeout(150);
    await session.page.mouse.move(endScreen.x, endScreen.y);
    await session.page.mouse.down();

    const afterDown = await session.page.evaluate(
      () => [...editor.getSelectedAnnotations().features.map((f) => f.id)]
    );
    // The arrow stays selected - the polygon underneath it doesn't steal
    // the selection just because the click also lands inside its body.
    expect(afterDown).toEqual([arrowId]);

    // A real drag: a small engaging move, then further out - not a single
    // large synthetic jump (see the earlier detach test's own note on this).
    await session.page.mouse.move(endScreen.x + 2, endScreen.y - 2, {
      steps: 1
    });
    await session.page.mouse.move(endScreen.x + 30, endScreen.y - 30, {
      steps: 5
    });
    await session.page.mouse.up();

    const after = await session.page.evaluate((id) => {
      const arrow = editor
        .getAnnotations()
        .features.find((f) => f.id === id) as any;
      return arrow.geometry.coordinates[1];
    }, arrowId);

    // The endpoint actually moved with the drag, not left behind at (0, 0).
    expect(after[0]).not.toBeCloseTo(0, 0);
    expect(after[1]).not.toBeCloseTo(0, 0);
  }, 10000);
});
