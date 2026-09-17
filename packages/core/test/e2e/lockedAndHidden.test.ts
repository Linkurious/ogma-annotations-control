import { beforeAll, afterAll, beforeEach, expect, describe, it } from "vitest";
import { BrowserSession, captureScreenshotOnTestEnd } from "./utils";

describe("Locked and hidden annotations", () => {
  const session = new BrowserSession();

  beforeAll(async () => {
    await session.start();
  });

  afterAll(async () => {
    await session.close();
  });

  beforeEach(async () => {
    captureScreenshotOnTestEnd(session, "lockedAndHidden");
    await session.refresh();
  });

  it("a locked annotation ignores a real drag and removal, but stays selectable", async () => {
    const { id, screen } = await session.page.evaluate(async () => {
      createOgma({});
      await ogma.view.locateGraph();
      const box = createBox(-100, -100, 100, 60);
      const editor = new Control(ogma, {
        isEditable: (a) => a.id !== box.id
      });
      window.editor = editor;
      editor.add(box);
      return {
        id: box.id,
        screen: ogma.view.graphToScreenCoordinates({ x: -50, y: -70 })
      };
    });

    const before = await session.page.evaluate(
      (id) => editor.getAnnotation(id)!.geometry.coordinates,
      id
    );

    // A real drag gesture directly on the locked box.
    await session.page.mouse.move(screen.x, screen.y);
    await session.page.mouse.down();
    await session.page.mouse.move(screen.x + 5, screen.y + 5, { steps: 2 });
    await session.page.mouse.move(screen.x + 60, screen.y - 40, { steps: 5 });
    await session.page.mouse.up();

    const after = await session.page.evaluate(
      (id) => editor.getAnnotation(id)!.geometry.coordinates,
      id
    );
    expect(after).toEqual(before);

    // Selection still works - a plain click.
    await session.page.mouse.click(screen.x, screen.y);
    expect(
      await session.page.evaluate(() =>
        editor.getSelectedAnnotations().features.map((f) => f.id)
      )
    ).toEqual([id]);

    // Deleting the (locked, but selected) annotation - the same call
    // AnnotationToolbar's trash button makes - is refused too.
    await session.page.evaluate(() => {
      const selected = editor.getSelectedAnnotations();
      editor.remove(selected);
    });
    expect(
      await session.page.evaluate(
        (id) => !!editor.getAnnotation(id),
        id
      )
    ).toBe(true);
  }, 10000);

  it("a hidden annotation is undrawn and unclickable, but stays in the data API and out of an SVG export", async () => {
    const { hiddenId, otherId, hiddenScreen } = await session.page.evaluate(async () => {
      createOgma({});
      await ogma.view.locateGraph();
      const hidden = createBox(-100, -100, 100, 60);
      const other = createBox(200, 200, 100, 60);
      const editor = new Control(ogma, {
        isVisible: (a) => a.id !== hidden.id
      });
      window.editor = editor;
      editor.add(hidden);
      editor.add(other);
      return {
        hiddenId: hidden.id,
        otherId: other.id,
        hiddenScreen: ogma.view.graphToScreenCoordinates({ x: -50, y: -70 })
      };
    });

    // No DOM node for the hidden one.
    const hasNode = await session.page.evaluate(
      (id) => !!document.querySelector(`[data-annotation="${id}"]`),
      hiddenId
    );
    expect(hasNode).toBe(false);

    // A click exactly on its geometry selects nothing.
    await session.page.mouse.click(hiddenScreen.x, hiddenScreen.y);
    expect(
      await session.page.evaluate(() =>
        editor.getSelectedAnnotations().features.map((f) => f.id)
      )
    ).toEqual([]);

    // Still fully present in the data API.
    const stillThere = await session.page.evaluate(
      (id) => !!editor.getAnnotation(id),
      hiddenId
    );
    expect(stillThere).toBe(true);

    // Absent from an SVG export; the other (visible) annotation is present.
    const svg = await session.page.evaluate(() =>
      ogma.export.svg({ clip: true, download: false })
    );
    expect(svg).not.toContain(hiddenId);
    expect(svg).toContain(otherId);
  }, 10000);
});
