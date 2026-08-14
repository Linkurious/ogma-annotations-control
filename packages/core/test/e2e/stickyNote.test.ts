import { beforeAll, afterAll, beforeEach, expect, describe, it } from "vitest";
import { BrowserSession } from "./utils";

describe("Sticky notes", () => {
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
      await ogma.view.locateGraph();
      createEditor();
    });
  });

  it("should stay selected and editable after a plain click (no drag)", async () => {
    const pos = await session.page.evaluate(() => {
      editor.enableStickyNoteDrawing();
      return ogma.view.graphToScreenCoordinates({ x: 0, y: 0 });
    });

    // A plain click: no intermediate mouse.move steps, so this is a single
    // mousedown+mouseup with no drag - exactly the case that used to get
    // the note deselected (and its edit session torn down) by
    // InteractionController.onMouseUp treating it as "clicked empty space",
    // since its own hit-test ran at mousedown time, before the note existed.
    await session.page.mouse.move(pos.x, pos.y);
    await session.page.mouse.down();
    await session.page.mouse.up();

    const selectedAfterClick = await session.page.evaluate(
      () => editor.getSelectedAnnotations().features.length
    );
    expect(selectedAfterClick).toBe(1);

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
    await session.page.evaluate(() => editor.unselect());

    const content = await session.page.evaluate(() => {
      const note = editor
        .getAnnotations()
        .features.find((f) => f.properties.type === "text");
      return (note?.properties as { content?: string })?.content;
    });

    expect(content).toBe("Hello");
  }, 10000);

  it("should not pan the viewport while placing the note", async () => {
    const pos = await session.page.evaluate(() => {
      editor.enableStickyNoteDrawing();
      return ogma.view.graphToScreenCoordinates({ x: 0, y: 0 });
    });

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
});
