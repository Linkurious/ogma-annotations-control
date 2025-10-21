import Ogma from "@linkurious/ogma";
import { describe, it, assert, beforeEach, afterEach } from "vitest";
import { createOgma } from "./utils";
import { Control, createArrow, createText, createBox } from "../../src";

describe("Control.setScale", () => {
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

  describe("Arrow scaling", () => {
    it("should scale arrow coordinates around origin (0,0)", () => {
      const arrow = createArrow(0, 0, 100, 100);
      const addedCollection = control.add(arrow);
      const addedArrow = addedCollection.getAnnotations().features[0];

      assert.deepEqual(addedArrow.geometry.coordinates, [
        [0, 0],
        [100, 100]
      ]);

      control.setScale(addedArrow.id, 2, 0, 0);

      const annotations = control.getAnnotations();
      const scaled = annotations.features.find((f) => f.id === addedArrow.id);

      assert.deepEqual(scaled?.geometry.coordinates, [
        [0, 0],
        [200, 200]
      ]);
    });

    it("should scale arrow coordinates around custom origin", () => {
      const arrow = createArrow(10, 10, 50, 50);
      const addedCollection = control.add(arrow);
      const addedArrow = addedCollection.getAnnotations().features[0];

      // Scale by 2x around origin (10, 10)
      // Start point (10, 10): dx=0, dy=0 -> stays at (10, 10)
      // End point (50, 50): dx=40, dy=40 -> becomes (10 + 80, 10 + 80) = (90, 90)
      control.setScale(addedArrow.id, 2, 10, 10);

      const annotations = control.getAnnotations();
      const scaled = annotations.features.find((f) => f.id === addedArrow.id);

      assert.deepEqual(scaled?.geometry.coordinates, [
        [10, 10],
        [90, 90]
      ]);
    });

    it("should scale arrow down with scale factor < 1", () => {
      const arrow = createArrow(0, 0, 100, 100);
      const addedCollection = control.add(arrow);
      const addedArrow = addedCollection.getAnnotations().features[0];

      control.setScale(addedArrow.id, 0.5, 0, 0);

      const annotations = control.getAnnotations();
      const scaled = annotations.features.find((f) => f.id === addedArrow.id);

      assert.deepEqual(scaled?.geometry.coordinates, [
        [0, 0],
        [50, 50]
      ]);
    });

    it("should handle negative coordinates", () => {
      const arrow = createArrow(-50, -50, 50, 50);
      const addedCollection = control.add(arrow);
      const addedArrow = addedCollection.getAnnotations().features[0];

      control.setScale(addedArrow.id, 2, 0, 0);

      const annotations = control.getAnnotations();
      const scaled = annotations.features.find((f) => f.id === addedArrow.id);

      assert.deepEqual(scaled?.geometry.coordinates, [
        [-100, -100],
        [100, 100]
      ]);
    });
  });

  describe("Text scaling", () => {
    it("should scale text dimensions and position around origin (0,0)", () => {
      const text = createText(0, 0, 100, 50, "Hello");
      const addedCollection = control.add(text);
      const addedText = addedCollection.getAnnotations().features[0];

      assert.equal(addedText.properties.width, 100);
      assert.equal(addedText.properties.height, 50);
      assert.deepEqual(addedText.geometry.coordinates, [50, 25]); // center

      control.setScale(addedText.id, 2, 0, 0);

      const annotations = control.getAnnotations();
      const scaled = annotations.features.find((f) => f.id === addedText.id);

      assert.equal(scaled?.properties.width, 200);
      assert.equal(scaled?.properties.height, 100);
      assert.deepEqual(scaled?.geometry.coordinates, [100, 50]); // scaled center
    });

    it("should scale text around custom origin", () => {
      // Text at (100, 100) with size 100x50
      // Center is at (150, 125)
      const text = createText(100, 100, 100, 50, "Hello");
      const addedCollection = control.add(text);
      const addedText = addedCollection.getAnnotations().features[0];

      // Scale by 2x around origin (100, 100)
      // Center (150, 125): dx=50, dy=25 -> new center at (100 + 100, 100 + 50) = (200, 150)
      control.setScale(addedText.id, 2, 100, 100);

      const annotations = control.getAnnotations();
      const scaled = annotations.features.find((f) => f.id === addedText.id);

      assert.equal(scaled?.properties.width, 200);
      assert.equal(scaled?.properties.height, 100);
      assert.deepEqual(scaled?.geometry.coordinates, [200, 150]);
    });

    it("should update text position and dimensions when scaling", () => {
      const text = createText(0, 0, 100, 50, "Hello");
      const addedCollection = control.add(text);
      const addedText = addedCollection.getAnnotations().features[0];

      // Initial state: center at (50, 25), size 100x50
      assert.deepEqual(addedText.geometry.coordinates, [50, 25]);
      assert.equal(addedText.properties.width, 100);
      assert.equal(addedText.properties.height, 50);

      control.setScale(addedText.id, 2, 0, 0);

      const annotations = control.getAnnotations();
      const scaled = annotations.features.find((f) => f.id === addedText.id);

      // After scaling by 2x around (0,0):
      // - New center: (100, 50)
      // - New dimensions: 200x100
      assert.deepEqual(scaled?.geometry.coordinates, [100, 50]);
      assert.equal(scaled?.properties.width, 200);
      assert.equal(scaled?.properties.height, 100);
    });

    it("should scale text down with scale factor < 1", () => {
      const text = createText(0, 0, 100, 50, "Hello");
      const addedCollection = control.add(text);
      const addedText = addedCollection.getAnnotations().features[0];

      control.setScale(addedText.id, 0.5, 0, 0);

      const annotations = control.getAnnotations();
      const scaled = annotations.features.find((f) => f.id === addedText.id);

      assert.equal(scaled?.properties.width, 50);
      assert.equal(scaled?.properties.height, 25);
      assert.deepEqual(scaled?.geometry.coordinates, [25, 12.5]);
    });

    it("should preserve text content when scaling", () => {
      const text = createText(0, 0, 100, 50, "Hello World");
      const addedCollection = control.add(text);
      const addedText = addedCollection.getAnnotations().features[0];

      control.setScale(addedText.id, 2, 0, 0);

      const annotations = control.getAnnotations();
      const scaled = annotations.features.find((f) => f.id === addedText.id);

      assert.equal(scaled?.properties.content, "Hello World");
    });

    it("should preserve text style when scaling", () => {
      const text = createText(0, 0, 100, 50, "Hello", {
        color: "red",
        fontSize: "16px",
        font: "Arial"
      });
      const addedCollection = control.add(text);
      const addedText = addedCollection.getAnnotations().features[0];

      control.setScale(addedText.id, 2, 0, 0);

      const annotations = control.getAnnotations();
      const scaled = annotations.features.find((f) => f.id === addedText.id);

      assert.equal(scaled?.properties.style?.color, "red");
      assert.equal(scaled?.properties.style?.fontSize, "16px");
      assert.equal(scaled?.properties.style?.font, "Arial");
    });
  });

  describe("Box scaling", () => {
    it("should scale box dimensions and position", () => {
      const box = createBox(0, 0, 100, 50);
      const addedCollection = control.add(box);
      const addedBox = addedCollection.getAnnotations().features[0];

      assert.equal(addedBox.properties.width, 100);
      assert.equal(addedBox.properties.height, 50);

      control.setScale(addedBox.id, 2, 0, 0);

      const annotations = control.getAnnotations();
      const scaled = annotations.features.find((f) => f.id === addedBox.id);

      assert.equal(scaled?.properties.width, 200);
      assert.equal(scaled?.properties.height, 100);
    });

    it("should preserve box style when scaling", () => {
      const box = createBox(0, 0, 100, 50, {
        background: "blue",
        strokeColor: "red",
        strokeWidth: 2
      });
      const addedCollection = control.add(box);
      const addedBox = addedCollection.getAnnotations().features[0];

      control.setScale(addedBox.id, 2, 0, 0);

      const annotations = control.getAnnotations();
      const scaled = annotations.features.find((f) => f.id === addedBox.id);

      assert.equal(scaled?.properties.style?.background, "blue");
      assert.equal(scaled?.properties.style?.strokeColor, "red");
      assert.equal(scaled?.properties.style?.strokeWidth, 2);
    });
  });

  describe("Edge cases", () => {
    it("should return this when scaling non-existent annotation", () => {
      const result = control.setScale("non-existent-id", 2, 0, 0);
      assert.equal(result, control);
    });

    it("should handle scale factor of 1 (no change)", () => {
      const arrow = createArrow(10, 20, 30, 40);
      const addedCollection = control.add(arrow);
      const addedArrow = addedCollection.getAnnotations().features[0];

      control.setScale(addedArrow.id, 1, 0, 0);

      const annotations = control.getAnnotations();
      const scaled = annotations.features.find((f) => f.id === addedArrow.id);

      assert.deepEqual(scaled?.geometry.coordinates, [
        [10, 20],
        [30, 40]
      ]);
    });

    it("should handle scale factor of 0", () => {
      const arrow = createArrow(10, 20, 30, 40);
      const addedCollection = control.add(arrow);
      const addedArrow = addedCollection.getAnnotations().features[0];

      control.setScale(addedArrow.id, 0, 0, 0);

      const annotations = control.getAnnotations();
      const scaled = annotations.features.find((f) => f.id === addedArrow.id);

      // All points should collapse to origin
      assert.deepEqual(scaled?.geometry.coordinates, [
        [0, 0],
        [0, 0]
      ]);
    });

    it("should support method chaining", () => {
      const arrow = createArrow(0, 0, 10, 10);
      const addedCollection = control.add(arrow);
      const addedArrow = addedCollection.getAnnotations().features[0];

      const result = control
        .setScale(addedArrow.id, 2, 0, 0)
        .setScale(addedArrow.id, 0.5, 0, 0);

      assert.equal(result, control);

      const annotations = control.getAnnotations();
      const scaled = annotations.features.find((f) => f.id === addedArrow.id);

      // 2x then 0.5x should return to original
      assert.deepEqual(scaled?.geometry.coordinates, [
        [0, 0],
        [10, 10]
      ]);
    });
  });

  describe("History and undo", () => {
    it("should create history entry when scaling", () => {
      const arrow = createArrow(0, 0, 10, 10);
      const addedCollection = control.add(arrow);
      const addedArrow = addedCollection.getAnnotations().features[0];

      control.clearHistory();
      assert.equal(control.canUndo(), false);

      control.setScale(addedArrow.id, 2, 0, 0);

      assert.equal(control.canUndo(), true);
    });

    it("should allow undoing scale operation", () => {
      const arrow = createArrow(0, 0, 100, 100);
      const addedCollection = control.add(arrow);
      const addedArrow = addedCollection.getAnnotations().features[0];

      control.setScale(addedArrow.id, 2, 0, 0);

      let annotations = control.getAnnotations();
      let scaled = annotations.features.find((f) => f.id === addedArrow.id);
      assert.deepEqual(scaled?.geometry.coordinates, [
        [0, 0],
        [200, 200]
      ]);

      control.undo();

      annotations = control.getAnnotations();
      scaled = annotations.features.find((f) => f.id === addedArrow.id);
      assert.deepEqual(scaled?.geometry.coordinates, [
        [0, 0],
        [100, 100]
      ]);
    });

    it("should allow redoing scale operation", () => {
      const arrow = createArrow(0, 0, 100, 100);
      const addedCollection = control.add(arrow);
      const addedArrow = addedCollection.getAnnotations().features[0];

      control.setScale(addedArrow.id, 2, 0, 0);
      control.undo();

      assert.equal(control.canRedo(), true);

      control.redo();

      const annotations = control.getAnnotations();
      const scaled = annotations.features.find((f) => f.id === addedArrow.id);
      assert.deepEqual(scaled?.geometry.coordinates, [
        [0, 0],
        [200, 200]
      ]);
    });
  });
});
