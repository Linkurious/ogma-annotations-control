import Ogma from "@linkurious/ogma";
import { describe, it, expect } from "vitest";
import {
  AnnotationCollection,
  Arrow,
  Control,
  createArrow,
  Link
} from "../../src";
import { Links } from "../../src/links";
import LoadLinksMissing from "../fixtures/load-links-missing.json";
import LoadLinksData from "../fixtures/load-links.json";

describe("Links", () => {
  // Add a link between an arrow and a node
  it("should add a link between an arrow and a node", () => {
    const ogma = new Ogma();
    const links = new Links(ogma);
    const arrow = createArrow();
    const arrowId = arrow.id;
    const side = "start";
    const targetId = "node1";

    links.add(arrow, side, targetId, "node", { x: 0, y: 0 });
    expect(links["linksByTargetId"]).toEqual({
      [targetId]: [expect.any(String)]
    });
    expect(links["linksByArrowId"]).toEqual({
      [arrowId]: {
        [side]: expect.any(String)
      }
    });
  });

  // Add a link between an arrow and a text
  it("should add a link between an arrow and a text", () => {
    const ogma = new Ogma();
    const links = new Links(ogma);
    const arrow = createArrow();
    const arrowId = arrow.id;
    const side = "start";
    const targetId = "text1";
    const connectionPoint = { x: 0, y: 1 };

    links.add(arrow, side, targetId, "text", connectionPoint);

    expect(links["links"][Object.keys(links["links"]).pop()!]).toEqual<Link>({
      id: expect.any(String),
      arrow: arrowId,
      target: targetId,
      targetType: "text",
      side,
      connectionPoint
    });
    expect(links["linksByTargetId"]).toEqual({
      [targetId]: [expect.any(String)]
    });
    expect(links["linksByArrowId"]).toEqual({
      [arrowId]: {
        [side]: expect.any(String)
      }
    });
  });

  // Remove a link between an arrow and a node
  it("should remove a link between an arrow and a node", () => {
    const ogma = new Ogma();
    const links = new Links(ogma);
    const arrow: Arrow = createArrow();
    const arrowId = arrow.id;
    const side = "start";
    const targetId = "node1";
    const connectionPoint = { x: 0, y: 0 };
    links.add(arrow, side, targetId, "node", connectionPoint);

    links.remove(arrow, side);

    expect(links["links"]).toEqual({});
    expect(links["linksByTargetId"]).toEqual({ [targetId]: [] });
    expect(links["linksByArrowId"]).toEqual({
      [arrowId]: {}
    });
  });

  // Remove a non-existing link
  it("should throw an error when removing a non-existing link", () => {
    const ogma = new Ogma();
    const links = new Links(ogma);
    const arrow: Arrow = createArrow();
    const side = "start";

    expect(() => links.remove(arrow, side)).not.toThrow();
  });

  // Remove a link with a non-existing arrow id
  it("should throw an error when removing a link with a non-existing arrow id", () => {
    const ogma = new Ogma();
    const links = new Links(ogma);
    const arrow: Arrow = createArrow();
    const otherArrow = createArrow();
    const side = "start";
    const targetId = "node1";
    const connectionPoint = { x: 0, y: 0 };
    links.add(arrow, side, targetId, "node", connectionPoint);

    expect(() => links.remove(otherArrow, side)).not.toThrow();
  });

  // Remove a link with a non-existing side
  it("should not throw an error when removing a link with a non-existing side", () => {
    const ogma = new Ogma();
    const links = new Links(ogma);
    const arrow: Arrow = createArrow();
    const side = "start";
    const targetId = "node1";
    const connectionPoint = { x: 0, y: 0 };
    links.add(arrow, side, targetId, "node", connectionPoint);

    expect(() => links.remove(arrow, "end")).not.toThrow();
  });

  it("should return the link object when it exists for the given arrowId and side", () => {
    const ogma = new Ogma();
    const links = new Links(ogma);
    const arrow: Arrow = createArrow();
    const arrowId = arrow.id;
    const side = "start";
    const link: Link = {
      id: expect.any(String),
      arrow: arrowId,
      target: "target1",
      targetType: "text",
      connectionPoint: { x: 0, y: 0 },
      side
    };
    links.add(arrow, side, "target1", "text", { x: 0, y: 0 });
    expect(links.getArrowLink(arrowId, side)).toEqual(link);
  });

  // Returns an empty array when there are no links for the given targetId.
  it("should return an empty array when there are no links for the given targetId", () => {
    const ogma = new Ogma();
    const links = new Links(ogma);
    const targetId = "target1";
    const result = links
      .getTargetLinks(targetId, "node")
      .concat(links.getTargetLinks(targetId, "text"));
    expect(result).toEqual([]);
  });

  // Returns an array of links for the given targetId.
  it("should return an array of links for the given targetId", () => {
    const ogma = new Ogma();
    const links = new Links(ogma);
    const arrow: Arrow = createArrow();
    const arrowId = arrow.id;
    const side = "start";
    const targetId = "target1";
    const connectionPoint = { x: 0, y: 0 };
    links.add(arrow, side, targetId, "node", connectionPoint);
    const result = links.getTargetLinks(targetId, "node");
    expect(result).toEqual<Link[]>([
      {
        id: expect.any(String),
        arrow: arrowId,
        target: targetId,
        targetType: "node",
        connectionPoint,
        side
      }
    ]);
  });

  // Returns the correct links for the given targetId.
  it("should return the correct links for the given targetId", () => {
    const ogma = new Ogma();
    const links = new Links(ogma);
    const arrow1: Arrow = createArrow();
    const arrowId1 = arrow1.id;
    const arrow2: Arrow = createArrow();
    const arrowId2 = arrow2.id;
    const side1 = "start";
    const targetId = "target1";
    const side2 = "end";
    const connectionPoint = { x: 0, y: 0 };
    links.add(arrow1, side1, targetId, "node", connectionPoint);
    links.add(arrow2, side2, targetId, "node", connectionPoint);
    const result = links.getTargetLinks(targetId, "node");
    const expected: Link[] = [
      {
        id: expect.any(String),
        arrow: arrowId1,
        target: targetId,
        targetType: "node",
        connectionPoint,
        side: side1
      },
      {
        id: expect.any(String),
        arrow: arrowId2,
        target: targetId,
        targetType: "node",
        connectionPoint,
        side: side2
      }
    ];
    expect(result).toEqual(expected);
  });

  it("should export the links together with arrows", () => {
    const ogma = new Ogma();
    const links = new Links(ogma);
    const arrow: Arrow = createArrow();
    const side = "start";
    const targetId = "node1";
    links.add(arrow, side, targetId, "node", { x: 0, y: 0 });
    const point = { x: 0, y: 0 };
    links.add(arrow, "end", "textId", "text", point);

    expect(arrow.properties.link?.start).toEqual({
      id: targetId,
      side,
      type: "node",
      magnet: point
    });
    expect(arrow.properties.link?.end).toEqual({
      id: "textId",
      side: "end",
      type: "text",
      magnet: point
    });
  });

  it("should load links", () => {
    const ogma = new Ogma({
      options: { renderer: null }
    });
    ogma.addNode({ id: "n0" });
    const control = new Control(ogma);
    control.add(LoadLinksData as AnnotationCollection);
    // @ts-expect-error - links is private
    const [link1, link2] = Object.values(control.links.links);

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
    const ogma = new Ogma({
      options: { renderer: null }
    });
    const control = new Control(ogma);
    control.add(LoadLinksMissing as AnnotationCollection);
    // @ts-expect-error - links is private
    const links = Object.values(control.links.links);
    expect(links).toEqual([]);
  });
});
