import { beforeAll, afterAll, beforeEach, expect, describe, it } from "vitest";
import { BrowserSession, captureScreenshotOnTestEnd } from "./utils";

describe("Sticky notes", () => {
  const session = new BrowserSession();

  beforeAll(async () => {
    await session.start();
  });

  afterAll(async () => {
    await session.close();
  });

  beforeEach(async () => {
    captureScreenshotOnTestEnd(session, "stickyNote");
    await session.refresh();
    await session.page.evaluate(async () => {
      const ogma = createOgma({});
      await ogma.view.locateGraph();
      createEditor();
    });
  });

  // Each test below places its note at its own on-screen spot (rather than
  // all four landing on the same centre point) purely so a headful run
  // (E2E_HEADFUL=1) is easy to tell apart test-to-test at a glance - the
  // two plain-click tests would otherwise look identical up to the point
  // they diverge, and likewise the two drag-out ones.

  it("should stay selected and editable after a plain click (no drag)", async () => {
    await session.page.evaluate(() => editor.enableStickyNoteDrawing());
    // Default click-size square (160x160) is centred on the click point -
    // stay well clear of the container edges. A plain screen-space point
    // (no graph-coordinate conversion needed, since we're not placing
    // relative to anything in the graph).
    const pos = { x: 110, y: 110 };

    // A plain click: no intermediate mouse.move steps, so this is a single
    // mousedown+mouseup with no drag - exactly the case that used to get
    // the note deselected (and its edit session torn down) by
    // InteractionController.onMouseUp treating it as "clicked empty space",
    // since its own hit-test ran at mousedown time, before the note existed.
    await session.page.mouse.move(pos.x, pos.y);
    await session.page.mouse.down();
    await session.page.mouse.up();

    const afterClick = await session.page.evaluate(() => {
      const note = editor
        .getAnnotations()
        .features.find((f) => f.properties.type === "text");
      return {
        selected: editor.getSelectedAnnotations().features.length,
        width: (note?.properties as { width?: number })?.width,
        height: (note?.properties as { height?: number })?.height
      };
    });
    expect(afterClick.selected).toBe(1);
    // Default square size for a plain click, not the 0x0 it's created at -
    // see TextHandler.applyDefaultSizeIfEmpty.
    expect(afterClick.width).toBe(160);
    expect(afterClick.height).toBe(160);

    await session.page.keyboard.type("Hello");

    // What the user actually sees while typing - the focused textarea's
    // own value, live, before any blur/commit into the store.
    const typedValue = await session.page.evaluate(
      () => document.querySelector("textarea")?.value
    );
    expect(typedValue).toBe("Hello");

    // Deselecting (e.g. clicking elsewhere) is what actually ends the edit
    // session and commits the live update into the annotation's real
    // content - a bare DOM blur() only syncs into liveUpdates.
    await session.page.evaluate(() => { editor.unselect(); });

    const content = await session.page.evaluate(() => {
      const note = editor
        .getAnnotations()
        .features.find((f) => f.properties.type === "text");
      return (note?.properties as { content?: string })?.content;
    });

    expect(content).toBe("Hello");
  }, 10000);

  it("should not pan the viewport while placing the note", async () => {
    await session.page.evaluate(() => editor.enableStickyNoteDrawing());
    const pos = { x: 400, y: 110 };

    const centerBefore = await session.page.evaluate(() =>
      ogma.view.getCenter()
    );

    await session.page.mouse.move(pos.x, pos.y);
    await session.page.mouse.down();
    // A brief, small drift while the button is still down - this is what a
    // real click looks like (the mouse rarely stays at the exact same
    // pixel), and it's exactly what would trigger Ogma's native
    // pan-on-drag if we hadn't disabled it while placing the note.
    await session.page.mouse.move(pos.x + 15, pos.y + 15, { steps: 5 });
    await session.page.mouse.up();

    const centerAfter = await session.page.evaluate(() =>
      ogma.view.getCenter()
    );

    expect(centerAfter.x).toBeCloseTo(centerBefore.x, 0);
    expect(centerAfter.y).toBeCloseTo(centerBefore.y, 0);
  }, 10000);

  it("should size to a drag instead of the click default", async () => {
    await session.page.evaluate(() => editor.enableStickyNoteDrawing());
    // Top-left anchor for a +300/+220 drag - stays inside the 512x512
    // container (500,300 endpoint) instead of spilling past its edge.
    const pos = { x: 100, y: 40 };

    await session.page.mouse.move(pos.x, pos.y);
    await session.page.mouse.down();
    // Drag out a corner well past the DRAG_THRESHOLD, and past the 160px
    // click default - same gesture as dragging a box out.
    await session.page.mouse.move(pos.x + 300, pos.y + 220, { steps: 10 });
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

    // Screen-to-graph coordinates scale with zoom, so just assert it grew
    // well past the click default rather than pinning exact pixels.
    expect(note.width).toBeGreaterThan(160);
    expect(note.height).toBeGreaterThan(160);
  }, 10000);

  it("should drop into editing after a drag too, not just a plain click", async () => {
    // Unlike box/text, sticky notes drop into editing after either
    // completion path - see startDrawing()'s autoEditAfterDrag.
    await session.page.evaluate(() => editor.enableStickyNoteDrawing());
    // Top-left anchor for a +200/+150 drag - stays inside the container
    // (endpoint 480,360) and clear of the other tests' spots above.
    const pos = { x: 280, y: 210 };

    await session.page.mouse.move(pos.x, pos.y);
    await session.page.mouse.down();
    await session.page.mouse.move(pos.x + 200, pos.y + 150, { steps: 10 });
    await session.page.mouse.up();

    await session.page.keyboard.type("Dragged");

    const typedValue = await session.page.evaluate(
      () => document.querySelector("textarea")?.value
    );
    expect(typedValue).toBe("Dragged");
  }, 10000);
});
