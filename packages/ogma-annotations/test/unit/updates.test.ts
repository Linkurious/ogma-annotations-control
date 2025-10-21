import Ogma from "@linkurious/ogma";
import { describe, it, assert, beforeEach, afterEach } from "vitest";
import { createOgma } from "./utils";
import { Arrow, Control, Text, createArrow, createText } from "../../src";

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

  it("should be able to update arrow stroke width via store", () => {
    const arrow = createArrow(0, 0, 10, 10, { strokeColor: "pink" });
    const addedCollection = control.add(arrow);
    const addedArrow = addedCollection.getAnnotations().features[0];

    assert.equal(addedArrow.properties.style?.strokeWidth, 1);

    // Update via store
    // @ts-expect-error - store is private
    control.store.getState().updateFeature(addedArrow.id, {
      properties: {
        ...addedArrow.properties,
        style: {
          ...addedArrow.properties.style,
          strokeWidth: 22
        }
      }
    });

    // Get updated arrow from store
    // @ts-expect-error - store is private
    const updated = control.store.getState().getFeature(addedArrow.id);
    assert.equal(updated?.properties.style?.strokeWidth, 22);
    assert.equal(updated?.properties.style?.strokeColor, "pink");
  });

  it("should be able to update text color via store", () => {
    const text = createText(0, 0, 100, 50, "Hello world", { fontSize: "14px" });
    const addedCollection = control.add(text);
    const addedText = addedCollection.getAnnotations().features[0] as Text;

    assert.equal(addedText.properties.style?.color, "#505050");

    // Update via store
    // @ts-expect-error - store is private
    control.store.getState().updateFeature(addedText.id, {
      properties: {
        ...addedText.properties,
        style: {
          ...addedText.properties.style,
          color: "pink"
        }
      }
    });

    // Get updated text from store
    // @ts-expect-error - store is private
    const updated = control.store.getState().getFeature(addedText.id) as Text;
    assert.equal(updated?.properties.style?.color, "pink");
    assert.equal(updated?.properties.style?.fontSize, "14px");
  });

  it("should be able to update arrow geometry coordinates", () => {
    const arrow = createArrow(0, 0, 100, 100, { strokeColor: "pink" });
    const addedCollection = control.add(arrow);
    const addedArrow = addedCollection.getAnnotations().features[0];

    assert.deepEqual(addedArrow.geometry.coordinates, [
      [0, 0],
      [100, 100]
    ]);

    // Update coordinates via store
    // @ts-expect-error - store is private
    control.store.getState().updateFeature(addedArrow.id, {
      geometry: {
        ...addedArrow.geometry,
        coordinates: [
          [10, 10],
          [200, 200]
        ]
      }
    } as Arrow);

    // Get updated arrow from store
    // @ts-expect-error - store is private
    const updated = control.store.getState().getFeature(addedArrow.id);
    assert.deepEqual(updated?.geometry.coordinates, [
      [10, 10],
      [200, 200]
    ]);
  });

  it("should be able to update text dimensions", () => {
    const text = createText(0, 0, 100, 50, "Hello world");
    const addedCollection = control.add(text);
    const addedText = addedCollection.getAnnotations().features[0] as Text;

    assert.equal(addedText.properties.width, 100);
    assert.equal(addedText.properties.height, 50);

    // Update dimensions via store
    // @ts-expect-error - store is private
    control.store.getState().updateFeature(addedText.id, {
      properties: {
        ...addedText.properties,
        width: 200,
        height: 100
      }
    });

    // Get updated text from store
    // @ts-expect-error - store is private
    const updated = control.store.getState().getFeature(addedText.id) as Text;
    assert.equal(updated?.properties.width, 200);
    assert.equal(updated?.properties.height, 100);
  });
});
