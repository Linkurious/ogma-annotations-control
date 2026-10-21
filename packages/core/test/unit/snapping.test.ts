import { describe, it, expect } from "vitest";
import type { EdgeList, Point } from "@linkurious/ogma";
import { snapToEdges } from "../../src/handlers/snapping/edge";

type FakeEdge = {
  id: string;
  source: Point;
  target: Point;
  width?: number;
  curvature?: number;
};

// Mimics the parts of EdgeList used by snapToEdges. getExtremities() follows
// Ogma 5.3.12: [source of every edge..., target of every edge...].
function makeEdges(edges: FakeEdge[]): EdgeList {
  const list = (pick: (e: FakeEdge) => Point) => ({
    getPosition: () => edges.map(pick)
  });
  return {
    getExtremities: () => ({
      getPosition: () => [
        ...edges.map((e) => e.source),
        ...edges.map((e) => e.target)
      ]
    }),
    size: edges.length,
    get: (i: number) => ({
      getId: () => edges[i].id,
      getAttribute: (key: string) =>
        key === "width" ? (edges[i].width ?? 1) : undefined
    }),
    getAttribute: (key: string) =>
      key === "curvature" ? edges.map((e) => e.curvature ?? 0) : undefined,
    getSource: () => list((e) => e.source),
    getTarget: () => list((e) => e.target)
  } as unknown as EdgeList;
}

describe("snapToEdges", () => {
  // Two parallel horizontal edges. Source and target order matters: with the
  // wrong [source..., target...] indexing, edge 0 is read as x=0 vertical and
  // the pointer on it is missed.
  const edges = makeEdges([
    { id: "e0", source: { x: 0, y: 0 }, target: { x: 100, y: 0 } },
    { id: "e1", source: { x: 0, y: 50 }, target: { x: 100, y: 50 } }
  ]);

  it("snaps to the first of several edges", () => {
    const snap = snapToEdges({ x: 50, y: 0 }, edges, 5);
    expect(snap?.id).toBe("e0");
    expect(snap?.point).toEqual({ x: 50, y: 0 });
  });

  it("snaps to the second of several edges", () => {
    const snap = snapToEdges({ x: 50, y: 50 }, edges, 5);
    expect(snap?.id).toBe("e1");
    expect(snap?.point).toEqual({ x: 50, y: 50 });
  });

  it("returns null when no edge is within reach", () => {
    expect(snapToEdges({ x: 50, y: 25 }, edges, 5)).toBeNull();
  });

  it("with bodyOnly, ignores edges the pointer is near but outside", () => {
    expect(snapToEdges({ x: 50, y: 3 }, edges, 5, true)).toBeNull();
    expect(snapToEdges({ x: 50, y: 3 }, edges, 5)?.id).toBe("e0");
  });
});
