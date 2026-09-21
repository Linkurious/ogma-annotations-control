import { beforeAll, afterAll, beforeEach, expect, describe, it } from "vitest";
import {
  BrowserSession,
  captureScreenshotOnTestEnd,
  offsetGraphContainer
} from "./utils";

describe("Offset/non-fullscreen container", () => {
  const session = new BrowserSession();

  beforeAll(async () => {
    await session.start();
  });

  afterAll(async () => {
    await session.close();
  });

  beforeEach(async () => {
    captureScreenshotOnTestEnd(session, "offsetContainer");
    await session.refresh();
    await offsetGraphContainer(session);
    await session.page.evaluate(async () => {
      createOgma({});
      await ogma.view.locateGraph();
      createEditor();
    });
  });

  // Regression for handlers/text.ts startDrawing(): it converts the given
  // graph point to a container-relative screen point via
  // graphToScreenCoordinates, then used to hand that straight to
  // onDragStart as {clientX, clientY} - which normalizes its input as if it
  // were viewport-relative, double-subtracting the container's offset. That
  // corrupted dragStartPoint feeds directly into the drag-delta math
  // (TextHandler.onDrag: `mousePoint.x - this.dragStartPoint.x`), so a box
  // dragged out under an offset container would land at the wrong position
  // and/or size before the fix.
  it("should size and position a box annotation to a drag at the intended graph coordinates", async () => {
    const from = await session.page.evaluate(() => screenToPage({ x: -50, y: -50 }));
    const to = await session.page.evaluate(() => screenToPage({ x: 50, y: 30 }));
    await session.page.evaluate(() => editor.enableBoxDrawing(demoStyles.box));
    await session.page.mouse.move(from.x, from.y);
    await session.page.mouse.down();
    await session.page.mouse.move(to.x, to.y, { steps: 10 });
    await session.page.mouse.up();

    // Boxes/text don't carry a geometry.bbox - derive it from the center
    // coordinate (dragCorner's actual output) and properties.width/height,
    // same fields creation.test.ts's own box/text tests read.
    const box = await session.page.evaluate(() => {
      const feature = editor
        .getAnnotations()
        .features.find((f) => f.properties.type === "box");
      const [cx, cy] = feature!.geometry.coordinates as number[];
      const { width, height } = feature!.properties as {
        width: number;
        height: number;
      };
      return [cx - width / 2, cy - height / 2, cx + width / 2, cy + height / 2];
    });
    expect(box[0]).toBeCloseTo(-50, 0);
    expect(box[1]).toBeCloseTo(-50, 0);
    expect(box[2]).toBeCloseTo(50, 0);
    expect(box[3]).toBeCloseTo(30, 0);
  }, 10000);

  // Same TextHandler.startDrawing()/onDrag path as the box case above, for
  // the text annotation type specifically.
  it("should size and position a text annotation to a drag at the intended graph coordinates", async () => {
    const from = await session.page.evaluate(() => screenToPage({ x: -40, y: -60 }));
    const to = await session.page.evaluate(() => screenToPage({ x: 60, y: 10 }));
    await session.page.evaluate(() => editor.enableTextDrawing(demoStyles.text));
    await session.page.mouse.move(from.x, from.y);
    await session.page.mouse.down();
    await session.page.mouse.move(to.x, to.y, { steps: 10 });
    await session.page.mouse.up();

    const box = await session.page.evaluate(() => {
      const feature = editor
        .getAnnotations()
        .features.find((f) => f.properties.type === "text");
      const [cx, cy] = feature!.geometry.coordinates as number[];
      const { width, height } = feature!.properties as {
        width: number;
        height: number;
      };
      return [cx - width / 2, cy - height / 2, cx + width / 2, cy + height / 2];
    });
    expect(box[0]).toBeCloseTo(-40, 0);
    expect(box[1]).toBeCloseTo(-60, 0);
    expect(box[2]).toBeCloseTo(60, 0);
    expect(box[3]).toBeCloseTo(10, 0);
  }, 10000);

  // Regression for handlers/polygon.ts startDrawing(): its isDrawingMode
  // branch of onDragStart (not the shared base one) seeds the polygon's
  // actual first-vertex geometry directly from the same double-offset-prone
  // evt, so an offset container would plant the first vertex at the wrong
  // graph coordinates outright, not just glitch a transient drag point.
  // Read the *live* update (store.liveUpdates), not editor.getAnnotations()
  // (which only reflects committed state) - and read it right after
  // mousedown, before onDragEnd's simplifyPolygon() runs, since that step
  // drops the raw first point (points.slice(1, -1)) and would otherwise
  // mask this bug behind whatever point simplification happens to keep.
  it("should seed the first polygon vertex at the intended graph coordinates", async () => {
    const points = await session.page.evaluate(() => [
      screenToPage({ x: -50, y: -50 }),
      screenToPage({ x: 50, y: -50 }),
      screenToPage({ x: 50, y: 50 }),
      screenToPage({ x: -50, y: -50 }) // close the ring
    ]);
    await session.page.evaluate(() =>
      editor.enablePolygonDrawing(demoStyles.polygon)
    );
    await session.page.mouse.move(points[0].x, points[0].y);
    await session.page.mouse.down();

    const firstVertex = await session.page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const state = (editor as any)["store"].getState();
      const id = state.drawingFeature;
      return state.liveUpdates[id].geometry.coordinates[0][0] as number[];
    });
    expect(firstVertex[0]).toBeCloseTo(-50, 0);
    expect(firstVertex[1]).toBeCloseTo(-50, 0);

    for (const p of points.slice(1)) {
      await session.page.mouse.move(p.x, p.y, { steps: 10 });
    }
    await session.page.mouse.up();

    const polygonType = await session.page.evaluate(
      () =>
        editor
          .getAnnotations()
          .features.find((f) => f.properties.type === "polygon")?.geometry
          .type
    );
    expect(polygonType).toBe("Polygon");
  }, 10000);

  // Regression for api/drawing.ts enablePlacement(): its onMouseMove handler
  // called screenToGraphCoordinates directly on the raw (viewport-relative)
  // MouseEvent, skipping clientToContainerPosition entirely - so under an
  // offset container the annotation would visibly follow the cursor at the
  // wrong position the whole time it's being placed. Read the *live* update
  // (store.liveUpdates), not editor.getAnnotations() (committed state only)
  // - and read it *before* the commit click: the commit (onMouseDown) is
  // fed an Ogma-native event and was already correct, so checking only
  // after clicking would mask this bug.
  it("should track the true graph position while placing a pre-created annotation", async () => {
    const target = await session.page.evaluate(() => screenToPage({ x: 30, y: -20 }));
    const setup = await session.page.evaluate(() => {
      const text = createText(0, 0, 100, 50);
      editor.enablePlacement(text);
      return { id: text.id };
    });
    await session.page.mouse.move(target.x, target.y);

    const live = await session.page.evaluate((id) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const state = (editor as any)["store"].getState();
      return state.liveUpdates[id].geometry.coordinates as number[];
    }, setup.id);
    expect(live[0]).toBeCloseTo(30, 0);
    expect(live[1]).toBeCloseTo(-20, 0);

    await session.page.mouse.down();
    await session.page.mouse.up();
  }, 10000);

  // Coverage, not a known-bug regression: handlers/arrow.ts startDrawing()
  // has the same synthetic-event shape as text/polygon above, but its
  // corrupted dragStartPoint is (today) only ever used as a truthy gate for
  // ArrowHandler.onDrag, not in any position/delta math - so it doesn't
  // corrupt the final geometry the way text/polygon do. Still worth
  // covering so a future change that starts relying on dragStartPoint's
  // value for arrows is caught under an offset container too.
  it("should draw an arrow at the intended graph coordinates", async () => {
    const from = await session.page.evaluate(() => screenToPage({ x: -40, y: -40 }));
    const to = await session.page.evaluate(() => screenToPage({ x: 40, y: 40 }));
    await session.page.evaluate(() => editor.enableArrowDrawing(demoStyles.arrow));
    await session.page.mouse.move(from.x, from.y);
    await session.page.mouse.down();
    await session.page.mouse.move(to.x, to.y, { steps: 10 });
    await session.page.mouse.up();

    const coords = await session.page.evaluate(() => {
      const feature = editor
        .getAnnotations()
        .features.find((f) => f.properties.type === "arrow");
      return feature?.geometry.coordinates as number[][];
    });
    expect(coords[0][0]).toBeCloseTo(-40, 0);
    expect(coords[0][1]).toBeCloseTo(-40, 0);
    expect(coords[1][0]).toBeCloseTo(40, 0);
    expect(coords[1][1]).toBeCloseTo(40, 0);
  }, 10000);

  // Sanity net: the offset fixture itself must not break an already-correct
  // path. Dragging an existing box's body goes through the shared
  // clientToCanvas/clientToContainerPosition helper (TextHandler.onDrag's
  // BODY branch -> handleDrag), which was already correct before this fix.
  it("should still move an existing box by dragging its body", async () => {
    const setup = await session.page.evaluate(() => {
      const box = createBox(-50, -50, 100, 100, demoStyles.box);
      editor.add(box);
      editor.select(box.id);
      return { id: box.id };
    });

    // Clear of the click-suppression window select() sets (see
    // InteractionController.suppressClicksTemporarily).
    await session.page.waitForTimeout(150);

    const center = await session.page.evaluate(() => screenToPage({ x: 0, y: 0 }));
    const target = await session.page.evaluate(() => screenToPage({ x: 40, y: 25 }));
    await session.page.mouse.move(center.x, center.y);
    await session.page.mouse.down();
    await session.page.mouse.move(target.x, target.y, { steps: 10 });
    await session.page.mouse.up();

    const newCenter = await session.page.evaluate((id) => {
      const feature = editor.getAnnotations().features.find((f) => f.id === id);
      return feature?.geometry.coordinates as number[];
    }, setup.id);
    // Loose precision (nearest 10 graph units): a body drag absorbs a small
    // engage-threshold before it starts tracking 1:1 (same reason
    // stickyNote.test.ts's own resize test does a small "engage" move
    // before its real one) - this is a sanity net for the offset fixture,
    // not a pixel-exact regression check.
    expect(newCenter[0]).toBeCloseTo(40, -1);
    expect(newCenter[1]).toBeCloseTo(25, -1);
  }, 10000);
});
