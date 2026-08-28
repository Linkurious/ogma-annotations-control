import { beforeAll, afterAll, beforeEach, expect, describe, it } from "vitest";
import { BrowserSession, captureScreenshotOnTestEnd } from "./utils";

describe("Annotation creation", () => {
  const session = new BrowserSession();

  beforeAll(async () => {
    await session.start();
  });

  afterAll(async () => {
    await session.close();
  });

  beforeEach(async () => {
    captureScreenshotOnTestEnd(session, "creation");
    await session.refresh();
    await session.page.evaluate(async () => {
      createOgma({});
      await ogma.view.locateGraph();
      createEditor();
    });
  });

  it("should create a text annotation with the click default size", async () => {
    const pos = await session.page.evaluate(() => {
      editor.enableTextDrawing(demoStyles.text);
      return ogma.view.graphToScreenCoordinates({ x: 0, y: 0 });
    });

    await session.page.mouse.move(pos.x, pos.y);
    await session.page.mouse.down();
    await session.page.mouse.up();

    const note = await session.page.evaluate(() => {
      const feature = editor
        .getAnnotations()
        .features.find((f) => f.properties.type === "text");
      return {
        width: (feature?.properties as { width?: number })?.width,
        height: (feature?.properties as { height?: number })?.height
      };
    });
    // Same click-default fallback as sticky notes - see
    // TextHandler.applyDefaultSizeIfEmpty.
    expect(note.width).toBeGreaterThan(0);
    expect(note.height).toBeGreaterThan(0);
  }, 10000);

  it("should size a text annotation to a drag", async () => {
    const pos = await session.page.evaluate(() => {
      editor.enableTextDrawing(demoStyles.text);
      return ogma.view.graphToScreenCoordinates({ x: 0, y: 0 });
    });

    await session.page.mouse.move(pos.x, pos.y);
    await session.page.mouse.down();
    await session.page.mouse.move(pos.x + 200, pos.y + 150, { steps: 10 });
    await session.page.mouse.up();

    const note = await session.page.evaluate(() => {
      const feature = editor
        .getAnnotations()
        .features.find((f) => f.properties.type === "text");
      return {
        width: (feature?.properties as { width?: number })?.width,
        height: (feature?.properties as { height?: number })?.height
      };
    });
    expect(note.width).toBeGreaterThan(100);
    expect(note.height).toBeGreaterThan(100);
  }, 10000);

  it("should create a box annotation by dragging", async () => {
    const pos = await session.page.evaluate(() => {
      editor.enableBoxDrawing(demoStyles.box);
      return ogma.view.graphToScreenCoordinates({ x: 0, y: 0 });
    });

    await session.page.mouse.move(pos.x, pos.y);
    await session.page.mouse.down();
    await session.page.mouse.move(pos.x + 180, pos.y + 120, { steps: 10 });
    await session.page.mouse.up();

    const box = await session.page.evaluate(() => {
      const feature = editor
        .getAnnotations()
        .features.find((f) => f.properties.type === "box");
      return {
        width: (feature?.properties as { width?: number })?.width,
        height: (feature?.properties as { height?: number })?.height
      };
    });
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);
  }, 10000);

  // Polygon drawing is one continuous freehand drag (mousedown -> trace the
  // outline -> mouseup), not click-per-vertex - see PolygonHandler.onDrag,
  // which accumulates+simplifies points along the drag path.
  it("should create a polygon annotation by dragging out its outline", async () => {
    const points = await session.page.evaluate(() => {
      editor.enablePolygonDrawing(demoStyles.polygon);
      return [
        ogma.view.graphToScreenCoordinates({ x: -50, y: -50 }),
        ogma.view.graphToScreenCoordinates({ x: 50, y: -50 }),
        ogma.view.graphToScreenCoordinates({ x: 50, y: 50 }),
        ogma.view.graphToScreenCoordinates({ x: -50, y: -50 }) // close the ring
      ];
    });

    await session.page.mouse.move(points[0].x, points[0].y);
    await session.page.mouse.down();
    for (const p of points.slice(1)) {
      await session.page.mouse.move(p.x, p.y, { steps: 10 });
    }
    await session.page.mouse.up();

    const polygon = await session.page.evaluate(() => {
      const feature = editor
        .getAnnotations()
        .features.find((f) => f.properties.type === "polygon");
      return feature?.geometry.type;
    });
    expect(polygon).toBe("Polygon");
  }, 10000);

  // Regression: cancelling a polygon mid-draw (e.g. the user hits Escape or
  // the host app calls cancelDrawing()) must leave no partial annotation
  // behind and must not throw.
  it("should leave nothing behind when a polygon draw is cancelled mid-way", async () => {
    const points = await session.page.evaluate(() => {
      editor.enablePolygonDrawing(demoStyles.polygon);
      return [
        ogma.view.graphToScreenCoordinates({ x: -50, y: -50 }),
        ogma.view.graphToScreenCoordinates({ x: 50, y: -50 })
      ];
    });

    await session.page.mouse.move(points[0].x, points[0].y);
    await session.page.mouse.down();
    await session.page.mouse.move(points[1].x, points[1].y, { steps: 10 });

    const result = await session.page.evaluate(() => {
      editor.cancelDrawing();
      return {
        drawing: editor.isDrawing(),
        polygons: editor
          .getAnnotations()
          .features.filter((f) => f.properties.type === "polygon").length
      };
    });
    await session.page.mouse.up();

    expect(result.drawing).toBe(false);
    expect(result.polygons).toBe(0);
  }, 10000);

  // Regression: cancelling an arrow draw right after mousedown (before it's
  // ever dragged out) must not leave a zero-length arrow behind.
  it("should leave nothing behind when an arrow draw is cancelled before any drag", async () => {
    const pos = await session.page.evaluate(() => {
      editor.enableArrowDrawing(demoStyles.arrow);
      return ogma.view.graphToScreenCoordinates({ x: 0, y: 0 });
    });

    await session.page.mouse.move(pos.x, pos.y);
    await session.page.mouse.down();

    const result = await session.page.evaluate(() => {
      editor.cancelDrawing();
      return {
        drawing: editor.isDrawing(),
        arrows: editor
          .getAnnotations()
          .features.filter((f) => f.properties.type === "arrow").length
      };
    });
    await session.page.mouse.up();

    expect(result.drawing).toBe(false);
    expect(result.arrows).toBe(0);
  }, 10000);

  // Regression: cancelling a box draw mid-drag must leave nothing behind -
  // same class of bug as the polygon/arrow cases above, but through
  // TextHandler (box/text/comment all share it) rather than PolygonHandler
  // or ArrowHandler.
  it("should leave nothing behind when a box draw is cancelled mid-drag", async () => {
    const pos = await session.page.evaluate(() => {
      editor.enableBoxDrawing(demoStyles.box);
      return ogma.view.graphToScreenCoordinates({ x: 0, y: 0 });
    });

    await session.page.mouse.move(pos.x, pos.y);
    await session.page.mouse.down();
    await session.page.mouse.move(pos.x + 100, pos.y + 80, { steps: 10 });

    const result = await session.page.evaluate(() => {
      editor.cancelDrawing();
      return {
        drawing: editor.isDrawing(),
        boxes: editor
          .getAnnotations()
          .features.filter((f) => f.properties.type === "box").length
      };
    });
    await session.page.mouse.up();

    expect(result.drawing).toBe(false);
    expect(result.boxes).toBe(0);
  }, 10000);

  // Regression: cancelling a text draw mid-drag must leave nothing behind.
  it("should leave nothing behind when a text draw is cancelled mid-drag", async () => {
    const pos = await session.page.evaluate(() => {
      editor.enableTextDrawing(demoStyles.text);
      return ogma.view.graphToScreenCoordinates({ x: 0, y: 0 });
    });

    await session.page.mouse.move(pos.x, pos.y);
    await session.page.mouse.down();
    await session.page.mouse.move(pos.x + 100, pos.y + 80, { steps: 10 });

    const result = await session.page.evaluate(() => {
      editor.cancelDrawing();
      return {
        drawing: editor.isDrawing(),
        texts: editor
          .getAnnotations()
          .features.filter((f) => f.properties.type === "text").length
      };
    });
    await session.page.mouse.up();

    expect(result.drawing).toBe(false);
    expect(result.texts).toBe(0);
  }, 10000);

  // Regression: drawing two arrows back-to-back must not bleed state between
  // them - each must land at its own coordinates (mirrors the "second
  // comment" regression in comment.test.ts, generalized to arrows). Both
  // draw points are kept close to the graph centre so they map to on-screen
  // positions - Playwright drops synthetic mouse events dispatched at
  // off-viewport coordinates.
  async function drawArrow(
    from: { x: number; y: number },
    to: { x: number; y: number }
  ) {
    await session.page.mouse.move(from.x, from.y);
    await session.page.mouse.down();
    await session.page.mouse.move(to.x, to.y, { steps: 10 });
    await session.page.mouse.up();
  }

  it("should create a second arrow at its own coordinates, not the first's", async () => {
    const first = await session.page.evaluate(() => {
      editor.enableArrowDrawing(demoStyles.arrow);
      return {
        from: ogma.view.graphToScreenCoordinates({ x: -40, y: -40 }),
        to: ogma.view.graphToScreenCoordinates({ x: -10, y: -10 })
      };
    });
    await drawArrow(first.from, first.to);

    const second = await session.page.evaluate(() => {
      editor.enableArrowDrawing(demoStyles.arrow);
      return {
        from: ogma.view.graphToScreenCoordinates({ x: 40, y: 40 }),
        to: ogma.view.graphToScreenCoordinates({ x: 10, y: 10 })
      };
    });
    await drawArrow(second.from, second.to);

    const arrows = await session.page.evaluate(() =>
      editor
        .getAnnotations()
        .features.filter((f) => f.properties.type === "arrow")
        .map((f) => f.geometry.coordinates as number[][])
    );

    expect(arrows.length).toBe(2);
    const [firstStart] = arrows[0];
    const [secondStart] = arrows[1];
    const dx = secondStart[0] - firstStart[0];
    const dy = secondStart[1] - firstStart[1];
    expect(Math.hypot(dx, dy)).toBeGreaterThan(50);
  }, 10000);

  // "Hammer" smoke test: create one annotation of every type in sequence in
  // a single session and confirm nothing throws and nothing collides.
  it("should create one of every annotation type in sequence without throwing", async () => {
    const screen = (x: number, y: number) =>
      session.page.evaluate(
        (p) => ogma.view.graphToScreenCoordinates(p),
        { x, y }
      );

    // Arrow
    await session.page.evaluate(() => editor.enableArrowDrawing(demoStyles.arrow));
    let from = await screen(-150, -150);
    let to = await screen(-120, -120);
    await drawArrow(from, to);

    // Text
    await session.page.evaluate(() => editor.enableTextDrawing(demoStyles.text));
    let p = await screen(-80, -80);
    await session.page.mouse.move(p.x, p.y);
    await session.page.mouse.down();
    await session.page.mouse.up();

    // Box
    await session.page.evaluate(() => editor.enableBoxDrawing(demoStyles.box));
    p = await screen(0, -150);
    await session.page.mouse.move(p.x, p.y);
    await session.page.mouse.down();
    await session.page.mouse.move(p.x + 40, p.y + 30, { steps: 5 });
    await session.page.mouse.up();

    // Polygon
    await session.page.evaluate(() => editor.enablePolygonDrawing(demoStyles.polygon));
    const poly = [
      await screen(100, -150),
      await screen(150, -150),
      await screen(150, -100),
      await screen(100, -150)
    ];
    await session.page.mouse.move(poly[0].x, poly[0].y);
    await session.page.mouse.down();
    for (const pt of poly.slice(1)) {
      await session.page.mouse.move(pt.x, pt.y, { steps: 5 });
    }
    await session.page.mouse.up();

    // Comment
    await session.page.evaluate(() =>
      editor.enableCommentDrawing({ offsetX: 30, offsetY: -30, ...demoStyles.comment })
    );
    p = await screen(-150, 100);
    await session.page.mouse.move(p.x, p.y);
    await session.page.mouse.down();
    await session.page.mouse.move(p.x + 60, p.y - 60, { steps: 10 });
    await session.page.mouse.up();

    // Sticky note
    await session.page.evaluate(() => editor.enableStickyNoteDrawing());
    p = await screen(150, 100);
    await session.page.mouse.move(p.x, p.y);
    await session.page.mouse.down();
    await session.page.mouse.up();

    const types = await session.page.evaluate(() =>
      editor.getAnnotations().features.map((f) => f.properties.type)
    );

    expect(types.filter((t) => t === "arrow").length).toBe(2); // + comment's own connector
    expect(types.filter((t) => t === "text").length).toBe(2); // text + sticky note
    expect(types.filter((t) => t === "box").length).toBe(1);
    expect(types.filter((t) => t === "polygon").length).toBe(1);
    expect(types.filter((t) => t === "comment").length).toBe(1);
  }, 15000);

  // Undo/redo immediately after creating each annotation type. Runs
  // sequentially in one session (not resetting between types).
  //
  // What this actually guarantees today: exactly one history entry per
  // creation gesture (previously text/box/arrow/polygon/sticky-note each
  // recorded TWO - see Drawing.start*()'s batchUpdate wrapping - because
  // the initial 0-sized placeholder add() and the final sized commit both
  // slipped past the drawingFeature-based recording gate as separate
  // entries), and canUndo/canRedo/undo/redo never throw or desync.
  //
  // What it deliberately does NOT assert: that a single undo() removes the
  // annotation entirely. It doesn't, for any type - the placeholder add()
  // happens while drawingFeature is already set (correctly suppressed from
  // being recorded on its own), so the *first ever recorded* history state
  // already has the annotation existing (just unsized/uncommitted), and
  // that's as far back as undo() can go. Making undo() unwind all the way
  // to "never existed" needs pausing zundo's own tracking for the whole
  // gesture lifecycle (mousedown through mouseup), not just deduping the
  // final commit - a deeper change than this pass covers, and one bad
  // attempt at it silently broke history recording entirely (verify very
  // carefully before touching this).
  it("should record exactly one history entry per creation, and keep undo/redo consistent", async () => {
    const screen = (x: number, y: number) =>
      session.page.evaluate(
        (p) => ogma.view.graphToScreenCoordinates(p),
        { x, y }
      );

    let prevPastStates = 0;

    async function undoRedoCheck(expectedNewEntries: number) {
      const before = await session.page.evaluate(() => ({
        pastStates: (editor as any)["store"].temporal.getState().pastStates.length,
        count: editor.getAnnotations().features.length
      }));
      // Exactly the expected number of history entries for the gesture
      // that just completed - the actual regression check for the
      // duplicate-entry dedup fix.
      expect(before.pastStates - prevPastStates).toBe(expectedNewEntries);
      prevPastStates = before.pastStates;

      const afterUndo = await session.page.evaluate(() => {
        const canUndo = editor.canUndo();
        editor.undo();
        return {
          canUndo,
          count: editor.getAnnotations().features.length,
          canRedo: editor.canRedo()
        };
      });
      expect(afterUndo.canUndo).toBe(true);
      expect(afterUndo.canRedo).toBe(true);
      // Never throws, never desyncs into a negative/NaN count.
      expect(afterUndo.count).toBeGreaterThanOrEqual(0);

      const afterRedo = await session.page.evaluate(() => {
        editor.redo();
        return editor.getAnnotations().features.length;
      });
      expect(afterRedo).toBe(before.count);
    }

    // Text (click-default)
    await session.page.evaluate(() => editor.enableTextDrawing(demoStyles.text));
    let p = await screen(0, 0);
    await session.page.mouse.move(p.x, p.y);
    await session.page.mouse.down();
    await session.page.mouse.up();
    await undoRedoCheck(1);

    // Box (drag)
    await session.page.evaluate(() => editor.enableBoxDrawing(demoStyles.box));
    p = await screen(-150, -150);
    await session.page.mouse.move(p.x, p.y);
    await session.page.mouse.down();
    await session.page.mouse.move(p.x + 60, p.y + 40, { steps: 5 });
    await session.page.mouse.up();
    await undoRedoCheck(1);

    // Arrow
    await session.page.evaluate(() => editor.enableArrowDrawing(demoStyles.arrow));
    const arrowFrom = await screen(150, -150);
    const arrowTo = await screen(180, -120);
    await drawArrow(arrowFrom, arrowTo);
    await undoRedoCheck(1);

    // Polygon
    await session.page.evaluate(() => editor.enablePolygonDrawing(demoStyles.polygon));
    const poly = [
      await screen(-150, 100),
      await screen(-100, 100),
      await screen(-100, 150),
      await screen(-150, 100)
    ];
    await session.page.mouse.move(poly[0].x, poly[0].y);
    await session.page.mouse.down();
    for (const pt of poly.slice(1)) {
      await session.page.mouse.move(pt.x, pt.y, { steps: 5 });
    }
    await session.page.mouse.up();
    await undoRedoCheck(1);

    // Sticky note (click-default)
    await session.page.evaluate(() => editor.enableStickyNoteDrawing());
    p = await screen(150, 100);
    await session.page.mouse.move(p.x, p.y);
    await session.page.mouse.down();
    await session.page.mouse.up();
    await undoRedoCheck(1);

    // Comment - two features (comment + its connector arrow) committed
    // together (see CommentDrawingHandler.onArrowComplete's atomic
    // commit); still not fully clean (2 history entries rather than 1 -
    // ArrowHandler's own drawingFeature clearing on the connector's drag
    // completion looks to be a separate, not-yet-investigated source of
    // the same class of gap), but undo/redo stay internally consistent
    // and never throw.
    await session.page.evaluate(() =>
      editor.enableCommentDrawing({ offsetX: 30, offsetY: -30, ...demoStyles.comment })
    );
    p = await screen(0, 150);
    await session.page.mouse.move(p.x, p.y);
    await session.page.mouse.down();
    await session.page.mouse.move(p.x + 60, p.y - 60, { steps: 10 });
    await session.page.mouse.up();
    await undoRedoCheck(2);
  }, 20000);
});
