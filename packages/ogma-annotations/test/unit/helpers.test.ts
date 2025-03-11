import { describe, it, assert } from "vitest";
import { createArrow, createText } from "../../src";

describe("Helpers", () => {
  it("it should create text feature", () => {
    const text = createText(0, 0, 100, 200, "Hello world", {
      fontSize: "12px",
      strokeColor: "magenta"
    });
    assert.equal(text.properties.type, "text");
    assert.equal(text.properties.content, "Hello world");

    assert.equal(text.properties.style?.strokeColor, "magenta");

    assert.equal(text.geometry.type, "Polygon");
    assert.equal(text.geometry.coordinates.length, 1);
    assert.equal(text.geometry.coordinates[0].length, 5);

    assert.deepEqual(text.geometry.coordinates[0][0], [0, 0]);
    assert.deepEqual(text.geometry.coordinates[0][1], [100, 0]);
    assert.deepEqual(text.geometry.coordinates[0][2], [100, 200]);
    assert.deepEqual(text.geometry.coordinates[0][3], [0, 200]);
    assert.deepEqual(text.geometry.coordinates[0][4], [0, 0]);
  });

  it("it should create arrow feature", () => {
    const arrow = createArrow(0, 0, 100, 200, {
      strokeColor: "magenta"
    });
    assert.equal(arrow.properties.type, "arrow");
    assert.equal(arrow.properties.style?.strokeColor, "magenta");

    assert.equal(arrow.geometry.type, "LineString");
    assert.equal(arrow.geometry.coordinates.length, 2);

    assert.deepEqual(arrow.geometry.coordinates[0], [0, 0]);
    assert.deepEqual(arrow.geometry.coordinates[1], [100, 200]);
  });
});
