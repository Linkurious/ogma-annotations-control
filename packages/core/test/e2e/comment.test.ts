import { beforeAll, afterAll, beforeEach, expect, describe, it } from "vitest";
import type { Point } from "geojson";
import { BrowserSession, captureScreenshotOnTestEnd } from "./utils";

describe("Comments", () => {
  const session = new BrowserSession();

  beforeAll(async () => {
    await session.start();
  });

  afterAll(async () => {
    await session.close();
  });

  beforeEach(async () => {
    captureScreenshotOnTestEnd(session, "comment");
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
      editor.enableCommentDrawing({ offsetX: 50, offsetY: -50, ...demoStyles.comment });
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
      editor.enableCommentDrawing({ offsetX: 50, offsetY: -50, ...demoStyles.comment });
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
      editor.enableCommentDrawing({ offsetX: 50, offsetY: -50, ...demoStyles.comment });
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

      editor.enableCommentDrawing({ offsetX: 50, offsetY: -50, ...demoStyles.comment });
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
      editor.enableCommentDrawing({ offsetX: 50, offsetY: -50, ...demoStyles.comment });
      return ogma.view.graphToScreenCoordinates({ x: -40, y: -40 });
    });
    await drawComment(session, firstPos);

    // Second comment, drawn at a different on-screen graph point (40, 40).
    const secondPos = await session.page.evaluate(() => {
      editor.enableCommentDrawing({ offsetX: 50, offsetY: -50, ...demoStyles.comment });
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
      editor.enableCommentDrawing({ offsetX: 50, offsetY: -50, ...demoStyles.comment });
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
      editor.enableCommentDrawing({ offsetX: 50, offsetY: -50, ...demoStyles.comment });
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

      editor.enableCommentDrawing({ offsetX: 50, offsetY: -50, ...demoStyles.comment });
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
      editor.enableCommentDrawing({ offsetX: 50, offsetY: -50, ...demoStyles.comment });
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

  // Regression / clarity: a freshly drawn comment drops straight into edit
  // mode - see Drawing.startComment's onCommentCreated callback, which
  // calls startEditingText() the instant the comment is added. There's no
  // separate "now click to add text" step; the textarea is already focused
  // by the time the draw gesture ends.
  it("should drop straight into edit mode after drawing, ready to type", async () => {
    const pos = await session.page.evaluate(() => {
      editor.enableCommentDrawing({ offsetX: 50, offsetY: -50, ...demoStyles.comment });
      return ogma.view.graphToScreenCoordinates({ x: 0, y: -50 });
    });
    await drawComment(session, pos);

    // The textarea exists and already has focus - no extra click needed.
    const focused = await session.page.evaluate(
      () => document.activeElement?.tagName === "TEXTAREA"
    );
    expect(focused).toBe(true);

    await session.page.keyboard.type("first draft");
    const liveValue = await session.page.evaluate(
      () => document.querySelector("textarea")?.value
    );
    expect(liveValue).toBe("first draft");

    // Deselecting commits the live textarea value into the real content.
    await session.page.evaluate(() => { editor.unselect(); });
    const content = await session.page.evaluate(() => {
      const comment = editor
        .getAnnotations()
        .features.find((f) => f.properties.type === "comment");
      return (comment?.properties as { content?: string })?.content;
    });
    expect(content).toBe("first draft");
  }, 10000);

  // Regression / clarity: re-opening an ALREADY-CREATED comment needs two
  // separate clicks - the first click only selects it (TextHandler.onClick's
  // justActivated gate deliberately skips entering edit mode on the very
  // click that selected the comment), the second click is what actually
  // enters edit mode. This is the "am I editing or adding text" ambiguity -
  // asserting each click's effect on its own makes the two-step gesture
  // explicit and catches a regression either way (edit firing too early on
  // the select click, or never firing on the second click).
  it("should require a second click to edit an already-selected comment, prefilled with its existing content", async () => {
    const pos = await session.page.evaluate(() => {
      editor.enableCommentDrawing({ offsetX: 50, offsetY: -50, ...demoStyles.comment });
      return ogma.view.graphToScreenCoordinates({ x: 0, y: -50 });
    });
    await drawComment(session, pos);
    await session.page.keyboard.type("existing note");
    await session.page.evaluate(() => { editor.unselect(); });

    const commentScreen = await session.page.evaluate(() => {
      const comment = editor
        .getAnnotations()
        .features.find((f) => f.properties.type === "comment") as any;
      const [cx, cy] = comment.geometry.coordinates;
      return ogma.view.graphToScreenCoordinates({ x: cx, y: cy });
    });

    // First click: selects only. No textarea yet - this click must not be
    // mistaken for "entering edit mode".
    await session.page.mouse.click(commentScreen.x, commentScreen.y);
    const afterFirstClick = await session.page.evaluate(() => ({
      selected: editor.getSelectedAnnotations().features.length,
      hasTextarea: !!document.querySelector("textarea")
    }));
    expect(afterFirstClick.selected).toBe(1);
    expect(afterFirstClick.hasTextarea).toBe(false);

    // Second click: now it actually enters edit mode, pre-filled with the
    // existing content (this is "editing", not "adding" fresh blank text).
    await session.page.mouse.click(commentScreen.x, commentScreen.y);
    const prefilled = await session.page.evaluate(
      () => document.querySelector("textarea")?.value
    );
    expect(prefilled).toBe("existing note");

    // Appending text edits the existing content in place.
    await session.page.keyboard.type(" - updated");
    await session.page.evaluate(() => { editor.unselect(); });
    const content = await session.page.evaluate(() => {
      const comment = editor
        .getAnnotations()
        .features.find((f) => f.properties.type === "comment");
      return (comment?.properties as { content?: string })?.content;
    });
    expect(content).toBe("existing note - updated");
  }, 10000);

  // Regression test: typing enough lines to auto-grow the comment box must
  // move the connector's box-side endpoint along with it, live, not just
  // once the edit session ends. TextArea.updateContent()'s auto-grow only
  // ever writes to store.liveUpdates (never state.features), which every
  // other link-follow path is blind to (LinkSync's setMultipleAttributes/
  // addEdges/removeEdges listeners, and Links.onAddArrow's state.features
  // subscriber) - LinkSync.onEditingLiveUpdate is the one path that reacts
  // to it, scoped to state.editingFeature specifically so it can't overlap
  // with the separate interactive-drag cascade.
  it("should keep the connector attached to a growing comment box while typing", async () => {
    const pos = await session.page.evaluate(() => {
      editor.enableCommentDrawing({ offsetX: 50, offsetY: -50, ...demoStyles.comment });
      // On node n1, so the arrow's far end has a fixed reference point.
      return ogma.view.graphToScreenCoordinates({ x: -100, y: -100 });
    });
    await drawComment(session, pos);

    const readLiveEndpoint = () =>
      session.page.evaluate(() => {
        // Reach past the public API for the *live* (not yet committed)
        // merged state - same precedent as the internal-state reads in
        // test/unit/links.test.ts.
        const state = (editor as any)["store"].getState();
        const feats = editor.getAnnotations().features;
        const comment = feats.find((f) => f.properties.type === "comment")!;
        const arrow = feats.find((f) => f.properties.type === "arrow")!;
        const liveComment = state.getMergedFeature(comment.id);
        const liveArrow = state.getMergedFeature(arrow.id);
        return {
          commentHeight: (liveComment.properties as { height: number }).height,
          // The arrow's node-side endpoint is coordinates[1] here (see
          // "should create comment on node"); the comment-side one is [0].
          arrowBoxEnd: liveArrow.geometry.coordinates[0] as number[]
        };
      });

    const before = await readLiveEndpoint();

    // Grow the box across several lines - well past one auto-grow step.
    for (let i = 0; i < 4; i++) {
      await session.page.keyboard.type(`line ${i}`);
      await session.page.keyboard.press("Enter");
    }

    const after = await readLiveEndpoint();

    // The box actually grew - otherwise this test isn't exercising anything.
    expect(after.commentHeight).toBeGreaterThan(before.commentHeight + 20);

    // The connector's box-side endpoint must have moved along with the
    // growing edge, live - not stayed frozen at its pre-typing position.
    const moved = Math.hypot(
      after.arrowBoxEnd[0] - before.arrowBoxEnd[0],
      after.arrowBoxEnd[1] - before.arrowBoxEnd[1]
    );
    expect(moved).toBeGreaterThan(10);
  }, 10000);

  it("should send on Cmd/Ctrl+Enter, and keep plain Enter as a newline", async () => {
    const pos = await session.page.evaluate(() => {
      editor.enableCommentDrawing({ offsetX: 50, offsetY: -50, ...demoStyles.comment });
      return ogma.view.graphToScreenCoordinates({ x: 0, y: -50 });
    });
    await drawComment(session, pos);

    await session.page.keyboard.type("line1");
    await session.page.keyboard.press("Enter");
    await session.page.keyboard.type("line2");

    // Plain Enter must not have sent - still editing, both lines present.
    const midEdit = await session.page.evaluate(() => ({
      hasTextarea: !!document.querySelector("textarea"),
      value: document.querySelector("textarea")?.value
    }));
    expect(midEdit.hasTextarea).toBe(true);
    expect(midEdit.value).toBe("line1\nline2");

    // Cmd+Enter (Mac) / Ctrl+Enter (Windows/Linux) - the modifier that
    // actually reaches the page depends on the OS Playwright runs on, so
    // press both; whichever one is native is what a real user would send.
    await session.page.keyboard.down("Meta");
    await session.page.keyboard.press("Enter");
    await session.page.keyboard.up("Meta");
    await session.page.keyboard.down("Control");
    await session.page.keyboard.press("Enter");
    await session.page.keyboard.up("Control");

    const afterSend = await session.page.evaluate(() => {
      const comment = editor
        .getAnnotations()
        .features.find((f) => f.properties.type === "comment");
      return {
        hasTextarea: !!document.querySelector("textarea"),
        content: (comment?.properties as { content?: string })?.content
      };
    });
    expect(afterSend.hasTextarea).toBe(false);
    expect(afterSend.content).toBe("line1\nline2");
  }, 10000);

  // Regression test: while a comment is being edited, its connector line
  // must render *behind* the box, not on top of it. LAYERS.EDITOR is a
  // higher index than LAYERS.SHAPES, but that index alone doesn't control
  // DOM stacking order - the shapes SVG layer is created once, early, at
  // Control construction, while the editor overlay is created fresh per
  // edit session, much later; layers otherwise just append in creation
  // order, so without an explicit moveToTop() the long-lived shapes layer
  // ends up DOM-after (visually above) the freshly-created editor overlay.
  it("should render the connector behind the box while editing, not on top of it", async () => {
    const pos = await session.page.evaluate(() => {
      editor.enableCommentDrawing({ offsetX: 50, offsetY: -50, ...demoStyles.comment });
      return ogma.view.graphToScreenCoordinates({ x: 0, y: -50 });
    });
    await drawComment(session, pos);

    const stackOrder = await session.page.evaluate(() => {
      const editorDiv = document.querySelector(".ogma-annotation-text-editor");
      // The shapes layer is the one with the demo comment/arrow purple
      // (#3A03CF) baked into its rule defs - distinct from e.g. the send
      // button icon's own little inline svg, which lives inside the editor
      // overlay itself rather than being a stacking sibling of it.
      const shapesSvg = Array.from(
        document.querySelectorAll("#graph-container svg")
      ).find(
        (svg) =>
          !svg.closest(".ogma-annotation-text-editor") &&
          svg.innerHTML.includes("3A03CF")
      );
      if (!editorDiv || !shapesSvg) {
        return { editorFound: !!editorDiv, shapesSvgFound: !!shapesSvg };
      }
      const rel = editorDiv.compareDocumentPosition(shapesSvg);
      return {
        editorFound: true,
        shapesSvgFound: true,
        // DOCUMENT_POSITION_FOLLOWING (4): shapesSvg comes after editorDiv
        // in the DOM, i.e. paints on top of it - the bug this guards
        // against.
        shapesPaintsOverEditor: !!(rel & Node.DOCUMENT_POSITION_FOLLOWING)
      };
    });

    expect(stackOrder.editorFound).toBe(true);
    expect(stackOrder.shapesSvgFound).toBe(true);
    expect(stackOrder.shapesPaintsOverEditor).toBe(false);
  }, 10000);
});
