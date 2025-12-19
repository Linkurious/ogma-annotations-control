import { Ogma } from "@linkurious/ogma";
import { describe, it, assert, beforeEach, afterEach } from "vitest";
import { createOgma } from "./utils";
import {
  Arrow,
  Control,
  Text,
  Box,
  Comment,
  createArrow,
  createText,
  createBox,
  createComment
} from "../../src";

describe("Updates", () => {
  let ogma: Ogma;
  let control: Control;

  beforeEach(() => {
    ogma = createOgma();
    control = new Control(ogma);
  });

  afterEach(() => {
    try {
      if (control) control.destroy();
    } catch (e) {
      // Ignore - headless mode
    }
    try {
      if (ogma) ogma.destroy();
    } catch (e) {
      // Ignore - headless mode
    }
  });

  it("should be able to update arrow stroke width via update method", () => {
    const arrow = createArrow(0, 0, 10, 10, { strokeColor: "pink" });
    control.add(arrow);

    assert.equal(arrow.properties.style?.strokeWidth, 1);

    // Update via public API
    control.update<Arrow>({
      id: arrow.id,
      properties: {
        style: {
          strokeWidth: 22
        }
      }
    });

    // Get updated arrow
    const updated = control.getAnnotation<Arrow>(arrow.id)!;
    assert.equal(updated.properties.style?.strokeWidth, 22);
    assert.equal(updated.properties.style?.strokeColor, "pink");
  });

  it("should be able to update text color via update method", () => {
    const text = createText(0, 0, 100, 50, "Hello world", { fontSize: "14px" });
    control.add(text);

    assert.equal(text.properties.style?.color, "#505050");

    // Update via public API
    control.update({
      id: text.id,
      properties: {
        style: {
          color: "pink"
        }
      }
    });

    // Get updated text
    const updated = control.getAnnotation<Text>(text.id)!;
    assert.equal(updated.properties.style?.color, "pink");
    assert.equal(updated.properties.style?.fontSize, "14px");
  });

  it("should be able to update arrow geometry coordinates", () => {
    const arrow = createArrow(0, 0, 100, 100, { strokeColor: "pink" });
    control.add(arrow);

    assert.deepEqual(arrow.geometry.coordinates, [
      [0, 0],
      [100, 100]
    ]);

    // Update coordinates via public API
    control.update({
      id: arrow.id,
      geometry: {
        type: "LineString",
        coordinates: [
          [10, 10],
          [200, 200]
        ]
      }
    });

    // Get updated arrow
    const updated = control.getAnnotation<Arrow>(arrow.id)!;
    assert.deepEqual(updated.geometry.coordinates, [
      [10, 10],
      [200, 200]
    ]);
  });

  it("should be able to update text dimensions", () => {
    const text = createText(0, 0, 100, 50, "Hello world");
    control.add(text);

    assert.equal(text.properties.width, 100);
    assert.equal(text.properties.height, 50);

    // Update dimensions via public API
    control.update({
      id: text.id,
      properties: {
        width: 200,
        height: 100
      }
    });

    // Get updated text
    const updated = control.getAnnotation<Text>(text.id)!;
    assert.equal(updated.properties.width, 200);
    assert.equal(updated.properties.height, 100);
  });

  it("should update both geometry and properties simultaneously", () => {
    const arrow = createArrow(0, 0, 100, 100, { strokeColor: "blue" });
    control.add(arrow);

    const newCoordinates = [
      [50, 50],
      [150, 150]
    ] as [number, number][];

    control.update({
      id: arrow.id,
      geometry: {
        type: "LineString",
        coordinates: newCoordinates
      },
      properties: {
        style: {
          strokeColor: "green",
          strokeWidth: 5
        }
      }
    });

    const updated = control.getAnnotation<Arrow>(arrow.id)!;
    assert.deepEqual(updated.geometry.coordinates, newCoordinates);
    assert.equal(updated.properties.style?.strokeColor, "green");
    assert.equal(updated.properties.style?.strokeWidth, 5);
  });

  it("should update text content", () => {
    const text = createText(0, 0, 100, 50, "Original text");
    control.add(text);

    control.update({
      id: text.id,
      properties: {
        content: "Updated text content"
      }
    });

    const updated = control.getAnnotation<Text>(text.id)!;
    assert.equal(updated.properties.content, "Updated text content");
    assert.equal(updated.properties.width, 100); // Should preserve other properties
    assert.equal(updated.properties.height, 50);
  });

  it("should update box dimensions and style", () => {
    const box = createBox(0, 0, 100, 50, { background: "yellow" });
    control.add(box);

    control.update({
      id: box.id,
      properties: {
        width: 150,
        height: 75,
        style: {
          background: "red",
          strokeColor: "black"
        }
      }
    });

    const updated = control.getAnnotation<Box>(box.id)!;
    assert.equal(updated.properties.width, 150);
    assert.equal(updated.properties.height, 75);
    assert.equal(updated.properties.style?.background, "red");
    assert.equal(updated.properties.style?.strokeColor, "black");
  });

  it("should update comment content and mode", () => {
    const comment = createComment(50, 50, "Original comment");
    control.add(comment);

    control.update({
      id: comment.id,
      properties: {
        content: "Updated comment",
        mode: "collapsed"
      }
    });

    const updated = control.getAnnotation<Comment>(comment.id)!;
    assert.equal(updated.properties.content, "Updated comment");
    assert.equal(updated.properties.mode, "collapsed");
  });

  it("should handle updating non-existent annotation gracefully", () => {
    const result = control.update({
      id: "non-existent-id",
      properties: {
        style: { strokeColor: "red" }
      }
    });

    // Should return this for chaining
    assert.equal(result, control);

    // Should not throw an error
    const annotation = control.getAnnotation("non-existent-id");
    assert.isUndefined(annotation);
  });

  it("should return this for method chaining", () => {
    const arrow = createArrow(0, 0, 100, 100);
    control.add(arrow);

    const result = control.update({
      id: arrow.id,
      properties: {
        style: { strokeColor: "purple" }
      }
    });

    assert.equal(result, control);
  });

  it("should preserve existing properties when partially updating", () => {
    const text = createText(0, 0, 100, 50, "Test text", {
      color: "blue",
      fontSize: "14px"
    });
    control.add(text);

    // Update only one style property
    control.update({
      id: text.id,
      properties: {
        style: {
          color: "red"
        }
      }
    });

    const updated = control.getAnnotation<Text>(text.id)!;
    assert.equal(updated.properties.style?.color, "red");
    // Other style properties should be preserved
    assert.equal(updated.properties.style?.fontSize, "14px");
    // Non-style properties should be preserved
    assert.equal(updated.properties.content, "Test text");
    assert.equal(updated.properties.width, 100);
    assert.equal(updated.properties.height, 50);
  });
});
