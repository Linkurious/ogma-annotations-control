import { Ogma } from "@linkurious/ogma";
import { describe, it, assert, beforeEach, afterEach } from "vitest";
import { createOgma } from "./utils";
import {
  Control,
  createArrow,
  createText,
  createBox,
  Arrow,
  Text,
  Box
} from "../../src";

describe("Control.updateStyle", () => {
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

  describe("Arrow style updates", () => {
    it("should update arrow stroke width", () => {
      const arrow = createArrow(0, 0, 10, 10, { strokeColor: "pink" });
      const addedCollection = control.add(arrow);
      const addedArrow = addedCollection.getAnnotations().features[0];

      assert.equal(addedArrow.properties.style?.strokeWidth, 1);

      control.updateStyle(addedArrow.id, { strokeWidth: 5 });

      const updated = control.getAnnotation<Arrow>(addedArrow.id)!;

      assert.equal(updated?.properties.style?.strokeWidth, 5);
      // Other properties should be preserved
      assert.equal(updated?.properties.style?.strokeColor, "pink");
    });

    it("should update arrow stroke color", () => {
      const arrow = createArrow(0, 0, 10, 10);
      const addedCollection = control.add(arrow);
      const addedArrow = addedCollection.getAnnotations().features[0];

      control.updateStyle(addedArrow.id, { strokeColor: "blue" });

      const updated = control.getAnnotation<Arrow>(addedArrow.id)!;

      assert.equal(updated?.properties.style?.strokeColor, "blue");
    });

    it("should update arrow stroke type", () => {
      const arrow = createArrow(0, 0, 10, 10);
      const addedCollection = control.add(arrow);
      const addedArrow = addedCollection.getAnnotations().features[0];

      control.updateStyle(addedArrow.id, { strokeType: "dashed" });

      const updated = control.getAnnotation<Arrow>(addedArrow.id)!;

      assert.equal(updated?.properties.style?.strokeType, "dashed");
    });

    it("should update arrow head and tail", () => {
      const arrow = createArrow(0, 0, 10, 10);
      const addedCollection = control.add(arrow);
      const addedArrow = addedCollection.getAnnotations().features[0];

      control.updateStyle(addedArrow.id, {
        head: "arrow-plain",
        tail: "dot"
      });

      const updated = control.getAnnotation<Arrow>(addedArrow.id)!;

      assert.equal(updated?.properties.style?.head, "arrow-plain");
      assert.equal(updated?.properties.style?.tail, "dot");
    });

    it("should update multiple arrow style properties at once", () => {
      const arrow = createArrow(0, 0, 10, 10);
      const addedCollection = control.add(arrow);
      const addedArrow = addedCollection.getAnnotations().features[0];

      control.updateStyle(addedArrow.id, {
        strokeColor: "red",
        strokeWidth: 3,
        strokeType: "dashed",
        head: "dot",
        tail: "arrow"
      });

      const updated = control.getAnnotation<Arrow>(addedArrow.id)!;

      assert.equal(updated?.properties.style?.strokeColor, "red");
      assert.equal(updated?.properties.style?.strokeWidth, 3);
      assert.equal(updated?.properties.style?.strokeType, "dashed");
      assert.equal(updated?.properties.style?.head, "dot");
      assert.equal(updated?.properties.style?.tail, "arrow");
    });
  });

  describe("Text style updates", () => {
    it("should update text color", () => {
      const text = createText(0, 0, 100, 50, "Hello world");
      control.add(text);
      const addedText = control.getAnnotations().features[0] as Text;

      assert.equal(addedText.properties.style?.color, "#505050");

      control.updateStyle(addedText.id, { color: "pink" });

      const updated = control.getAnnotation<Text>(addedText.id)!;

      assert.equal(updated?.properties.style?.color, "pink");
    });

    it("should update text font size", () => {
      const text = createText(0, 0, 100, 50, "Hello world");
      const addedCollection = control.add(text);
      const addedText = addedCollection.getAnnotations().features[0];

      control.updateStyle(addedText.id, { fontSize: "24px" });

      const updated = control.getAnnotation<Text>(addedText.id)!;

      assert.equal(updated?.properties.style?.fontSize, "24px");
    });

    it("should update text font family", () => {
      const text = createText(0, 0, 100, 50, "Hello world");
      const addedCollection = control.add(text);
      const addedText = addedCollection.getAnnotations().features[0];

      control.updateStyle(addedText.id, { font: "Arial" });

      const updated = control.getAnnotation<Text>(addedText.id)!;

      assert.equal(updated?.properties.style?.font, "Arial");
    });

    it("should update text background", () => {
      const text = createText(0, 0, 100, 50, "Hello world");
      const addedCollection = control.add(text);
      const addedText = addedCollection.getAnnotations().features[0];

      control.updateStyle(addedText.id, { background: "yellow" });

      const updated = control.getAnnotation<Text>(addedText.id)!;

      assert.equal(updated?.properties.style?.background, "yellow");
    });

    it("should update text padding", () => {
      const text = createText(0, 0, 100, 50, "Hello world");
      const addedCollection = control.add(text);
      const addedText = addedCollection.getAnnotations().features[0];

      control.updateStyle(addedText.id, { padding: 20 });

      const updated = control.getAnnotation<Text>(addedText.id)!;

      assert.equal(updated?.properties.style?.padding, 20);
    });

    it("should update text border radius", () => {
      const text = createText(0, 0, 100, 50, "Hello world");
      const addedCollection = control.add(text);
      const addedText = addedCollection.getAnnotations().features[0];

      control.updateStyle(addedText.id, { borderRadius: 12 });

      const updated = control.getAnnotation<Text>(addedText.id)!;

      assert.equal(updated?.properties.style?.borderRadius, 12);
    });

    it("should update text fixedSize property", () => {
      const text = createText(0, 0, 100, 50, "Hello world");
      const addedCollection = control.add(text);
      const addedText = addedCollection.getAnnotations().features[0] as Text;

      assert.equal(addedText.properties.style?.fixedSize, false);

      control.updateStyle(addedText.id, { fixedSize: true });

      const updated = control.getAnnotation<Text>(addedText.id)!;

      assert.equal(updated?.properties.style?.fixedSize, true);
    });

    it("should update multiple text style properties at once", () => {
      const text = createText(0, 0, 100, 50, "Hello world");
      const addedCollection = control.add(text);
      const addedText = addedCollection.getAnnotations().features[0];

      control.updateStyle(addedText.id, {
        color: "blue",
        fontSize: "20px",
        font: "Courier",
        background: "#f0f0f0",
        padding: 24,
        borderRadius: 4,
        fixedSize: true
      });

      const updated = control.getAnnotation<Text>(addedText.id)!;

      assert.equal(updated?.properties.style?.color, "blue");
      assert.equal(updated?.properties.style?.fontSize, "20px");
      assert.equal(updated?.properties.style?.font, "Courier");
      assert.equal(updated?.properties.style?.background, "#f0f0f0");
      assert.equal(updated?.properties.style?.padding, 24);
      assert.equal(updated?.properties.style?.borderRadius, 4);
      assert.equal(updated?.properties.style?.fixedSize, true);
    });
  });

  describe("Box style updates", () => {
    it("should update box stroke width", () => {
      const box = createBox(0, 0, 100, 50);
      const addedCollection = control.add(box);
      const addedBox = addedCollection.getAnnotations().features[0];

      control.updateStyle(addedBox.id, { strokeWidth: 3 });

      const updated = control.getAnnotation<Box>(addedBox.id)!;

      assert.equal(updated?.properties.style?.strokeWidth, 3);
    });

    it("should update box stroke color", () => {
      const box = createBox(0, 0, 100, 50);
      const addedCollection = control.add(box);
      const addedBox = addedCollection.getAnnotations().features[0];

      control.updateStyle(addedBox.id, { strokeColor: "red" });

      const updated = control.getAnnotation<Box>(addedBox.id)!;

      assert.equal(updated?.properties.style?.strokeColor, "red");
    });

    it("should update box background", () => {
      const box = createBox(0, 0, 100, 50);
      const addedCollection = control.add(box);
      const addedBox = addedCollection.getAnnotations().features[0];

      control.updateStyle(addedBox.id, { background: "lightblue" });

      const updated = control.getAnnotation<Box>(addedBox.id)!;

      assert.equal(updated?.properties.style?.background, "lightblue");
    });
  });

  describe("Edge cases", () => {
    it("should return this when updating non-existent annotation", () => {
      const result = control.updateStyle("non-existent-id", {
        strokeColor: "red"
      });

      assert.equal(result, control);
    });

    it("should not throw when updating with empty style object", () => {
      const arrow = createArrow(0, 0, 10, 10);
      const addedCollection = control.add(arrow);
      const addedArrow = addedCollection.getAnnotations().features[0];

      assert.doesNotThrow(() => {
        control.updateStyle(addedArrow.id, {});
      });
    });

    it("should preserve existing style properties when updating", () => {
      const arrow = createArrow(0, 0, 10, 10, {
        strokeColor: "red",
        strokeWidth: 3,
        strokeType: "dashed"
      });
      const addedCollection = control.add(arrow);
      const addedArrow = addedCollection.getAnnotations().features[0];

      // Update only stroke color
      control.updateStyle(addedArrow.id, { strokeColor: "blue" });

      const updated = control.getAnnotation<Arrow>(addedArrow.id)!;

      assert.equal(updated?.properties.style?.strokeColor, "blue");
      assert.equal(updated?.properties.style?.strokeWidth, 3);
      assert.equal(updated?.properties.style?.strokeType, "dashed");
    });

    it("should support method chaining", () => {
      const arrow = createArrow(0, 0, 10, 10);
      const addedCollection = control.add(arrow);
      const addedArrow = addedCollection.getAnnotations().features[0];

      const result = control
        .updateStyle(addedArrow.id, { strokeColor: "red" })
        .updateStyle(addedArrow.id, { strokeWidth: 5 });

      assert.equal(result, control);

      const updated = control.getAnnotation<Arrow>(addedArrow.id)!;

      assert.equal(updated?.properties.style?.strokeColor, "red");
      assert.equal(updated?.properties.style?.strokeWidth, 5);
    });
  });

  describe("History and undo", () => {
    it("should create history entry when updating style", () => {
      const arrow = createArrow(0, 0, 10, 10);
      const addedCollection = control.add(arrow);
      const addedArrow = addedCollection.getAnnotations().features[0];

      // Adding creates a history entry, so clear it first
      control.clearHistory();
      assert.equal(control.canUndo(), false);

      control.updateStyle(addedArrow.id, { strokeColor: "red" });

      assert.equal(control.canUndo(), true);
    });

    it("should allow undoing style update", () => {
      const arrow = createArrow(0, 0, 10, 10, { strokeColor: "pink" });
      const addedCollection = control.add(arrow);
      const addedArrow = addedCollection.getAnnotations().features[0];

      control.updateStyle(addedArrow.id, { strokeColor: "blue" });

      let updated = control.getAnnotation<Arrow>(addedArrow.id)!;
      assert.equal(updated?.properties.style?.strokeColor, "blue");

      control.undo();

      updated = control.getAnnotation<Arrow>(addedArrow.id)!;
      assert.equal(updated?.properties.style?.strokeColor, "pink");
    });

    it("should allow redoing style update", () => {
      const arrow = createArrow(0, 0, 10, 10, { strokeColor: "pink" });
      const addedCollection = control.add(arrow);
      const addedArrow = addedCollection.getAnnotations().features[0];

      control.updateStyle(addedArrow.id, { strokeColor: "blue" });
      control.undo();

      assert.equal(control.canRedo(), true);

      control.redo();

      const updated = control.getAnnotation<Arrow>(addedArrow.id)!;
      assert.equal(updated?.properties.style?.strokeColor, "blue");
    });
  });
});
