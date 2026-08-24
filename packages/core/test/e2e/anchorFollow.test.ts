import { beforeAll, afterAll, beforeEach, expect, describe, it } from "vitest";
import { BrowserSession } from "./utils";

// Anchor-follow coverage: arrows/comments linked to graph nodes/edges must
// keep tracking their target through the real event pipeline
// (Ogma `setMultipleAttributes` -> LinkSync's debounce -> commit, and
// `layoutEnd` -> Control.onLayout -> Links.update()) - not just when that
// pipeline is invoked directly (as the unit tests in links.test.ts do to
// bypass the debounce timer). These drive it end to end: real pointer
// drags on graph nodes, a real Ogma layout run, and the public
// node/edge/zoom APIs.
describe("Anchor follow", () => {
  const session = new BrowserSession();

  beforeAll(async () => {
    await session.start();
  });

  afterAll(async () => {
    await session.close();
  });

  beforeEach(async () => {
    await session.refresh();
  });

  it("should keep a node-anchored arrow attached when the node is dragged with the mouse", async () => {
    const setup = await session.page.evaluate(async () => {
      createOgma({});
      await ogma.addNode({ id: "n1", attributes: { x: 0, y: 0, radius: 40 } });
      // A fixed, controlled view (rather than locateGraph()) so on-screen
      // coordinates stay predictable and inside the 512x512 test container -
      // Playwright drops synthetic mouse events dispatched off-viewport.
      await ogma.view.set({ x: 0, y: 0, zoom: 1 });
      createEditor();

      editor.enableArrowDrawing(demoStyles.arrow);
      const nodeCenter = ogma.view.graphToScreenCoordinates({ x: 0, y: 0 });
      // A point on the node's circle, off-centre, to grab it by later
      // without touching the arrow's own endpoint handle.
      const grabPoint = ogma.view.graphToScreenCoordinates({ x: 0, y: -25 });
      const from = ogma.view.graphToScreenCoordinates({ x: -150, y: -150 });
      return { nodeCenter, grabPoint, from };
    });

    // Draw the arrow's tip right onto the node's centre - within
    // radius/2, guaranteeing a centre-snap (see snapToNodes/getNodeSnapPoint).
    await session.page.mouse.move(setup.from.x, setup.from.y);
    await session.page.mouse.down();
    await session.page.mouse.move(setup.nodeCenter.x, setup.nodeCenter.y, {
      steps: 10
    });
    await session.page.mouse.up();

    const arrowId = await session.page.evaluate(() => {
      editor.unselect();
      const arrow = editor
        .getAnnotations()
        .features.find((f) => f.properties.type === "arrow") as any;
      return arrow?.id;
    });
    expect(arrowId).toBeTruthy();

    const before = await session.page.evaluate((id) => {
      const arrow = editor.getAnnotation(id) as any;
      return {
        link: arrow.properties.link,
        coords: arrow.geometry.coordinates as number[][]
      };
    }, arrowId);
    expect(before.link?.end?.type ?? before.link?.start?.type).toBe("node");

    // Clear of the click-suppression window a drag-end sets (see
    // InteractionController.suppressClicksTemporarily).
    await session.page.waitForTimeout(150);

    // Drag the node itself (not an annotation) - grabbed off-centre so this
    // is unambiguously a graph-node drag, not a handle drag.
    // Target accounts for the grabPoint's (0,-25) offset from the node's
    // centre, so the node's centre itself ends up at exactly (150, 75).
    const target = await session.page.evaluate(() =>
      ogma.view.graphToScreenCoordinates({ x: 150, y: 50 })
    );
    await session.page.mouse.move(setup.grabPoint.x, setup.grabPoint.y);
    await session.page.mouse.down();
    await session.page.mouse.move(
      setup.grabPoint.x + 5,
      setup.grabPoint.y - 5,
      { steps: 3 }
    );
    await session.page.mouse.move(target.x, target.y, { steps: 10 });
    await session.page.mouse.up();

    // Past LinkSync's node-position debounce (1ms) and its commit debounce.
    await session.page.waitForTimeout(300);

    const after = await session.page.evaluate((id) => {
      const node = ogma.getNode("n1")!.getPosition();
      const arrow = editor.getAnnotation(id) as any;
      return { node, coords: arrow.geometry.coordinates as number[][] };
    }, arrowId);

    expect(after.node.x).toBeCloseTo(150, 0);
    expect(after.node.y).toBeCloseTo(75, 0);

    // The endpoint that was at the node's old centre must now sit at the
    // node's new centre.
    const linkedIndex = before.coords.findIndex(
      ([x, y]) => Math.hypot(x, y) < 5
    );
    expect(linkedIndex).toBeGreaterThanOrEqual(0);
    const [ax, ay] = after.coords[linkedIndex];
    expect(ax).toBeCloseTo(after.node.x, 0);
    expect(ay).toBeCloseTo(after.node.y, 0);
  }, 15000);

  it("should keep an edge-anchored arrow attached when one of the edge's nodes is dragged", async () => {
    const setup = await session.page.evaluate(async () => {
      createOgma({});
      await ogma.addNodes([
        { id: "n1", attributes: { x: -120, y: 0, radius: 15 } },
        { id: "n2", attributes: { x: 120, y: 0, radius: 15 } }
      ]);
      await ogma.addEdge({ id: "e1", source: "n1", target: "n2" });
      // A fixed, controlled view (rather than locateGraph()) so on-screen
      // coordinates stay predictable and inside the 512x512 test container -
      // Playwright drops synthetic mouse events dispatched off-viewport.
      await ogma.view.set({ x: 0, y: 0, zoom: 1 });
      createEditor();

      editor.enableArrowDrawing(demoStyles.arrow);
      // Edge midpoint - well clear of either node's own hit radius.
      const mid = ogma.view.graphToScreenCoordinates({ x: 0, y: 0 });
      const from = ogma.view.graphToScreenCoordinates({ x: 0, y: -150 });
      const n1Center = ogma.view.graphToScreenCoordinates({ x: -120, y: 0 });
      return { mid, from, n1Center };
    });

    await session.page.mouse.move(setup.from.x, setup.from.y);
    await session.page.mouse.down();
    await session.page.mouse.move(setup.mid.x, setup.mid.y, { steps: 10 });
    await session.page.mouse.up();

    const arrowId = await session.page.evaluate(() => {
      editor.unselect();
      const arrow = editor
        .getAnnotations()
        .features.find((f) => f.properties.type === "arrow") as any;
      return arrow?.id;
    });
    const before = await session.page.evaluate((id) => {
      const arrow = editor.getAnnotation(id) as any;
      return arrow.properties.link;
    }, arrowId);
    expect(before?.end?.type ?? before?.start?.type).toBe("edge");

    await session.page.waitForTimeout(150);

    const target = await session.page.evaluate(() =>
      ogma.view.graphToScreenCoordinates({ x: -120, y: 150 })
    );
    await session.page.mouse.move(setup.n1Center.x, setup.n1Center.y);
    await session.page.mouse.down();
    await session.page.mouse.move(
      setup.n1Center.x + 5,
      setup.n1Center.y - 5,
      { steps: 3 }
    );
    await session.page.mouse.move(target.x, target.y, { steps: 10 });
    await session.page.mouse.up();

    await session.page.waitForTimeout(300);

    const after = await session.page.evaluate((id) => {
      const n1 = ogma.getNode("n1")!.getPosition();
      const n2 = ogma.getNode("n2")!.getPosition();
      const arrow = editor.getAnnotation(id) as any;
      return {
        expectedMid: { x: (n1.x + n2.x) / 2, y: (n1.y + n2.y) / 2 },
        coords: arrow.geometry.coordinates as number[][]
      };
    }, arrowId);

    // The edge-anchored endpoint tracks the recomputed midpoint.
    const closestIndex = after.coords
      .map(([x, y]) =>
        Math.hypot(x - after.expectedMid.x, y - after.expectedMid.y)
      )
      .reduce(
        (bestIdx, d, i, arr) => (d < arr[bestIdx] ? i : bestIdx),
        0
      );
    const [ex, ey] = after.coords[closestIndex];
    expect(ex).toBeCloseTo(after.expectedMid.x, 0);
    expect(ey).toBeCloseTo(after.expectedMid.y, 0);
  }, 15000);

  it("should recompute every linked arrow after a real Ogma layout run (layoutEnd)", async () => {
    // This exercises Control.onLayout -> Links.update(), the one path with
    // no coverage anywhere else (unit or e2e) - real layout algorithms
    // (grid/force/hierarchical/...) ship inside @linkurious/ogma itself, no
    // extra plugin needed.
    const result = await session.page.evaluate(async () => {
      createOgma({});
      const ids = ["a", "b", "c", "d", "e", "f"];
      // All at the same spot so grid() is guaranteed to move every one of
      // them to a distinct cell.
      await ogma.addNodes(
        ids.map((id) => ({ id, attributes: { x: 0, y: 0, radius: 10 } }))
      );
      createEditor();

      const arrowIds: Record<string, string> = {};
      for (const id of ids) {
        const arrow = createArrow(0, 0, 0, 0);
        editor.add(arrow);
        editor.link(arrow.id, ogma.getNode(id)!, "end");
        arrowIds[id] = arrow.id as string;
      }

      await ogma.layouts.grid({ duration: 0 });
      // Past LinkSync's commit debounce (COMMIT_DEBOUNCE_MS=1) - the
      // resolved layout promise only guarantees the node positions are set,
      // not that the linked-arrow commit triggered by them has landed yet.
      await new Promise((r) => setTimeout(r, 50));

      return ids.map((id) => {
        const node = ogma.getNode(id)!.getPosition();
        const arrow = editor.getAnnotation(arrowIds[id]) as any;
        const end = arrow.geometry.coordinates[1];
        return {
          id,
          dx: Math.abs(end[0] - node.x),
          dy: Math.abs(end[1] - node.y)
        };
      });
    });

    // Sanity: grid() actually spread the nodes out (not all still at 0,0).
    expect(new Set(result.map((r) => `${r.dx}-${r.dy}`)).size).toBeGreaterThan(0);
    for (const r of result) {
      expect(r.dx).toBeLessThan(1);
      expect(r.dy).toBeLessThan(1);
    }
  }, 15000);

  it("should not throw and should follow when many nodes move together in a single batched update", async () => {
    // Simulates a layout-like bulk reposition without a real layout
    // algorithm: one `setAttributes` call across a whole NodeList, which is
    // exactly the shape LinkSync.onSetMultipleAttributes has to cope with
    // (its NodeList branch) - e2e counterpart to the unit stress test at
    // links.test.ts's "does not exceed the call stack with many comments
    // and many drag frames".
    const result = await session.page.evaluate(async () => {
      createOgma({});
      const count = 20;
      const ids = Array.from({ length: count }, (_, i) => `n${i}`);
      await ogma.addNodes(
        ids.map((id, i) => ({
          id,
          attributes: { x: i * 20, y: 0, radius: 8 }
        }))
      );
      createEditor();

      const arrowIds: Record<string, string> = {};
      for (const id of ids) {
        const node = ogma.getNode(id)!;
        const pos = node.getPosition();
        const arrow = createArrow(pos.x, pos.y, pos.x, pos.y);
        editor.add(arrow);
        editor.link(arrow.id, node, "end");
        arrowIds[id] = arrow.id as string;
      }

      let threw = false;
      try {
        const xs = ids.map((id) => ogma.getNode(id)!.getAttribute("x") + 300);
        const ys = ids.map((id) => ogma.getNode(id)!.getAttribute("y") - 150);
        await ogma.getNodes(ids).setAttributes({ x: xs, y: ys });
      } catch (_e) {
        threw = true;
      }

      // Debounced sync + commit inside LinkSync.
      await new Promise((r) => setTimeout(r, 100));

      return {
        threw,
        deltas: ids.map((id) => {
          const node = ogma.getNode(id)!.getPosition();
          const arrow = editor.getAnnotation(arrowIds[id]) as any;
          const end = arrow.geometry.coordinates[1];
          return { dx: Math.abs(end[0] - node.x), dy: Math.abs(end[1] - node.y) };
        })
      };
    });

    expect(result.threw).toBe(false);
    for (const d of result.deltas) {
      expect(d.dx).toBeLessThan(1);
      expect(d.dy).toBeLessThan(1);
    }
  }, 15000);

  it("should not throw when a node with an anchored arrow is removed", async () => {
    const result = await session.page.evaluate(async () => {
      createOgma({});
      await ogma.addNode({ id: "n1", attributes: { x: 0, y: 0, radius: 20 } });
      createEditor();

      const arrow = createArrow(0, 0, 0, 0);
      editor.add(arrow);
      editor.link(arrow.id, ogma.getNode("n1")!, "end");

      let threw = false;
      let message = "";
      try {
        await ogma.removeNodes(["n1"]);
        // Must still be safe to read annotations afterwards.
        editor.getAnnotations();
      } catch (e) {
        threw = true;
        message = (e as Error).message;
      }

      const remaining = editor
        .getAnnotations()
        .features.find((f) => f.id === arrow.id) as any;

      return {
        threw,
        message,
        remainingLink: remaining?.properties?.link ?? null
      };
    });

    expect(result.threw).toBe(false);
    // The arrow itself survives (it isn't deleted, just detached) - see
    // LinkSync.onRemoveNodes - but its link must no longer point at the
    // now-gone node.
    expect(result.remainingLink?.end).toBeUndefined();
  }, 15000);

  it("should recompute a fixedSize-linked arrow endpoint when zoom changes", async () => {
    const result = await session.page.evaluate(async () => {
      createOgma({});
      await ogma.view.locateGraph();
      createEditor();

      // createText's (x,y) is the box's top-left corner, not its centre -
      // offset so the box ends up centred on the origin.
      const text = createText(-50, -30, 100, 60, "note", { fixedSize: true });
      editor.add(text);
      editor.unselect();

      // Draw an arrow whose tip lands on the text's top-right corner magnet
      // (see MAGNETS in handlers/snapping/text.ts) rather than its centre,
      // so a zoom change actually moves the recomputed point.
      const corner = { x: 50, y: -30 }; // box half-width/height from centre
      editor.enableArrowDrawing(demoStyles.arrow);
      await ogma.view.setZoom(1);
      const from = ogma.view.graphToScreenCoordinates({ x: -200, y: -200 });
      const to = ogma.view.graphToScreenCoordinates(corner);
      return { from, to };
    });

    await session.page.mouse.move(result.from.x, result.from.y);
    await session.page.mouse.down();
    await session.page.mouse.move(result.to.x, result.to.y, { steps: 10 });
    await session.page.mouse.up();

    const arrowId = await session.page.evaluate(() => {
      editor.unselect();
      const arrow = editor
        .getAnnotations()
        .features.find((f) => f.properties.type === "arrow") as any;
      return arrow?.id as string | undefined;
    });
    expect(arrowId).toBeTruthy();

    const before = await session.page.evaluate((id) => {
      const arrow = editor.getAnnotation(id) as any;
      const end = arrow.geometry.coordinates[1];
      return { dist: Math.hypot(end[0] - 0, end[1] - 0), link: arrow.properties.link };
    }, arrowId!);
    // Only meaningful if it actually snapped to the text (not left free).
    expect(before.link?.end?.type ?? before.link?.start?.type).toBe("text");

    await session.page.evaluate(() => ogma.view.setZoom(2));
    // REFRESH_THROTTLE_MS is 20ms.
    await session.page.waitForTimeout(100);

    const after = await session.page.evaluate((id) => {
      const arrow = editor.getAnnotation(id) as any;
      const end = arrow.geometry.coordinates[1];
      return Math.hypot(end[0] - 0, end[1] - 0);
    }, arrowId!);

    // fixedSize's graph-space extent shrinks as 1/zoom - doubling zoom
    // should roughly halve the distance from the text's centre to a
    // corner magnet.
    expect(after).toBeLessThan(before.dist * 0.75);
    expect(after).toBeGreaterThan(before.dist * 0.25);
  }, 15000);
});
