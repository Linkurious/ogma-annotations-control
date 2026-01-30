import { describe, it, assert } from "vitest";
import { createArrow, createText, createBox } from "../../src";

describe("Helpers", () => {
  describe("createText", () => {
    it("should create text feature with Point geometry", () => {
      const text = createText(0, 0, 100, 200, "Hello world", {
        fontSize: "12px",
        strokeColor: "magenta"
      });

      // Properties
      assert.equal(text.properties.type, "text");
      assert.equal(text.properties.content, "Hello world");
      assert.equal(text.properties.width, 100);
      assert.equal(text.properties.height, 200);

      // Style
      assert.equal(text.properties.style?.fontSize, "12px");
      assert.equal(text.properties.style?.strokeColor, "magenta");

      // Geometry - now uses Point instead of Polygon
      assert.equal(text.geometry.type, "Point");

      // Center coordinates: x + width/2, y + height/2
      // (0, 0) with 100x200 => center at (50, 100)
      assert.deepEqual(text.geometry.coordinates, [50, 100]);

      // Bbox: [x, y, x + width, y + height]
      assert.deepEqual(text.geometry.bbox, [0, 0, 100, 200]);

      // Should have an ID
      assert.isDefined(text.id);
      assert.isString(text.id);
    });

    it("should create text with default values", () => {
      const text = createText();

      assert.equal(text.properties.type, "text");
      assert.equal(text.properties.content, "");
      assert.equal(text.properties.width, 100);
      assert.equal(text.properties.height, 50);

      // Default position (0, 0)
      assert.deepEqual(text.geometry.coordinates, [50, 25]);
      assert.deepEqual(text.geometry.bbox, [0, 0, 100, 50]);
    });

    it("should apply default text style", () => {
      const text = createText(10, 20, 80, 40, "Test");

      assert.equal(text.properties.style?.font, "sans-serif");
      assert.equal(text.properties.style?.fontSize, 18);
      assert.equal(text.properties.style?.color, "#505050");
      assert.equal(text.properties.style?.background, "#f5f5f5");
      assert.equal(text.properties.style?.padding, 16);
      assert.equal(text.properties.style?.borderRadius, 8);
      assert.equal(text.properties.style?.fixedSize, false);
    });

    it("should override default style with custom style", () => {
      const text = createText(0, 0, 100, 50, "Custom", {
        fontSize: "24px",
        color: "red",
        fixedSize: true
      });

      assert.equal(text.properties.style?.fontSize, "24px");
      assert.equal(text.properties.style?.color, "red");
      assert.equal(text.properties.style?.fixedSize, true);
      // Other defaults should still apply
      assert.equal(text.properties.style?.font, "sans-serif");
    });
  });

  describe("createArrow", () => {
    it("should create arrow feature with LineString geometry", () => {
      const arrow = createArrow(0, 0, 100, 200, {
        strokeColor: "magenta",
        strokeWidth: 3
      });

      // Properties
      assert.equal(arrow.properties.type, "arrow");
      assert.equal(arrow.properties.style?.strokeColor, "magenta");
      assert.equal(arrow.properties.style?.strokeWidth, 3);

      // Geometry
      assert.equal(arrow.geometry.type, "LineString");
      assert.equal(arrow.geometry.coordinates.length, 2);

      // Coordinates
      assert.deepEqual(arrow.geometry.coordinates[0], [0, 0]);
      assert.deepEqual(arrow.geometry.coordinates[1], [100, 200]);

      // Should have an ID
      assert.isDefined(arrow.id);
      assert.isString(arrow.id);
    });

    it("should create arrow with default values", () => {
      const arrow = createArrow();

      assert.equal(arrow.properties.type, "arrow");

      // Default coordinates
      assert.deepEqual(arrow.geometry.coordinates[0], [0, 0]);
      assert.deepEqual(arrow.geometry.coordinates[1], [0, 0]);
    });

    it("should apply default arrow style", () => {
      const arrow = createArrow(10, 20, 50, 60);

      assert.equal(arrow.properties.style?.strokeColor, "#202020");
      assert.equal(arrow.properties.style?.strokeWidth, 1);
      assert.equal(arrow.properties.style?.strokeType, "plain");
      assert.equal(arrow.properties.style?.head, "none");
      assert.equal(arrow.properties.style?.tail, "none");
    });

    it("should override default style with custom style", () => {
      const arrow = createArrow(0, 0, 100, 100, {
        strokeColor: "blue",
        strokeWidth: 5,
        head: "dot",
        tail: "arrow-plain"
      });

      assert.equal(arrow.properties.style?.strokeColor, "blue");
      assert.equal(arrow.properties.style?.strokeWidth, 5);
      assert.equal(arrow.properties.style?.head, "dot");
      assert.equal(arrow.properties.style?.tail, "arrow-plain");
      // Other defaults should still apply
      assert.equal(arrow.properties.style?.strokeType, "plain");
    });
  });

  describe("createBox", () => {
    it("should create box feature with Point geometry", () => {
      const box = createBox(10, 20, 80, 60, {
        strokeColor: "blue",
        strokeWidth: 2
      });

      // Properties
      assert.equal(box.properties.type, "box");
      assert.equal(box.properties.width, 80);
      assert.equal(box.properties.height, 60);

      // Style
      assert.equal(box.properties.style?.strokeColor, "blue");
      assert.equal(box.properties.style?.strokeWidth, 2);

      // Geometry - uses Point like Text
      assert.equal(box.geometry.type, "Point");

      // Center coordinates: x + width/2, y + height/2
      // (10, 20) with 80x60 => center at (50, 50)
      assert.deepEqual(box.geometry.coordinates, [50, 50]);

      // Should have an ID
      assert.isDefined(box.id);
      assert.isString(box.id);
    });

    it("should create box with default values", () => {
      const box = createBox();

      assert.equal(box.properties.type, "box");
      assert.equal(box.properties.width, 100);
      assert.equal(box.properties.height, 50);

      // Default position (0, 0)
      assert.deepEqual(box.geometry.coordinates, [50, 25]);
    });

    it("should apply default box style", () => {
      const box = createBox(0, 0, 100, 50);

      assert.equal(box.properties.style?.background, "#f5f5f5");
      assert.equal(box.properties.style?.strokeWidth, 0);
      assert.equal(box.properties.style?.strokeType, "plain");
      assert.equal(box.properties.style?.borderRadius, 8);
      assert.equal(box.properties.style?.padding, 16);
    });

    it("should override default style with custom style", () => {
      const box = createBox(0, 0, 100, 50, {
        strokeColor: "red",
        strokeWidth: 3,
        strokeType: "dashed"
      });

      assert.equal(box.properties.style?.strokeColor, "red");
      assert.equal(box.properties.style?.strokeWidth, 3);
      assert.equal(box.properties.style?.strokeType, "dashed");
    });
  });
});
