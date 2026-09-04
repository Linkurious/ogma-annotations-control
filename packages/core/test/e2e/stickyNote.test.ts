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

  it("keeps resize handles visible on top of the note while it's being edited", async () => {
    // Regression test: a plain click both selects a sticky note and drops
    // it straight into edit mode (see the first test above), opening the
    // TextArea overlay. Ogma stacks layers in DOM/creation order by
    // default, and the overlay - created fresh per edit session - always
    // moves itself to the very top of that stack when it opens (see
    // handlers/textArea.ts's own moveToTop() call), which used to also
    // bury the long-lived Handles canvas layer (created once, early, at
    // Control construction) underneath it - handles were still
    // functionally draggable (detectHandle() is driven by pointer-position
    // math, not DOM hit-testing), just invisible, painted behind the note.
    //
    // The fix (renderer/handles.ts) sets a permanent, high CSS z-index on
    // the Handles canvas element instead of reordering layers - Ogma's own
    // moveTo()/moveToTop() rebuilds the entire layer container on every
    // call, which both blurs whatever's focused (the note's textarea) and,
    // per e2e testing, perturbed the undo/redo history - so this asserts
    // the actual mechanism (z-index), not DOM order, which is deliberately
    // left untouched by the fix.
    await session.page.evaluate(() => editor.enableStickyNoteDrawing());
    const pos = { x: 200, y: 200 };

    await session.page.mouse.move(pos.x, pos.y);
    await session.page.mouse.down();
    await session.page.mouse.up();

    // Clear of the click-suppression window a drag-end sets (see
    // InteractionController.suppressClicksTemporarily).
    await session.page.waitForTimeout(150);

    const zIndex = await session.page.evaluate(() => {
      const editorEl = document.querySelector(
        ".ogma-annotation-text-editor"
      ) as HTMLElement | null;
      const handlesEl = document.querySelector(
        ".ogma-canvas-layer"
      ) as HTMLElement | null;
      const z = (el: HTMLElement | null) =>
        el ? parseFloat(getComputedStyle(el).zIndex) || 0 : NaN;
      return { editor: z(editorEl), handles: z(handlesEl) };
    });

    // Both must actually have been found - the note is still in edit mode
    // at this point, and Handles is a long-lived layer.
    expect(Number.isNaN(zIndex.editor)).toBe(false);
    expect(Number.isNaN(zIndex.handles)).toBe(false);
    // Higher z-index = painted on top - handles must sit above the note's
    // edit overlay, not below it.
    expect(zIndex.handles).toBeGreaterThan(zIndex.editor);
  }, 10000);

  it("scales font size with the box on resize, and compounds across resizes", async () => {
    // Placed directly via createText/editor.add (mirrors createText usage in
    // anchorFollow.test.ts) rather than the interactive placement gesture -
    // a plain click/drag placement also opens an edit-mode textarea overlay
    // (autoEditAfterDrag), which would intercept the corner-handle mousedown
    // below before it ever reaches TextHandler's resize-detection.
    const setup = await session.page.evaluate(async () => {
      createOgma({});
      await ogma.view.locateGraph();
      createEditor();
      await ogma.view.setZoom(1);

      // Top-left corner at (-80,-80) -> a 160x160 box centred on the
      // origin, matching the sticky note default size/fontSize
      // (defaultStickyNoteStyle) with scaleFontOnResize opted in directly.
      const text = createText(-80, -80, 160, 160, "Hello there, sticky note", {
        fontSize: 18,
        scaleFontOnResize: true
      });
      editor.add(text);
      editor.select(text.id);

      return {
        id: text.id,
        center: ogma.view.graphToScreenCoordinates({ x: 0, y: 0 }),
        corner: ogma.view.graphToScreenCoordinates({ x: 80, y: 80 })
      };
    });

    // Clear of the click-suppression window a drag-end sets (see
    // InteractionController.suppressClicksTemporarily) - same guard used in
    // comment.test.ts's own handle/body-drag tests.
    await session.page.waitForTimeout(150);

    const dx = setup.corner.x - setup.center.x;
    const dy = setup.corner.y - setup.center.y;

    await session.page.mouse.move(setup.corner.x, setup.corner.y);
    await session.page.mouse.down();
    // Small engage move first (mirrors Handler.handleMouseMove recognizing
    // a drag starting), then out to roughly double the box size - twice as
    // far from centre as the starting corner.
    await session.page.mouse.move(
      setup.corner.x + dx * 0.1,
      setup.corner.y + dy * 0.1,
      { steps: 3 }
    );
    await session.page.mouse.move(
      setup.center.x + dx * 2,
      setup.center.y + dy * 2,
      { steps: 10 }
    );
    await session.page.mouse.up();

    const afterFirstResize = await session.page.evaluate((id) => {
      const note = editor
        .getAnnotations()
        .features.find((f) => f.id === id) as any;
      const textEl = document.querySelector(".annotation-text text");
      return {
        width: note?.properties?.width,
        height: note?.properties?.height,
        fontScale: note?.properties?.style?.fontScale,
        svgFontSize: textEl
          ? parseFloat(textEl.getAttribute("font-size") || "0")
          : undefined
      };
    }, setup.id);

    // Grew well past the original 160x160, and the font grew with it
    // (instead of the text staying pinned at 18px and rewrapping/truncating).
    expect(afterFirstResize.width).toBeGreaterThan(160);
    expect(afterFirstResize.height).toBeGreaterThan(160);
    expect(afterFirstResize.fontScale).toBeGreaterThan(1);
    expect(afterFirstResize.svgFontSize).toBeCloseTo(
      18 * afterFirstResize.fontScale!,
      0
    );

    // Resize again from the note's new corner - the factor should compound
    // across drags, not reset to 1 each time.
    const setup2 = await session.page.evaluate((id) => {
      const note = editor
        .getAnnotations()
        .features.find((f) => f.id === id) as any;
      const [cx, cy] = note.geometry.coordinates;
      const { width, height } = note.properties;
      return {
        center: ogma.view.graphToScreenCoordinates({ x: cx, y: cy }),
        corner: ogma.view.graphToScreenCoordinates({
          x: cx + width / 2,
          y: cy + height / 2
        })
      };
    }, setup.id);

    await session.page.waitForTimeout(150);

    const dx2 = setup2.corner.x - setup2.center.x;
    const dy2 = setup2.corner.y - setup2.center.y;

    await session.page.mouse.move(setup2.corner.x, setup2.corner.y);
    await session.page.mouse.down();
    await session.page.mouse.move(
      setup2.corner.x + dx2 * 0.1,
      setup2.corner.y + dy2 * 0.1,
      { steps: 3 }
    );
    await session.page.mouse.move(
      setup2.center.x + dx2 * 1.5,
      setup2.center.y + dy2 * 1.5,
      { steps: 10 }
    );
    await session.page.mouse.up();

    const secondFontScale = await session.page.evaluate((id) => {
      const note = editor
        .getAnnotations()
        .features.find((f) => f.id === id) as any;
      return note?.properties?.style?.fontScale;
    }, setup.id);

    expect(secondFontScale).toBeGreaterThan(afterFirstResize.fontScale!);
  }, 15000);
});
