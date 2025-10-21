import { describe, it, assert } from "vitest";
import { createOgma } from "./utils";
import { Control, Id, createArrow } from "../../src";

describe("Events", () => {
  it("Emits an event when a feature is selected", () => {
    const ogma = createOgma();
    const control = new Control(ogma);

    const arrow = createArrow(0, 0, 0, 0);
    const addedCollection = control.add(arrow);
    const addedArrow = addedCollection.getAnnotations().features[0];

    return new Promise<void>((resolve) => {
      const handler = (event: { ids: Id[] }) => {
        assert.isArray(event.ids);
        assert.equal(event.ids.length, 1);
        assert.equal(event.ids[0], addedArrow.id);

        const selectedCollection = control.getSelectedAnnotations();
        assert.equal(selectedCollection.features.length, 1);
        assert.equal(selectedCollection.features[0].properties.type, "arrow");

        control.off("select", handler);
        resolve();
      };

      control.on("select", handler);
      control.select(addedArrow.id);
    });
  });

  it("Emits an event when a feature is unselected", () => {
    const ogma = createOgma();
    const control = new Control(ogma);

    const arrow = createArrow(0, 0, 0, 0);
    control.add(arrow);
    assert.equal(control.getAnnotations().features.length, 1);
    control.select(arrow.id);

    return new Promise<void>((resolve) => {
      const handler = (event: { ids: Id[] }) => {
        assert.isArray(event.ids);
        assert.equal(event.ids.length, 1);

        const selectedCollection = control.getSelectedAnnotations();
        assert.equal(selectedCollection.features.length, 0);

        resolve();
      };

      // Set up listener after initial selection
      control.once("unselect", handler);
      control.unselect();
    });
  });

  it(`Doesn't emit unselect event if unselecting a non-selected feature`, () => {
    const ogma = createOgma();
    const control = new Control(ogma);

    const arrow = createArrow(0, 0, 0, 0);
    control.add(arrow);
    assert.equal(control.getAnnotations().features.length, 1);

    let unselectCalled = false;

    control.on("unselect", () => {
      unselectCalled = true;
    });

    // Unselect when nothing is selected
    control.unselect();

    assert.isFalse(
      unselectCalled,
      "Unselect event should not have been called"
    );
  });

  it(`Doesn't emit select event if selecting an already selected feature`, () => {
    const ogma = createOgma();
    const control = new Control(ogma);

    const arrow = createArrow(0, 0, 0, 0);
    control.add(arrow);
    assert.equal(control.getAnnotations().features.length, 1);

    control.select(arrow.id);

    let selectCalled = false;

    control.once("select", () => {
      selectCalled = true;
    });

    // Select the already selected feature
    control.select(arrow.id);

    assert.isFalse(selectCalled, "Select event should not have been called");
  });

  it('should unselect all features when "unselect" is called without arguments', () => {
    const ogma = createOgma();
    const control = new Control(ogma);

    const arrow1 = createArrow(0, 0, 0, 0);
    const arrow2 = createArrow(1, 1, 1, 1);
    control.add({
      type: "FeatureCollection",
      features: [arrow1, arrow2]
    });
    assert.equal(control.getAnnotations().features.length, 2);
    control.select([arrow1.id, arrow2.id]);
    assert.equal(control.getSelectedAnnotations().features.length, 2);

    control.unselect();

    assert.equal(
      control.getSelectedAnnotations().features.length,
      0,
      "All features should be unselected"
    );
  });
});
