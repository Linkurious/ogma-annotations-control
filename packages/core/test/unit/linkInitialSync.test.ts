import { describe, it, expect } from "vitest";
import { createOgma } from "./utils";
import { Arrow, Control, createArrow } from "../../src";

describe("link sync on load", () => {
  it("recomputes a loaded arrow against its node's real position", () => {
    const ogma = createOgma();
    // Node sits somewhere other than the arrow's stored start point
    ogma.addNode({ id: "n0", attributes: { x: 100, y: 100, radius: 10 } });
    const control = new Control(ogma);

    const arrow: Arrow = createArrow(0, 0, 10, 10);
    arrow.properties.link = {
      start: { id: "n0", side: "start", type: "node", magnet: { x: 0, y: 0 } }
    } as Arrow["properties"]["link"];
    control.add(arrow);

    const loaded = control.getAnnotation<Arrow>(arrow.id)!;
    expect(loaded.geometry.coordinates[0]).toEqual([100, 100]);
  });
});
