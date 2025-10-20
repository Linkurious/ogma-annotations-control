import {
  Feature,
  FeatureCollection,
  GeometryCollection,
  MultiLineString,
  MultiPoint,
  MultiPolygon,
  Point
} from "geojson";
import { describe, it, assert } from "vitest";
import {
  AnnotationCollection,
  getAnnotationsBounds,
  getCoordinates
} from "../../src";

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
            type: "text",
            width: 50,
            height: 50,
            content: ""
          },
          geometry: {
            type: "Point",
            coordinates: [25, 25],
            bbox: [0, 0, 50, 50]
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
            type: "text",
            width: 50,
            height: 50,
            content: ""
          },
          geometry: {
            type: "Point",
            coordinates: [25, 25],
            bbox: [0, 0, 50, 50]
          }
        },
        {
          type: "Feature",
          id: 3,
          properties: {
            type: "text",
            width: 90,
            height: 90,
            content: ""
          },
          geometry: {
            type: "Point",
            coordinates: [55, 55],
            bbox: [10, 10, 100, 100]
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
            type: "text",
            width: 50,
            height: 50,
            content: ""
          },
          geometry: {
            type: "Point",
            coordinates: [25, 25],
            bbox: [0, 0, 50, 50]
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
describe("getCoordinates", () => {
  it("handles Point geometry", () => {
    const point = {
      type: "Point",
      coordinates: [10, 20]
    } as Point;
    const coords = getCoordinates(point);
    assert.deepEqual(coords, [[10, 20]]);
  });

  it("handles MultiPoint geometry", () => {
    const multiPoint = {
      type: "MultiPoint",
      coordinates: [
        [0, 0],
        [10, 10],
        [20, 20]
      ]
    } as MultiPoint;
    const coords = getCoordinates(multiPoint);
    assert.deepEqual(coords, [
      [0, 0],
      [10, 10],
      [20, 20]
    ]);
  });

  it("handles MultiLineString geometry", () => {
    const multiLineString = {
      type: "MultiLineString",
      coordinates: [
        [
          [0, 0],
          [10, 10]
        ],
        [
          [20, 20],
          [30, 30]
        ]
      ]
    } as MultiLineString;
    const coords = getCoordinates(multiLineString);
    assert.deepEqual(coords, [
      [0, 0],
      [10, 10],
      [20, 20],
      [30, 30]
    ]);
  });

  it("handles MultiPolygon geometry", () => {
    const multiPolygon = {
      type: "MultiPolygon",
      coordinates: [
        [
          [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
            [0, 0]
          ]
        ],
        [
          [
            [20, 20],
            [30, 20],
            [30, 30],
            [20, 30],
            [20, 20]
          ]
        ]
      ]
    } as MultiPolygon;
    const coords = getCoordinates(multiPolygon);
    assert.deepEqual(coords, [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
      [0, 0],
      [20, 20],
      [30, 20],
      [30, 30],
      [20, 30],
      [20, 20]
    ]);
  });

  it("handles GeometryCollection", () => {
    const geometryCollection = {
      type: "GeometryCollection",
      geometries: [
        {
          type: "Point",
          coordinates: [0, 0]
        },
        {
          type: "LineString",
          coordinates: [
            [10, 10],
            [20, 20]
          ]
        }
      ]
    } as GeometryCollection;
    const coords = getCoordinates(geometryCollection);
    assert.deepEqual(coords, [
      [0, 0],
      [10, 10],
      [20, 20]
    ]);
  });

  it("handles empty FeatureCollection", () => {
    const emptyCollection = {
      type: "FeatureCollection",
      features: []
    } as FeatureCollection;
    const coords = getCoordinates(emptyCollection);
    assert.deepEqual(coords, []);
  });

  it("handles nested Feature with Point", () => {
    const feature = {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [5, 5]
      },
      properties: {}
    } as Feature<Point>;
    const coords = getCoordinates(feature);
    assert.deepEqual(coords, [[5, 5]]);
  });
});
