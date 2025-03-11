import Ogma from "@linkurious/ogma";
import { describe, it, assert, beforeEach, afterEach } from "vitest";
import { createOgma } from "./utils";
import { Control, createArrow, createText } from "../../src";

describe("Updates", () => {
  let ogma: Ogma;
  let control: Control;

  beforeEach(() => {
    ogma = createOgma();
    control = new Control(ogma);
  });

  afterEach(() => ogma.destroy());

  it("should be able to update line thickness", () => {
    const arrow = createArrow(0, 0, 0, 0, { strokeColor: "pink" });
    control.add(arrow);

    assert.equal(arrow.properties.style?.strokeWidth, 1);
    control.updateStyle(arrow.id, { strokeWidth: 22 });
    assert.equal(arrow.properties.style?.strokeWidth, 22);
    assert.equal(arrow.properties.style?.strokeColor, "pink");
  });

  it("should be able to update text color", () => {
    const text = createText(0, 0, 0, 0, "Hello world", { fontSize: "14px" });
    control.add(text);

    assert.equal(text.properties.style?.color, "#505050");
    control.updateStyle(text.id, { color: "pink" });
    assert.equal(text.properties.style?.color, "pink");
    assert.equal(text.properties.style?.fontSize, "14px");
  });

  it("should send an event when a feature is updated", () => {
    const arrow = createArrow(0, 0, 0, 0, { strokeColor: "pink" });
    control.add(arrow);

    return new Promise<void>((resolve) => {
      control.on("update", (feature) => {
        assert.equal(feature.properties.type, "arrow");
        assert.equal(feature.properties.style?.strokeWidth, 22);
        assert.equal(feature.properties.style?.strokeColor, "pink");
        resolve();
      });

      control.updateStyle(arrow.id, { strokeWidth: 22 });
    });
  });

  it("should allow to setScale arrow", async () => {
    const arrow = createArrow(0, 0, 0, 0, { strokeColor: "pink" });
    control.add(arrow);

    control.setScale(arrow.id, 2, 2, 2);
    assert.deepEqual(arrow.geometry.coordinates, [
      [-2, -2],
      [-2, -2]
    ]);
  });

  it("should allow to setScale arrow", async () => {
    const text = createText(0, 0, 100, 200, "Hello world", {
      fontSize: 12,
      strokeColor: "magenta"
    });
    control.add(text);

    control.setScale(text.id, 2, 2, 2);
    assert.deepEqual(text.geometry.coordinates, [
      [
        [-2, -2],
        [198, -2],
        [198, 398],
        [-2, 398],
        [-2, -2]
      ]
    ]);
  });
});
