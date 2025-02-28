import Ogma from "@linkurious/ogma";
import { describe, it, assert, beforeEach, afterEach } from "vitest";
import { Control, createArrow, createText, Text } from "../../src";
import { createOgma } from "./utils";

describe("Draw API", () => {
  let ogma: Ogma;
  let control: Control;
  beforeEach(() => {
    ogma = createOgma();
    control = new Control(ogma);
  });
  afterEach(() => ogma.destroy());

  it("should be able to start drawing an arrow", () => {
    assert.isFunction(control.startArrow);
    control.startArrow(0, 0, createArrow(0, 0, 0, 0, {}));

    const annotations = control.getAnnotations();
    assert.equal(annotations.features.length, 1);
    assert.equal(annotations.features[0].properties.type, "arrow");
  });

  it("should be able to start drawing a text", () => {
    const text = createText(0, 0, 0, 0, "Hello world", {});
    assert.isFunction(control.startArrow);
    control.startText(0, 0, text);

    const annotations = control.getAnnotations();
    assert.equal(annotations.features.length, 1);
    const feature = annotations.features[0] as Text;
    assert.equal(feature.properties.type, "text");
    assert.equal(feature.properties.content, "Hello world");
  });

  it("should be able to stop drawing text", () => {
    const text = createText(0, 0, 0, 0, "Hello world", {});
    control.startText(0, 0, text);

    assert.isFunction(control.cancelDrawing);
    control.cancelDrawing();
    const annotations = control.getAnnotations();
    assert.equal(annotations.features.length, 0);
  });

  it("should be able to stop drawing arrow", () => {
    const arrow = createArrow(0, 0, 0, 0);
    control.startArrow(0, 0, arrow);

    assert.isFunction(control.cancelDrawing);
    control.cancelDrawing();
    const annotations = control.getAnnotations();
    assert.equal(annotations.features.length, 0);
  });

  it("shouldn't remove existing features if not drawing", () => {
    const arrow = createArrow(0, 0, 0, 0);
    control.add(arrow);

    assert.isFunction(control.cancelDrawing);
    control.cancelDrawing();
    const annotations = control.getAnnotations();
    assert.equal(annotations.features.length, 1);
  });
});
