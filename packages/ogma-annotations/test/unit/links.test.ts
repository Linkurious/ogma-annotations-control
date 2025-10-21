import { describe, it, expect, beforeEach, vi } from "vitest";
import { createOgma } from "./utils";
import { AnnotationCollection, Arrow, Control, createArrow } from "../../src";
import { Links } from "../../src/links";
import { Store } from "../../src/store";
import LoadLinksMissing from "../fixtures/load-links-missing.json";
import LoadLinksData from "../fixtures/load-links.json";

describe("Links", () => {
  let mockStore: Store;

  beforeEach(() => {
    mockStore = {
      subscribe: vi.fn(() => vi.fn()),
      getState: vi.fn(() => ({
        features: {},
        getFeature: (_id: string) => undefined
      }))
    } as unknown as Store;
  });

  // Add a link between an arrow and a node
  it("should add a link between an arrow and a node", () => {
    const ogma = createOgma();
    // Add node first
    ogma.addNode({ id: "node1", attributes: { x: 0, y: 0 } });

    const links = new Links(ogma, mockStore);
    const arrow = createArrow();
    const arrowId = arrow.id;
    const side = "start";
    const targetId = "node1";

    links.add(arrow, side, targetId, "node", { x: 0, y: 0 });

    // Check that the link was created
    expect(links["links"].size).toBeGreaterThan(0);
    expect(links["linksByArrowId"].get(arrowId)?.[side]).toBeDefined();
  });

  // Add a link between an arrow and a text
  it("should add a link between an arrow and a text", () => {
    const ogma = createOgma();
    const links = new Links(ogma, mockStore);
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
    expect(link?.magnet).toEqual(magnet);
  });

  // Remove a link between an arrow and a node
  it("should remove a link between an arrow and a node", () => {
    const ogma = createOgma();
    ogma.addNode({ id: "node1", attributes: { x: 0, y: 0 } });

    const links = new Links(ogma, mockStore);
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
    const links = new Links(ogma, mockStore);
    const arrow: Arrow = createArrow();
    const side = "start";

    expect(() => links.remove(arrow, side)).not.toThrow();
  });

  // Remove a link with a non-existing arrow id
  it("should not throw an error when removing a link with a non-existing arrow id", () => {
    const ogma = createOgma();
    ogma.addNode({ id: "node1", attributes: { x: 0, y: 0 } });

    const links = new Links(ogma, mockStore);
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

    const links = new Links(ogma, mockStore);
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

    const links = new Links(ogma, mockStore);
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

    const links = new Links(ogma, mockStore);
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
            "x": 0.5,
            "y": 1,
          },
          "side": "start",
          "target": 0,
          "targetType": "text",
        },
      ]
    `);
  });
});
