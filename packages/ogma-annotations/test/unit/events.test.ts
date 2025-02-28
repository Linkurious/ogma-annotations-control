import { createOgma } from "./utils";
import { describe, it, assert, afterEach, beforeEach } from "vitest";
import { Control, createArrow } from "../../src";
import Ogma from "@linkurious/ogma";

describe("Events", () => {
  let ogma: Ogma;
  let control: Control;

  beforeEach(() => {
    ogma = createOgma();
    control = new Control(ogma);
  });
  afterEach(() => ogma.destroy());

  it("Emits an event when a feature is selected", () => {
    return new Promise<void>((resolve) => {
      control.on("select", (feature) => {
        assert.equal(feature.properties.type, "arrow");
        assert.deepEqual(control.getSelected(), feature);
        resolve();
      });

      const arrow = createArrow(0, 0, 0, 0);
      control.add(arrow);
      control.select(arrow.id);
    });
  });

  it("Emits an event when a feature is unselected", () => {
    return new Promise<void>((resolve) => {
      control.on("unselect", (feature) => {
        assert.equal(feature.properties.type, "arrow");
        assert.isNull(control.getSelected());
        resolve();
      });

      const arrow = createArrow(0, 0, 0, 0);
      control.add(arrow);
      control.select(arrow.id);
      control.unselect();
    });
  });
});
