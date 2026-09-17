import { beforeAll, afterAll, beforeEach, expect, describe, it } from "vitest";
import { BrowserSession, captureScreenshotOnTestEnd } from "./utils";

describe("Multi-select drag", () => {
  const session = new BrowserSession();

  beforeAll(async () => {
    await session.start();
  });

  afterAll(async () => {
    await session.close();
  });

  beforeEach(async () => {
    captureScreenshotOnTestEnd(session, "multiSelectDrag");
    await session.refresh();
    await session.page.evaluate(async () => {
      createOgma({});
      await ogma.view.locateGraph();
      createEditor();
    });
  });

  // Boxes, not texts: a plain click on a text/comment immediately opens its
  // edit textarea (TextHandler.onClick), which would then sit on top of it
  // and swallow the very drag these tests are trying to exercise. Boxes
  // don't have that side effect, and still share a single TextHandler
  // instance per type the same way texts do - see AnnotationEditor's
  // constructor - so they exercise the same shared-handler switching.
  async function addTwoBoxes() {
    return session.page.evaluate(() => {
      const a = createBox(-200, -100, 100, 60);
      const b = createBox(100, 100, 100, 60);
      editor.add(a);
      editor.add(b);
      editor.unselect();
      return {
        aId: a.id,
        bId: b.id,
        aScreen: ogma.view.graphToScreenCoordinates({ x: -150, y: -70 }),
        bScreen: ogma.view.graphToScreenCoordinates({ x: 150, y: 130 })
      };
    });
  }

  async function coordsOf(id: string) {
    return session.page.evaluate(
      (id) =>
        (editor.getAnnotation(id)!.geometry.coordinates as number[]).slice(),
      id
    );
  }

  async function selectBothWithCmdClick(
    aScreen: { x: number; y: number },
    bScreen: { x: number; y: number }
  ) {
    await session.page.mouse.click(aScreen.x, aScreen.y);
    await session.page.keyboard.down("Meta");
    await session.page.keyboard.down("Control");
    await session.page.mouse.click(bScreen.x, bScreen.y);
    await session.page.keyboard.up("Control");
    await session.page.keyboard.up("Meta");
  }

  async function dragBy(
    from: { x: number; y: number },
    dx: number,
    dy: number
  ) {
    await session.page.mouse.move(from.x, from.y);
    await session.page.mouse.down();
    // A brief engaging move, then the rest - a real click rarely lands on
    // the exact same pixel it's released from (see stickyNote.test.ts's
    // panning test for the same convention).
    await session.page.mouse.move(from.x + Math.sign(dx || 1) * 5, from.y + Math.sign(dy || 1) * 5, {
      steps: 2
    });
    await session.page.mouse.move(from.x + dx, from.y + dy, { steps: 5 });
    await session.page.mouse.up();
  }

  it("Ctrl/Cmd+click adds a second annotation to the selection instead of replacing it", async () => {
    const { aId, bId, aScreen, bScreen } = await addTwoBoxes();

    await session.page.mouse.click(aScreen.x, aScreen.y);
    expect(
      await session.page.evaluate(() =>
        editor.getSelectedAnnotations().features.map((f) => f.id)
      )
    ).toEqual([aId]);

    await session.page.keyboard.down("Meta");
    await session.page.keyboard.down("Control");
    await session.page.mouse.click(bScreen.x, bScreen.y);
    await session.page.keyboard.up("Control");
    await session.page.keyboard.up("Meta");

    // Regression guard: onMouseDown toggles a not-yet-selected annotation on
    // to prep it for a possible drag, and onMouseUp's click-completion used
    // to unconditionally toggle again whenever ctrl/meta was held -
    // immediately toggling this same annotation back off, so Cmd+click could
    // never actually grow the selection past one item.
    const selected = await session.page.evaluate(() =>
      editor.getSelectedAnnotations().features.map((f) => f.id)
    );
    expect(new Set(selected)).toEqual(new Set([aId, bId]));
  }, 10000);

  it("Ctrl/Cmd+click toggles an already-selected member back off, leaving the rest selected", async () => {
    const { bId, aScreen, bScreen } = await addTwoBoxes();
    await selectBothWithCmdClick(aScreen, bScreen);

    await session.page.keyboard.down("Meta");
    await session.page.keyboard.down("Control");
    await session.page.mouse.click(aScreen.x, aScreen.y);
    await session.page.keyboard.up("Control");
    await session.page.keyboard.up("Meta");

    const selected = await session.page.evaluate(() =>
      editor.getSelectedAnnotations().features.map((f) => f.id)
    );
    expect(selected).toEqual([bId]);
  }, 10000);

  // Regression: onMouseDown adds a not-yet-selected ctrl/meta click to the
  // selection right away so a drag that follows without releasing still
  // moves it - if onMouseUp's ctrl/meta click-completion doesn't know that
  // already happened, it undoes the add on release, leaving the annotation
  // moved but not selected.
  it("Ctrl/Cmd+press-and-drag on an unselected annotation both moves and selects it", async () => {
    const { aId, aScreen } = await addTwoBoxes();
    const before = await coordsOf(aId);

    await session.page.keyboard.down("Meta");
    await session.page.keyboard.down("Control");
    await dragBy(aScreen, 40, -20);
    await session.page.keyboard.up("Control");
    await session.page.keyboard.up("Meta");

    const after = await coordsOf(aId);
    expect(after[0] - before[0]).toBeCloseTo(40, -1);
    expect(after[1] - before[1]).toBeCloseTo(-20, -1);

    const selected = await session.page.evaluate(() =>
      editor.getSelectedAnnotations().features.map((f) => f.id)
    );
    expect(selected).toEqual([aId]);
  }, 10000);

  it("dragging the most-recently-selected member of a multi-selection moves the whole group", async () => {
    const { aId, bId, aScreen, bScreen } = await addTwoBoxes();
    const before = { a: await coordsOf(aId), b: await coordsOf(bId) };

    await selectBothWithCmdClick(aScreen, bScreen);

    // The handler both boxes' type shares is tracking b (selected last), so
    // this is the "just works" baseline case.
    const dx = 80;
    const dy = -50;
    await dragBy(bScreen, dx, dy);

    const after = { a: await coordsOf(aId), b: await coordsOf(bId) };

    expect(after.b[0] - before.b[0]).toBeCloseTo(dx, -1);
    expect(after.b[1] - before.b[1]).toBeCloseTo(dy, -1);
    // The other selected annotation - not the one actually grabbed - moved
    // along with it, by the same displacement.
    expect(after.a[0] - before.a[0]).toBeCloseTo(dx, -1);
    expect(after.a[1] - before.a[1]).toBeCloseTo(dy, -1);
  }, 10000);

  it("dragging the earlier-selected member of a same-type multi-selection also moves the whole group", async () => {
    const { aId, bId, aScreen, bScreen } = await addTwoBoxes();
    const before = { a: await coordsOf(aId), b: await coordsOf(bId) };

    await selectBothWithCmdClick(aScreen, bScreen);

    // Both boxes share one Handler instance, and selecting b last left it
    // tracking b, not a. Dragging from a specifically exercises the
    // mousedown-annotation switch (AnnotationEditor/InteractionController):
    // without it, this gesture wouldn't even register as a drag at all.
    const dx = -70;
    const dy = 40;
    await dragBy(aScreen, dx, dy);

    const after = { a: await coordsOf(aId), b: await coordsOf(bId) };

    expect(after.a[0] - before.a[0]).toBeCloseTo(dx, -1);
    expect(after.a[1] - before.a[1]).toBeCloseTo(dy, -1);
    expect(after.b[0] - before.b[0]).toBeCloseTo(dx, -1);
    expect(after.b[1] - before.b[1]).toBeCloseTo(dy, -1);
  }, 10000);

  it("removing a multi-selection deletes every selected annotation", async () => {
    const { aId, bId, aScreen, bScreen } = await addTwoBoxes();
    await selectBothWithCmdClick(aScreen, bScreen);

    await session.page.evaluate(() => {
      editor.remove(editor.getSelectedAnnotations());
    });

    const remaining = await session.page.evaluate(() =>
      editor.getAnnotations().features.map((f) => f.id)
    );
    expect(remaining).not.toContain(aId);
    expect(remaining).not.toContain(bId);
  }, 10000);
});
