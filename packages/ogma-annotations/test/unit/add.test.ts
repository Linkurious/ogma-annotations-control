import { Ogma } from "@linkurious/ogma";
import { describe, it, assert, beforeEach } from "vitest";
import { createOgma } from "./utils";
import { Control, Text } from "../../src";

describe("text-annotations", () => {
  let ogma: Ogma;
  let control: Control;
  beforeEach(() => {
    ogma = createOgma();
    control = new Control(ogma);
    // Clear any features that leaked from previous tests
    // This is a workaround for state isolation issues
    const existingFeatures = control.getAnnotations().features;
    if (existingFeatures.length > 0) {
      control.remove({ type: "FeatureCollection", features: existingFeatures });
    }
  });

  it("should expose the control", () => {
    assert.isDefined(Control);
  });

  it("should be able to create a control instance", () => {
    assert.isDefined(control);
    assert.isFunction(control.add);
  });

  it("should be able to add an arrow", () => {
    control.add({
      type: "Feature",
      id: "arrow-test-1",
      properties: {
        type: "arrow"
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [1, 1]
        ]
      }
    });
    assert.equal(control.getAnnotations().features.length, 1);
  });

  it("should be able to add a text", () => {
    const before = control.getAnnotations().features.length;
    control.add({
      type: "Feature",
      id: "text-test-1",
      properties: {
        type: "text",
        content: "Hello world",
        width: 100,
        height: 50,
        style: {
          fontSize: "12px",
          font: "Arial",
          color: "#000000"
        }
      },
      geometry: {
        type: "Point",
        coordinates: [50, 25],
        bbox: [0, 0, 100, 50]
      }
    });
    const after = control.getAnnotations().features.length;
    assert.equal(
      before,
      0,
      `Before adding: expected 0 features, found ${before}`
    );
    assert.equal(after, 1, `After adding: expected 1 feature, found ${after}`);
  });

  it("should be able to add a collection", () => {
    control.add({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          id: "text-test-2",
          properties: {
            type: "text",
            content: "Hello world",
            width: 100,
            height: 50
          },
          geometry: {
            type: "Point",
            coordinates: [50, 25]
          }
        },
        {
          type: "Feature",
          id: "arrow-test-2",
          properties: {
            type: "arrow",
            style: {}
          },
          geometry: {
            type: "LineString",
            coordinates: [
              [0, 0],
              [1, 1]
            ]
          }
        }
      ]
    });
    assert.equal(control.getAnnotations().features.length, 2);
  });

  it("should be able to remove an arrow", () => {
    control.add({
      type: "Feature",
      id: "arrow-test-3",
      properties: {
        type: "arrow"
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [1, 1]
        ]
      }
    });
    const annotations = control.getAnnotations();
    assert.equal(annotations.features.length, 1);

    control.remove(annotations.features[0]);

    assert.equal(control.getAnnotations().features.length, 0);
  });

  it("should migrate old Polygon-based text to Point geometry", () => {
    // Add a text using the old Polygon format
    control.add({
      type: "Feature",
      id: "old-text-1",
      // @ts-expect-error testing migration from old format
      properties: {
        type: "text",
        content: "Old format text"
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [10, 20],
            [110, 20],
            [110, 70],
            [10, 70],
            [10, 20]
          ]
        ]
      }
    });

    const annotations = control.getAnnotations();
    assert.equal(annotations.features.length, 1);

    const text = annotations.features[0] as Text;

    // Should be migrated to Point geometry
    assert.equal(text.geometry.type, "Point");

    // Should have correct center coordinates
    // Original bbox: [10, 20, 110, 70]
    // Width: 100, Height: 50
    // Center: [60, 45]
    assert.deepEqual(text.geometry.coordinates, [60, 45]);

    // Should have width and height properties
    assert.equal(text.properties.width, 100);
    assert.equal(text.properties.height, 50);

    // Should preserve content
    assert.equal(text.properties.content, "Old format text");

    // Should have correct bbox
    assert.deepEqual(text.geometry.bbox, [10, 20, 110, 70]);
  });
});
