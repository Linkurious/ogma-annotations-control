import Ogma from "@linkurious/ogma";
import { describe, it, assert, beforeEach, afterAll } from "vitest";
import { Control } from "../../src";
import { createOgma } from "./utils";

describe("text-annotations", () => {
  let ogma: Ogma;
  let control: Control;
  beforeEach(() => {
    ogma = createOgma();
    control = new Control(ogma);
  });
  afterAll(() => {
    control.destroy();
    return ogma.destroy();
  });

  it("should expose the control", () => {
    assert.isDefined(Control);
  });

  it("should be able to create a control instance", () => {
    assert.isDefined(control);
    assert.isFunction(control.add);
    return Promise.resolve().then(() => ogma.destroy());
  });

  it("should be able to add an arrow", () => {
    control.add({
      type: "Feature",
      id: 0,
      properties: {
        type: "arrow",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [1, 1],
        ],
      },
    });
    assert.equal(control.getAnnotations().features.length, 1);
  });

  it("should be able to add a text", () => {
    control.add({
      type: "Feature",
      id: 0,
      properties: {
        type: "text",
        content: "Hello world",
        style: {
          fontSize: "12px",
          font: "Arial",
          color: "#000000",
        },
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
      },
    });
    assert.equal(control.getAnnotations().features.length, 1);
  });

  it("should be able to add a collection", () => {
    control.add({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          id: 0,
          properties: {
            type: "text",
            content: "Hello world",
          },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 1],
                [0, 0],
              ],
            ],
          },
        },
        {
          type: "Feature",
          id: 1,
          properties: {
            type: "arrow",
            style: {},
          },
          geometry: {
            type: "LineString",
            coordinates: [
              [0, 0],
              [1, 1],
            ],
          },
        },
      ],
    });
    assert.equal(control.getAnnotations().features.length, 2);
  });

  it("should be able to remove an arrow", () => {
    const ogma = createOgma();
    ogma.addNode({ id: "node1" });
    const control = new Control(ogma);
    control.add({
      type: "Feature",
      id: 0,
      properties: {
        type: "arrow",
        link: {
          start: {
            id: "node1",
            side: "start",
            type: "node",
          },
        },
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [1, 1],
        ],
      },
    });
    control.remove(control.getAnnotation(0)!);
    assert.equal(control.getAnnotations().features.length, 0);
    // @ts-expect-error
    assert.equal(control.links.getArrowLink(0, "start"), null);
  });
});
