import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { createOgma } from "./utils";
import {
  AnnotationCollection,
  Arrow,
  Control,
  createArrow,
  createText
} from "../../src";
import { Links } from "../../src/handlers/links";
import { Store } from "../../src/store";
import { Snapping } from "../../src/handlers/snapping";
import LoadLinksMissing from "../fixtures/load-links-missing.json";
import LoadLinksData from "../fixtures/load-links.json";

describe("Links", () => {
  let mockStore: Store;
  let mockSnapping: Snapping;

  beforeEach(() => {
    mockStore = {
      subscribe: vi.fn(() => vi.fn()),
      getState: vi.fn(() => ({
        features: {},
        getFeature: (_id: string) => undefined
      }))
    } as unknown as Store;
    
    mockSnapping = {} as unknown as Snapping;
  });

  // Add a link between an arrow and a node
  it("should add a link between an arrow and a node", () => {
    const ogma = createOgma();
    // Add node first
    ogma.addNode({ id: "node1", attributes: { x: 0, y: 0 } });

    const links = new Links(ogma, mockSnapping, mockStore);
    const arrow = createArrow();
    const arrowId = arrow.id;
    const side = "start";
    const targetId = "node1";

    links.add(arrow, side, targetId, "node", { x: 0, y: 0 });

    // Check that the link was created
    expect(links["links"].size).toBeGreaterThan(0);
    expect(links["linksByArrowId"].get(arrowId)?.[side]).toBeDefined();
  });

  // Add a link between an arrow and an edge
  it("should add a link between an arrow and an edge", () => {
    const ogma = createOgma();
    // Add nodes and edge first
    ogma.addNode({ id: "node1", attributes: { x: 0, y: 0 } });
    ogma.addNode({ id: "node2", attributes: { x: 100, y: 100 } });
    ogma.addEdge({ id: "edge1", source: "node1", target: "node2" });

    const links = new Links(ogma, mockSnapping, mockStore);
    const arrow = createArrow();
    const arrowId = arrow.id;
    const side = "start";
    const targetId = "edge1";
    const magnet = { x: 0.5, y: 0 }; // t parameter for edge position (0.5 = middle)

    links.add(arrow, side, targetId, "edge", magnet);

    const linkId = links["linksByArrowId"].get(arrowId)?.[side];
    expect(linkId).toBeDefined();
    const link = links["links"].get(linkId!);
    expect(link).toBeDefined();
    expect(link?.arrow).toBe(arrowId);
    expect(link?.target).toBe(targetId);
    expect(link?.targetType).toBe("edge");
    expect(link?.side).toBe(side);
    // Internal magnet is typed EdgeMagnet; serialized format (arrow.properties.link) stays { x, y }
    expect(link?.magnet).toEqual({ type: "edge", t: 0.5 });
  });

  // Add a link between an arrow and a text
  it("should add a link between an arrow and a text", () => {
    const ogma = createOgma();
    const links = new Links(ogma, mockSnapping, mockStore);
    const arrow = createArrow();
    const arrowId = arrow.id;
    const side = "start";
    const targetId = "text1";
    const magnet = { x: 0, y: 1 };

    links.add(arrow, side, targetId, "text", magnet);

    const linkId = links["linksByArrowId"].get(arrowId)?.[side];
    expect(linkId).toBeDefined();
    const link = links["links"].get(linkId!);
    expect(link).toBeDefined();
    expect(link?.arrow).toBe(arrowId);
    expect(link?.target).toBe(targetId);
    expect(link?.targetType).toBe("text");
    expect(link?.side).toBe(side);
    // Internal magnet is typed BoxMagnet; serialized format (arrow.properties.link) stays { x, y }
    expect(link?.magnet).toEqual({ type: "box", nx: 0, ny: 1 });
  });

  // Remove a link between an arrow and a node
  it("should remove a link between an arrow and a node", () => {
    const ogma = createOgma();
    ogma.addNode({ id: "node1", attributes: { x: 0, y: 0 } });

    const links = new Links(ogma, mockSnapping, mockStore);
    const arrow: Arrow = createArrow();
    const arrowId = arrow.id;
    const side = "start";
    const targetId = "node1";
    const magnet = { x: 0, y: 0 };
    links.add(arrow, side, targetId, "node", magnet);

    links.remove(arrow, side);

    expect(links["links"].size).toBe(0);
    expect(links["linksByArrowId"].get(arrowId)?.[side]).toBeUndefined();
  });

  // Remove a non-existing link
  it("should not throw an error when removing a non-existing link", () => {
    const ogma = createOgma();
    const links = new Links(ogma, mockSnapping, mockStore);
    const arrow: Arrow = createArrow();
    const side = "start";

    expect(() => links.remove(arrow, side)).not.toThrow();
  });

  // Remove a link with a non-existing arrow id
  it("should not throw an error when removing a link with a non-existing arrow id", () => {
    const ogma = createOgma();
    ogma.addNode({ id: "node1", attributes: { x: 0, y: 0 } });

    const links = new Links(ogma, mockSnapping, mockStore);
    const arrow: Arrow = createArrow();
    const otherArrow = createArrow();
    const side = "start";
    const targetId = "node1";
    const magnet = { x: 0, y: 0 };
    links.add(arrow, side, targetId, "node", magnet);

    expect(() => links.remove(otherArrow, side)).not.toThrow();
  });

  // Remove a link with a non-existing side
  it("should not throw an error when removing a link with a non-existing side", () => {
    const ogma = createOgma();
    ogma.addNode({ id: "node1", attributes: { x: 0, y: 0 } });

    const links = new Links(ogma, mockSnapping, mockStore);
    const arrow: Arrow = createArrow();
    const side = "start";
    const targetId = "node1";
    const magnet = { x: 0, y: 0 };
    links.add(arrow, side, targetId, "node", magnet);

    expect(() => links.remove(arrow, "end")).not.toThrow();
  });

  it("should store link data in arrow properties", () => {
    const ogma = createOgma();
    ogma.addNode({ id: "node1", attributes: { x: 0, y: 0 } });

    const links = new Links(ogma, mockSnapping, mockStore);
    const arrow: Arrow = createArrow();
    const side = "start";
    const targetId = "node1";
    const magnet = { x: 0, y: 0 };

    links.add(arrow, side, targetId, "node", magnet);

    expect(arrow.properties.link?.[side]).toEqual({
      id: targetId,
      side,
      type: "node",
      magnet
    });
  });

  it("should handle multiple links on same arrow", () => {
    const ogma = createOgma();
    ogma.addNode({ id: "node1", attributes: { x: 0, y: 0 } });

    const links = new Links(ogma, mockSnapping, mockStore);
    const arrow: Arrow = createArrow();
    const targetId1 = "node1";
    const targetId2 = "text1";
    const magnet1 = { x: 0, y: 0 };
    const magnet2 = { x: 1, y: 1 };

    links.add(arrow, "start", targetId1, "node", magnet1);
    links.add(arrow, "end", targetId2, "text", magnet2);

    expect(arrow.properties.link?.start).toEqual({
      id: targetId1,
      side: "start",
      type: "node",
      magnet: magnet1
    });
    expect(arrow.properties.link?.end).toEqual({
      id: targetId2,
      side: "end",
      type: "text",
      magnet: magnet2
    });
  });

  it("should load links from data", () => {
    const ogma = createOgma();
    ogma.addNode({ id: "n0" });
    const control = new Control(ogma);

    // Add text first, then arrow so links can be created
    const data = LoadLinksData as AnnotationCollection;
    const textFeature = data.features.find((f) => f.properties.type === "text");
    const arrowFeature = data.features.find(
      (f) => f.properties.type === "arrow"
    );

    if (textFeature) control.add(textFeature);
    if (arrowFeature) control.add(arrowFeature);

    // @ts-expect-error - links is private
    const linksArray = Array.from(control.links.links.values());

    expect(linksArray).toHaveLength(2);
    const [link1, link2] = linksArray;

    expect(link1.arrow).toEqual(2);
    expect(link1.side).toEqual("start");
    expect(link1.target).toEqual(0);
    expect(link1.targetType).toEqual("text");

    expect(link2.arrow).toEqual(2);
    expect(link2.side).toEqual("end");
    expect(link2.target).toEqual("n0");
    expect(link2.targetType).toEqual("node");
  });

  it("should not load links if target does not exist", () => {
    const ogma = createOgma();
    const control = new Control(ogma);
    control.add(LoadLinksMissing as AnnotationCollection);

    // @ts-expect-error - links is private
    const links = Array.from(control.links.links.values());
    expect(
      links.map((l) => {
        return {
          ...l,
          id: undefined
        };
      })
    ).toMatchInlineSnapshot(`
      [
        {
          "arrow": 2,
          "id": undefined,
          "magnet": {
            "nx": 0.5,
            "ny": 1,
            "type": "box",
          },
          "side": "start",
          "target": 0,
          "targetType": "text",
        },
      ]
    `);
  });

  describe("programmatic annotation move refreshes linked arrows", () => {
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

    it("should update arrow endpoint when linked text is moved programmatically", () => {
      const text = createText(100, 100, 100, 50, "Hello");
      // Arrow with end linked to text at its right edge (magnet x=0.5, y=0)
      // snap point = center(100,100) + (0.5*100, 0*50) = (150, 100)
      const arrow = createArrow(0, 100, 150, 100);
      arrow.properties.link = {
        end: { id: text.id, side: "end", type: "text", magnet: { x: 0.5, y: 0 } }
      };

      control.add(text);
      control.add(arrow);

      const beforeEnd = control.getAnnotation<Arrow>(arrow.id)!
        .geometry.coordinates[1].slice();

      control.update({
        id: text.id,
        geometry: { type: "Point", coordinates: [300, 300] }
      });

      const afterEnd = control.getAnnotation<Arrow>(arrow.id)!
        .geometry.coordinates[1];

      expect(afterEnd[0]).not.toEqual(beforeEnd[0]);
      expect(afterEnd[1]).not.toEqual(beforeEnd[1]);
    });

    it("should not move arrow when only text style is updated", () => {
      const text = createText(100, 100, 100, 50, "Hello");
      const arrow = createArrow(0, 100, 150, 100);
      arrow.properties.link = {
        end: { id: text.id, side: "end", type: "text", magnet: { x: 0.5, y: 0 } }
      };

      control.add(text);
      control.add(arrow);

      const beforeEnd = control.getAnnotation<Arrow>(arrow.id)!
        .geometry.coordinates[1].slice();

      control.updateStyle(text.id, { color: "red" });

      const afterEnd = control.getAnnotation<Arrow>(arrow.id)!
        .geometry.coordinates[1];

      expect(afterEnd[0]).toEqual(beforeEnd[0]);
      expect(afterEnd[1]).toEqual(beforeEnd[1]);
    });

    it("should update both arrow endpoints when both sides are linked to annotations that move", () => {
      // createText(x, y, w, h) uses x,y as top-left; center = [x + w/2, y + h/2]
      // textA center = [50, 25], right-edge snap (magnet {x:0.5}) = [50 + 50, 25] = [100, 25]
      const textA = createText(0, 0, 100, 50, "A");
      // textB center = [250, 25], left-edge snap (magnet {x:-0.5}) = [250 - 50, 25] = [200, 25]
      const textB = createText(200, 0, 100, 50, "B");

      // Arrow pre-placed at the actual snap points
      const arrow = createArrow(100, 25, 200, 25);
      arrow.properties.link = {
        start: { id: textA.id, side: "start", type: "text", magnet: { x: 0.5, y: 0 } },
        end: { id: textB.id, side: "end", type: "text", magnet: { x: -0.5, y: 0 } }
      };

      control.add(textA);
      control.add(textB);
      control.add(arrow);

      // Move textA center to [50, 225]: new right-edge snap = [100, 225]
      control.update({ id: textA.id, geometry: { type: "Point", coordinates: [50, 225] } });

      const afterStart = control.getAnnotation<Arrow>(arrow.id)!
        .geometry.coordinates[0];
      const afterEnd = control.getAnnotation<Arrow>(arrow.id)!
        .geometry.coordinates[1];

      // Start should have moved to textA's new right edge
      expect(afterStart[0]).toBeCloseTo(100);
      expect(afterStart[1]).toBeCloseTo(225);
      // End should stay at textB's left edge (textB didn't move)
      expect(afterEnd[0]).toBeCloseTo(200);
      expect(afterEnd[1]).toBeCloseTo(25);
    });
  });
});
