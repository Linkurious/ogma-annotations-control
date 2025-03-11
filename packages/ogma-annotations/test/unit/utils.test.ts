import { describe, it, assert } from "vitest";
import { AnnotationCollection, getAnnotationsBounds } from "../../src";

import Set1 from "../fixtures/set1.json";

describe("Utils", () => {
  it("getAnnotationsBounds one arrow", () => {
    const arrow = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          id: 2,
          properties: {
            type: "arrow"
          },
          geometry: {
            type: "LineString",
            coordinates: [
              [0, 0],
              [50, 50]
            ]
          }
        }
      ]
    } as AnnotationCollection;
    const bounds = getAnnotationsBounds(arrow);
    assert.deepEqual(bounds, [0, 0, 50, 50]);
  });

  it("getAnnotationsBounds two arrows", () => {
    const arrows = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          id: 2,
          properties: {
            type: "arrow"
          },
          geometry: {
            type: "LineString",
            coordinates: [
              [0, 0],
              [50, 50]
            ]
          }
        },
        {
          type: "Feature",
          id: 3,
          properties: {
            type: "arrow"
          },
          geometry: {
            type: "LineString",
            coordinates: [
              [10, 10],
              [100, 100]
            ]
          }
        }
      ]
    } as AnnotationCollection;
    const bounds = getAnnotationsBounds(arrows);
    assert.deepEqual(bounds, [0, 0, 100, 100]);
  });

  it("getAnnotationsBounds one text", () => {
    const text = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          id: 2,
          properties: {
            type: "text"
          },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [0, 0],
                [50, 0],
                [50, 50],
                [0, 50],
                [0, 0]
              ]
            ]
          }
        }
      ]
    } as AnnotationCollection;
    const bounds = getAnnotationsBounds(text);
    assert.deepEqual(bounds, [0, 0, 50, 50]);
  });

  it("getAnnotationsBounds two texts", () => {
    const texts = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          id: 2,
          properties: {
            type: "text"
          },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [0, 0],
                [50, 0],
                [50, 50],
                [0, 50],
                [0, 0]
              ]
            ]
          }
        },
        {
          type: "Feature",
          id: 3,
          properties: {
            type: "text"
          },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [10, 10],
                [100, 10],
                [100, 100],
                [10, 100],
                [10, 10]
              ]
            ]
          }
        }
      ]
    } as AnnotationCollection;
    const bounds = getAnnotationsBounds(texts);
    assert.deepEqual(bounds, [0, 0, 100, 100]);
  });

  it("getAnnotationsBounds mixed", () => {
    const mixed = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          id: 2,
          properties: {
            type: "text"
          },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [0, 0],
                [50, 0],
                [50, 50],
                [0, 50],
                [0, 0]
              ]
            ]
          }
        },
        {
          type: "Feature",
          id: 3,
          properties: {
            type: "arrow"
          },
          geometry: {
            type: "LineString",
            coordinates: [
              [10, 10],
              [100, 100]
            ]
          }
        }
      ]
    } as AnnotationCollection;
    const bounds = getAnnotationsBounds(mixed);
    assert.deepEqual(bounds, [0, 0, 100, 100]);
  });

  it("real dataset", () => {
    const bounds = getAnnotationsBounds(Set1 as AnnotationCollection);
    assert.deepEqual(
      bounds.map((n) => Math.floor(n)),
      [-1056, -401, 865, 600]
    );
  });
});
