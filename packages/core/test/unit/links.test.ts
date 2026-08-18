import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { createOgma } from "./utils";
import {
  AnnotationCollection,
  Arrow,
  Control,
  createArrow,
  createComment,
  createPolygon,
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
    expect(links["index"]["links"].size).toBeGreaterThan(0);
    expect(links["index"]["linksByArrowId"].get(arrowId)?.[side]).toBeDefined();
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

    const linkId = links["index"]["linksByArrowId"].get(arrowId)?.[side];
    expect(linkId).toBeDefined();
    const link = links["index"]["links"].get(linkId!);
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

    const linkId = links["index"]["linksByArrowId"].get(arrowId)?.[side];
    expect(linkId).toBeDefined();
    const link = links["index"]["links"].get(linkId!);
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

    expect(links["index"]["links"].size).toBe(0);
    expect(links["index"]["linksByArrowId"].get(arrowId)?.[side]).toBeUndefined();
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
    const linksArray = Array.from(control.links["index"].links.values());

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
    const links = Array.from(control.links["index"].links.values());
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

    it("should update arrow endpoint when linked comment is moved programmatically", () => {
      // Comment at (100,100), expanded default width=200; right-edge snap
      // (magnet x=0.5, y=0) = center(100,100) + (0.5*200, 0) = (200, 100)
      const comment = createComment(100, 100, "review");
      const arrow = createArrow(0, 100, 200, 100);
      arrow.properties.link = {
        end: { id: comment.id, side: "end", type: "comment", magnet: { x: 0.5, y: 0 } }
      };

      control.add(comment);
      control.add(arrow);

      const beforeEnd = control.getAnnotation<Arrow>(arrow.id)!
        .geometry.coordinates[1].slice();

      control.update({
        id: comment.id,
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

  describe("comment collapse updates linked arrow endpoint", () => {
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

    it("should move arrow endpoint to icon edge when comment collapses", () => {
      // Comment at (0,0), expanded: width=200, height=60, iconSize=32 (defaults)
      // Right-edge snap with magnet {nx:0.5} at zoom=1:
      //   expanded  → center(0,0) + 0.5 * 200 = (100, 0)
      //   collapsed → center(0,0) + 0.5 *  32 = ( 16, 0)
      const comment = createComment(0, 0, "review");
      const arrow = createArrow(0, 0, 100, 0);
      arrow.properties.link = {
        end: {
          id: comment.id,
          side: "end",
          type: "comment",
          magnet: { x: 0.5, y: 0 }
        }
      };

      control.add(comment);
      control.add(arrow);

      // Establish the initial snap (expanded): refresh writes to liveUpdates, commit flushes to features
      // @ts-expect-error links is private
      control.links.refresh();
      // @ts-expect-error commit is private
      control.links.commit();

      const expandedEnd = control
        .getAnnotation<Arrow>(arrow.id)!
        .geometry.coordinates[1].slice();

      control.toggleComment(comment.id);
      // @ts-expect-error links is private
      control.links.refresh();
      // @ts-expect-error commit is private
      control.links.commit();

      const collapsedEnd = control
        .getAnnotation<Arrow>(arrow.id)!
        .geometry.coordinates[1];

      // Endpoint should shift inward from the expanded right edge (100) to the icon right edge (16)
      expect(expandedEnd[0]).toBeCloseTo(100);
      expect(collapsedEnd[0]).toBeCloseTo(16);
      expect(collapsedEnd[1]).toBeCloseTo(0);
    });
  });

  describe("node drag rigidly moves a 1:1 attached comment", () => {
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

    it("translates the comment and the whole arrow by the node's delta", () => {
      ogma.addNode({ id: "node1", attributes: { x: 0, y: 0, radius: 0 } });

      // Comment center at (200,0). Arrow from node center to comment left edge.
      const comment = createComment(200, 0, "review");
      const arrow = createArrow(0, 0, 100, 0);

      control.add(comment);
      control.add(arrow);

      // start → node1 (center), end → comment left edge
      // @ts-expect-error links is private
      control.links.add(arrow, "start", "node1", "node", { x: 0, y: 0 });
      // @ts-expect-error links is private
      control.links.add(arrow, "end", comment.id, "comment", { x: -0.5, y: 0 });

      // @ts-expect-error links is private
      control.links.refresh();
      // @ts-expect-error commit is private
      control.links.commit();

      const beforeStart = control.getAnnotation<Arrow>(arrow.id)!
        .geometry.coordinates[0].slice();
      const beforeEnd = control.getAnnotation<Arrow>(arrow.id)!
        .geometry.coordinates[1].slice();
      const beforeComment = (
        control.getAnnotation(comment.id)!.geometry as { coordinates: number[] }
      ).coordinates.slice();

      // Drag node1 down by 100. setAttributes emits setMultipleAttributes,
      // which the Links handler picks up; invoke the update path directly so the
      // assertion doesn't depend on the internal debounce timer.
      ogma.getNode("node1")!.setAttributes({ y: 100 });
      // @ts-expect-error updateFromNodePositions is private (bypasses the setTimeout debounce)
      control.links.updateFromNodePositions(ogma.getNodes(["node1"]));
      // @ts-expect-error commit is private
      control.links.commit();
      // Cancel the debounced duplicate scheduled by setAttributes so it can't
      // translate the comment a second time after the assertions.
      // @ts-expect-error nodePositionTimeout is private
      clearTimeout(control.links.nodePositionTimeout);

      const afterStart = control.getAnnotation<Arrow>(arrow.id)!
        .geometry.coordinates[0];
      const afterEnd = control.getAnnotation<Arrow>(arrow.id)!
        .geometry.coordinates[1];
      const afterComment = (
        control.getAnnotation(comment.id)!.geometry as { coordinates: number[] }
      ).coordinates;

      // The comment translates rigidly with the node (delta y ≈ +100, x unchanged).
      expect(afterComment[0]).toBeCloseTo(beforeComment[0]);
      expect(afterComment[1]).toBeCloseTo(beforeComment[1] + 100);

      // Both arrow endpoints shift by the same delta → the line keeps its length
      // and angle (no stretching).
      expect(afterStart[0]).toBeCloseTo(beforeStart[0]);
      expect(afterStart[1]).toBeCloseTo(beforeStart[1] + 100);
      expect(afterEnd[0]).toBeCloseTo(beforeEnd[0]);
      expect(afterEnd[1]).toBeCloseTo(beforeEnd[1] + 100);
    });

    it("still rigidly moves the comment when it has more than one inbound link, and the sibling arrow tracks it elastically", () => {
      ogma.addNode({ id: "node1", attributes: { x: 0, y: 0, radius: 0 } });

      const comment = createComment(200, 0, "review");
      const arrow1 = createArrow(0, 0, 100, 0);
      const arrow2 = createArrow(200, 200, 150, 0);

      control.add(comment);
      control.add(arrow1);
      control.add(arrow2);

      // arrow1: node1 → comment (the rigid pair)
      // @ts-expect-error links is private
      control.links.add(arrow1, "start", "node1", "node", { x: 0, y: 0 });
      // @ts-expect-error links is private
      control.links.add(arrow1, "end", comment.id, "comment", { x: -0.5, y: 0 });
      // arrow2 also targets the comment, from an unrelated free point — it's
      // no longer a 1:1 attachment, but rigid-follow no longer requires one.
      // @ts-expect-error links is private
      control.links.add(arrow2, "end", comment.id, "comment", { x: 0, y: 0.5 });

      // @ts-expect-error links is private
      control.links.refresh();
      // @ts-expect-error commit is private
      control.links.commit();

      const beforeComment = (
        control.getAnnotation(comment.id)!.geometry as { coordinates: number[] }
      ).coordinates.slice();
      const beforeArrow2 = control
        .getAnnotation<Arrow>(arrow2.id)!
        .geometry.coordinates.map((c) => c.slice());

      ogma.getNode("node1")!.setAttributes({ y: 100 });
      // @ts-expect-error updateFromNodePositions is private
      control.links.updateFromNodePositions(ogma.getNodes(["node1"]));
      // @ts-expect-error commit is private
      control.links.commit();
      // @ts-expect-error nodePositionTimeout is private
      clearTimeout(control.links.nodePositionTimeout);

      const afterComment = (
        control.getAnnotation(comment.id)!.geometry as { coordinates: number[] }
      ).coordinates;
      const afterArrow2 = control.getAnnotation<Arrow>(arrow2.id)!.geometry
        .coordinates;

      // The comment still translates rigidly with node1 (delta y ≈ +100).
      expect(afterComment[0]).toBeCloseTo(beforeComment[0]);
      expect(afterComment[1]).toBeCloseTo(beforeComment[1] + 100);

      // arrow2's free start point (unrelated to node1) is left untouched —
      // it wasn't dragged as part of the node's rigid chain.
      expect(afterArrow2[0][0]).toBeCloseTo(beforeArrow2[0][0]);
      expect(afterArrow2[0][1]).toBeCloseTo(beforeArrow2[0][1]);

      // arrow2's comment-side endpoint elastically re-anchors to the
      // comment's new position (which happens to shift by the same delta,
      // since the comment only translated — it didn't resize or rotate).
      expect(afterArrow2[1][0]).toBeCloseTo(beforeArrow2[1][0]);
      expect(afterArrow2[1][1]).toBeCloseTo(beforeArrow2[1][1] + 100);
    });

    it("does NOT rigidly move a comment with connectorMode: elastic", () => {
      ogma.addNode({ id: "node1", attributes: { x: 0, y: 0, radius: 0 } });

      const comment = createComment(200, 0, "review", {
        style: { connectorMode: "elastic" }
      });
      const arrow = createArrow(0, 0, 100, 0);

      control.add(comment);
      control.add(arrow);

      // @ts-expect-error links is private
      control.links.add(arrow, "start", "node1", "node", { x: 0, y: 0 });
      // @ts-expect-error links is private
      control.links.add(arrow, "end", comment.id, "comment", { x: -0.5, y: 0 });

      // @ts-expect-error links is private
      control.links.refresh();
      // @ts-expect-error commit is private
      control.links.commit();

      const beforeComment = (
        control.getAnnotation(comment.id)!.geometry as { coordinates: number[] }
      ).coordinates.slice();

      ogma.getNode("node1")!.setAttributes({ y: 100 });
      // @ts-expect-error updateFromNodePositions is private
      control.links.updateFromNodePositions(ogma.getNodes(["node1"]));
      // @ts-expect-error commit is private
      control.links.commit();
      // @ts-expect-error nodePositionTimeout is private
      clearTimeout(control.links.nodePositionTimeout);

      const afterComment = (
        control.getAnnotation(comment.id)!.geometry as { coordinates: number[] }
      ).coordinates;

      // Comment stays put — "elastic" opts back out of rigid-follow.
      expect(afterComment[0]).toBeCloseTo(beforeComment[0]);
      expect(afterComment[1]).toBeCloseTo(beforeComment[1]);
    });
  });

  describe("edge and annotation moves also rigidly move a comment", () => {
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

    it("translates the comment when its edge attachment point moves", () => {
      ogma.addNode({ id: "node1", attributes: { x: 0, y: 0, radius: 0 } });
      ogma.addNode({ id: "node2", attributes: { x: 200, y: 0, radius: 0 } });
      ogma.addEdge({ id: "edge1", source: "node1", target: "node2" });

      // Comment below the edge midpoint; arrow from comment's top edge to
      // the edge's midpoint (t = 0.5).
      const comment = createComment(0, -100, "review");
      const arrow = createArrow(0, -70, 100, 0);

      control.add(comment);
      control.add(arrow);

      // @ts-expect-error links is private
      control.links.add(arrow, "start", comment.id, "comment", { x: 0, y: 0.5 });
      // @ts-expect-error links is private
      control.links.add(arrow, "end", "edge1", "edge", { x: 0.5, y: 0 });

      // @ts-expect-error links is private
      control.links.refresh();
      // @ts-expect-error commit is private
      control.links.commit();

      const beforeComment = (
        control.getAnnotation(comment.id)!.geometry as { coordinates: number[] }
      ).coordinates.slice();

      // Move node2 so the edge midpoint shifts from (100,0) to (100,100).
      ogma.getNode("node2")!.setAttributes({ y: 200 });
      // @ts-expect-error updateFromNodePositions is private
      control.links.updateFromNodePositions(ogma.getNodes(["node2"]));
      // @ts-expect-error commit is private
      control.links.commit();
      // @ts-expect-error nodePositionTimeout is private
      clearTimeout(control.links.nodePositionTimeout);

      const afterComment = (
        control.getAnnotation(comment.id)!.geometry as { coordinates: number[] }
      ).coordinates;
      const afterArrow = control.getAnnotation<Arrow>(arrow.id)!.geometry
        .coordinates;

      // The comment rigidly translates by the edge midpoint's delta (0, +100).
      expect(afterComment[0]).toBeCloseTo(beforeComment[0]);
      expect(afterComment[1]).toBeCloseTo(beforeComment[1] + 100);
      // The arrow's edge-side endpoint tracks the new midpoint exactly.
      expect(afterArrow[1][0]).toBeCloseTo(100);
      expect(afterArrow[1][1]).toBeCloseTo(100);
    });

    it("translates the comment when a linked annotation attachment point moves", () => {
      // textA center = [50, 25], right-edge snap (magnet {x:0.5}) = [100, 25]
      const textA = createText(0, 0, 100, 50, "A");
      // comment center = [300, 25]; left-edge snap (magnet {x:-0.5}) = [200, 25]
      const comment = createComment(300, 25, "review");
      const arrow = createArrow(200, 25, 100, 25);
      arrow.properties.link = {
        start: {
          id: comment.id,
          side: "start",
          type: "comment",
          magnet: { x: -0.5, y: 0 }
        },
        end: {
          id: textA.id,
          side: "end",
          type: "text",
          magnet: { x: 0.5, y: 0 }
        }
      };

      control.add(textA);
      control.add(comment);
      control.add(arrow);

      const beforeComment = (
        control.getAnnotation(comment.id)!.geometry as { coordinates: number[] }
      ).coordinates.slice();

      // Move textA's center from [50,25] to [50,225]: new right-edge snap = [100,225].
      control.update({
        id: textA.id,
        geometry: { type: "Point", coordinates: [50, 225] }
      });

      const afterComment = (
        control.getAnnotation(comment.id)!.geometry as { coordinates: number[] }
      ).coordinates;
      const afterArrow = control.getAnnotation<Arrow>(arrow.id)!.geometry
        .coordinates;

      // The comment rigidly translates by textA's delta (0, +200) — this is
      // the key difference from the pre-existing elastic behavior, where the
      // comment's own geometry never changed at all.
      expect(afterComment[0]).toBeCloseTo(beforeComment[0]);
      expect(afterComment[1]).toBeCloseTo(beforeComment[1] + 200);
      // The arrow's text-side endpoint tracks textA's new right edge.
      expect(afterArrow[1][0]).toBeCloseTo(100);
      expect(afterArrow[1][1]).toBeCloseTo(225);
    });
  });

  describe("manual arrow-tip drag stays elastic even with a rigid comment", () => {
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

    it("moves only the tip, leaving the comment in place so it can be detached", () => {
      const comment = createComment(200, 0, "review");
      const arrow = createArrow(100, 0, 0, 0);

      control.add(comment);
      control.add(arrow);

      // Start -> comment's left edge; end is a free point (no link).
      // @ts-expect-error links is private
      control.links.add(arrow, "start", comment.id, "comment", { x: -0.5, y: 0 });
      // @ts-expect-error links is private
      control.links.refresh();
      // @ts-expect-error commit is private
      control.links.commit();

      control.select(arrow.id);

      // @ts-expect-error editor is private
      const arrowHandler = control.editor.getArrowHandler() as unknown as {
        clientToCanvas: (evt: { clientX: number; clientY: number }) => {
          x: number;
          y: number;
        };
        hoveredHandle: unknown;
        dragStartPoint: unknown;
        dragging: boolean;
        onDrag: (evt: unknown) => void;
        commitChange: () => void;
      };
      // Deterministic client->graph mapping — the headless test ogma has no
      // real viewport/container to derive it from.
      arrowHandler.clientToCanvas = (evt) => ({ x: evt.clientX, y: evt.clientY });

      const beforeComment = (
        control.getAnnotation(comment.id)!.geometry as { coordinates: number[] }
      ).coordinates.slice();
      const beforeEnd = control
        .getAnnotation<Arrow>(arrow.id)!
        .geometry.coordinates[1].slice();

      // Grab the free end handle and drag it by (30, 40).
      arrowHandler.hoveredHandle = {
        type: "end",
        point: { x: beforeEnd[0], y: beforeEnd[1] }
      };
      arrowHandler.dragStartPoint = { x: beforeEnd[0], y: beforeEnd[1] };
      arrowHandler.dragging = true;
      arrowHandler.onDrag({
        clientX: beforeEnd[0] + 30,
        clientY: beforeEnd[1] + 40,
        stopPropagation() {},
        stopImmediatePropagation() {}
      });
      arrowHandler.commitChange();

      const afterComment = (
        control.getAnnotation(comment.id)!.geometry as { coordinates: number[] }
      ).coordinates;
      const afterEnd = control.getAnnotation<Arrow>(arrow.id)!.geometry
        .coordinates[1];

      // The comment (and the arrow's start on it) doesn't move - rigidity
      // only governs what happens when the node end moves, not a manual
      // grab of the free tip, which must stay free to detach.
      expect(afterComment[0]).toBeCloseTo(beforeComment[0]);
      expect(afterComment[1]).toBeCloseTo(beforeComment[1]);
      // The tip itself lands exactly at the drop point.
      expect(afterEnd[0]).toBeCloseTo(beforeEnd[0] + 30);
      expect(afterEnd[1]).toBeCloseTo(beforeEnd[1] + 40);
    });
  });

  describe("live-dragging a polygon rigidly carries its attached comments", () => {
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

    // Regression test: dragging a polygon body used to leave its attached
    // comments behind (elastic-only), and — once the comment cascade was
    // added to updateLinkedArrowsDuringDrag — a second, unrelated bug made
    // it compound the displacement across mousemove frames instead of
    // recomputing an absolute position each time, eventually blowing the
    // call stack once the drag committed.
    it("translates two attached comments by the drag delta across many mousemove frames, without compounding", () => {
      const polygon = createPolygon([
        [[0, 0], [100, 0], [100, 100], [0, 100], [0, 0]]
      ]);
      const comment1 = createComment(300, 0, "c1");
      const comment2 = createComment(300, 100, "c2");
      const arrow1 = createArrow(100, 0, 100, 0);
      const arrow2 = createArrow(100, 100, 100, 100);
      // arrow.properties.link[side].magnet is always Links' own stored
      // format - for a polygon target that's the bbox-relative fraction
      // (Links.add() only converts a *fresh* absolute point to that
      // fraction; re-adding straight from this already-serialized form, as
      // control.add() below does for these pre-built arrows, must not
      // convert it again). The polygon's bbox here is [0,0,100,100], so its
      // corners (100,0) and (100,100) are relative (1,0) and (1,1).
      arrow1.properties.link = {
        start: { id: comment1.id, side: "start", type: "comment", magnet: { x: -0.5, y: 0 } },
        end: { id: polygon.id, side: "end", type: "polygon", magnet: { x: 1, y: 0 } }
      };
      arrow2.properties.link = {
        start: { id: comment2.id, side: "start", type: "comment", magnet: { x: -0.5, y: 0 } },
        end: { id: polygon.id, side: "end", type: "polygon", magnet: { x: 1, y: 1 } }
      };

      control.add(polygon);
      control.add(comment1);
      control.add(comment2);
      control.add(arrow1);
      control.add(arrow2);
      // @ts-expect-error links is private
      control.links.refresh();
      // @ts-expect-error commit is private
      control.links.commit();

      control.select(polygon.id);
      // @ts-expect-error editor is private
      const handler = control.editor["handlers"].get("polygon") as {
        clientToCanvas: (evt: { clientX: number; clientY: number }) => {
          x: number;
          y: number;
        };
        hoveredHandle: unknown;
        dragStartPoint: unknown;
        dragging: boolean;
        onDrag: (evt: unknown) => void;
        onDragEnd: () => void;
      };
      handler.clientToCanvas = (evt) => ({ x: evt.clientX, y: evt.clientY });

      handler.hoveredHandle = { type: "body", point: { x: 50, y: 50 } };
      handler.dragStartPoint = { x: 50, y: 50 };
      handler.dragging = true;

      // 30 mousemove frames, each reporting the *total* displacement from
      // drag start (as real handleMouseMove events would).
      expect(() => {
        for (let i = 1; i <= 30; i++) {
          handler.onDrag({ clientX: 50, clientY: 50 + i * 10 });
        }
        handler.onDragEnd();
      }).not.toThrow();

      const c1 = control.getAnnotation(comment1.id)!.geometry as {
        coordinates: number[];
      };
      const c2 = control.getAnnotation(comment2.id)!.geometry as {
        coordinates: number[];
      };

      // Total drag delta is (0, 300) — both comments should have translated
      // by exactly that, not 30x that.
      expect(c1.coordinates[1]).toBeCloseTo(0 + 300);
      expect(c2.coordinates[1]).toBeCloseTo(100 + 300);
    });

    it("does not exceed the call stack with many comments and many drag frames", () => {
      const polygon = createPolygon([
        [[0, 0], [100, 0], [100, 100], [0, 100], [0, 0]]
      ]);
      control.add(polygon);
      for (let n = 0; n < 5; n++) {
        const comment = createComment(300 + n * 10, n * 20, `c${n}`);
        const arrow = createArrow(100, n * 20, 100, n * 20);
        arrow.properties.link = {
          start: { id: comment.id, side: "start", type: "comment", magnet: { x: -0.5, y: 0 } },
          end: { id: polygon.id, side: "end", type: "polygon", magnet: { x: 1, y: (20 * n) / 100 } }
        };
        control.add(comment);
        control.add(arrow);
      }
      // @ts-expect-error links is private
      control.links.refresh();
      // @ts-expect-error commit is private
      control.links.commit();

      control.select(polygon.id);
      // @ts-expect-error editor is private
      const handler = control.editor["handlers"].get("polygon") as {
        clientToCanvas: (evt: { clientX: number; clientY: number }) => {
          x: number;
          y: number;
        };
        hoveredHandle: unknown;
        dragStartPoint: unknown;
        dragging: boolean;
        onDrag: (evt: unknown) => void;
        onDragEnd: () => void;
      };
      handler.clientToCanvas = (evt) => ({ x: evt.clientX, y: evt.clientY });
      handler.hoveredHandle = { type: "body", point: { x: 50, y: 50 } };
      handler.dragStartPoint = { x: 50, y: 50 };
      handler.dragging = true;

      expect(() => {
        for (let i = 1; i <= 200; i++) {
          handler.onDrag({ clientX: 50 + Math.sin(i) * 5, clientY: 50 + i });
        }
        handler.onDragEnd();
      }).not.toThrow();
    });
  });
});
