import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createOgma } from "./utils";
import { Control, Polygon, createPolygon } from "../../src";
import { isPointInsidePolygon } from "../../src/handlers/snapping/polygon";

describe("Regions", () => {
  let ogma: ReturnType<typeof createOgma>;
  let control: Control;

  beforeEach(() => {
    ogma = createOgma();
    control = new Control(ogma);
  });

  afterEach(() => {
    try { control.destroy(); } catch (_) { /* headless */ }
    try { ogma.destroy(); } catch (_) { /* headless */ }
  });

  function addTriangle() {
    ogma.addNode({ id: "n1", attributes: { x: 0, y: 0, radius: 5 } });
    ogma.addNode({ id: "n2", attributes: { x: 100, y: 0, radius: 5 } });
    ogma.addNode({ id: "n3", attributes: { x: 50, y: 100, radius: 5 } });
  }

  it("creates a region polygon that contains its seed nodes", () => {
    addTriangle();

    const region = control.createRegion(["n1", "n2", "n3"]);
    const ring = region.geometry.coordinates[0];

    expect(isPointInsidePolygon({ x: 0, y: 0 }, ring)).toBe(true);
    expect(isPointInsidePolygon({ x: 100, y: 0 }, ring)).toBe(true);
    expect(isPointInsidePolygon({ x: 50, y: 100 }, ring)).toBe(true);
    expect(region.properties.region?.nodeIds.sort()).toEqual(["n1", "n2", "n3"]);
  });

  it("reshapes to keep containing a dragged member node (sticky, without excluding the others)", () => {
    addTriangle();
    const region = control.createRegion(["n1", "n2", "n3"]);

    ogma.getNode("n2")!.setAttributes({ x: 400, y: 400 });
    // @ts-expect-error regions is private
    control.regions._handleNodesMoved(ogma.getNodes(["n2"]));
    // @ts-expect-error regions is private
    control.regions._commit();
    // @ts-expect-error nodePositionTimeout is private
    clearTimeout(control.regions.nodePositionTimeout);

    const updated = control.getAnnotation<Polygon>(region.id)!;
    const ring = updated.geometry.coordinates[0];

    // The moved member is still enclosed...
    expect(isPointInsidePolygon({ x: 400, y: 400 }, ring)).toBe(true);
    // ...and the untouched members are too.
    expect(isPointInsidePolygon({ x: 0, y: 0 }, ring)).toBe(true);
    expect(isPointInsidePolygon({ x: 50, y: 100 }, ring)).toBe(true);
  });

  it("joins a node dragged into an already-tracked region's boundary", () => {
    addTriangle();
    const region = control.createRegion(["n1", "n2", "n3"]);

    ogma.addNode({ id: "outsider", attributes: { x: 500, y: 500, radius: 5 } });
    ogma.getNode("outsider")!.setAttributes({ x: 50, y: 40 });

    // @ts-expect-error regions is private
    control.regions._handleNodesMoved(ogma.getNodes(["outsider"]));
    // @ts-expect-error regions is private
    control.regions._commit();
    // @ts-expect-error nodePositionTimeout is private
    clearTimeout(control.regions.nodePositionTimeout);

    const updated = control.getAnnotation<Polygon>(region.id)!;
    expect(updated.properties.region?.nodeIds).toContain("outsider");

    // It's now sticky too: dragging it back out should still be contained.
    ogma.getNode("outsider")!.setAttributes({ x: -500, y: -500 });
    // @ts-expect-error regions is private
    control.regions._handleNodesMoved(ogma.getNodes(["outsider"]));
    // @ts-expect-error regions is private
    control.regions._commit();

    const afterLeave = control.getAnnotation<Polygon>(region.id)!;
    expect(
      isPointInsidePolygon({ x: -500, y: -500 }, afterLeave.geometry.coordinates[0])
    ).toBe(true);
  });

  it("trackRegionNodes turns an existing polygon into a region by geometric membership", () => {
    addTriangle();
    // A freehand polygon drawn loosely around n1 and n2, but not n3.
    const freehand = createPolygon([
      [[-30, -30], [130, -30], [130, 30], [-30, 30], [-30, -30]]
    ]);
    control.add(freehand);

    control.trackRegionNodes(freehand.id);

    const tracked = control.getAnnotation<Polygon>(freehand.id)!;
    expect(tracked.properties.region?.nodeIds.sort()).toEqual(["n1", "n2"]);

    // Now dragging n1 should reshape it, proving tracking is actually live.
    ogma.getNode("n1")!.setAttributes({ x: -400, y: -400 });
    // @ts-expect-error regions is private
    control.regions._handleNodesMoved(ogma.getNodes(["n1"]));
    // @ts-expect-error regions is private
    control.regions._commit();

    const reshaped = control.getAnnotation<Polygon>(freehand.id)!;
    expect(
      isPointInsidePolygon({ x: -400, y: -400 }, reshaped.geometry.coordinates[0])
    ).toBe(true);
  });

  it("untrackRegion stops further reshaping", () => {
    addTriangle();
    const region = control.createRegion(["n1", "n2", "n3"]);
    control.untrackRegion(region.id);

    const before = control.getAnnotation<Polygon>(region.id)!;
    expect(before.properties.region).toBeUndefined();

    ogma.getNode("n2")!.setAttributes({ x: 900, y: 900 });
    // @ts-expect-error regions is private
    control.regions._handleNodesMoved(ogma.getNodes(["n2"]));
    // @ts-expect-error regions is private
    control.regions._commit();

    const after = control.getAnnotation<Polygon>(region.id)!;
    expect(after.geometry.coordinates).toEqual(before.geometry.coordinates);
  });

  it("does not throw across many nodes and many rapid moves", () => {
    const nodeIds: string[] = [];
    for (let i = 0; i < 20; i++) {
      const id = `n${i}`;
      ogma.addNode({
        id,
        attributes: { x: Math.cos(i) * 100, y: Math.sin(i) * 100, radius: 5 }
      });
      nodeIds.push(id);
    }
    control.createRegion(nodeIds);

    expect(() => {
      for (let frame = 0; frame < 50; frame++) {
        nodeIds.forEach((id, i) => {
          ogma.getNode(id)!.setAttributes({
            x: Math.cos(i + frame * 0.1) * 100,
            y: Math.sin(i + frame * 0.1) * 100
          });
        });
        // @ts-expect-error regions is private
        control.regions._handleNodesMoved(ogma.getNodes(nodeIds));
      }
      // @ts-expect-error regions is private
      control.regions._commit();
    }).not.toThrow();
  });
});
