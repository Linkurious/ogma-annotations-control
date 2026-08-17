import { Ogma } from "@linkurious/ogma";
import { describe, it, assert, beforeEach, afterEach } from "vitest";
import { createOgma } from "./utils";
import { Control, createArrow, createText, Text, EVT_CLICK } from "../../src";

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

  it("should place a resizable, empty sticky note with a ghost placeholder and no connector arrow", () => {
    assert.isFunction(control.startStickyNote);
    control.startStickyNote(0, 0);

    const annotations = control.getAnnotations();
    assert.equal(annotations.features.length, 1);
    const feature = annotations.features[0] as Text;
    assert.equal(feature.properties.type, "text");
    // empty content: the placeholder is ghost text, not real content the
    // user has to select and overwrite
    assert.equal(feature.properties.content, "");
    assert.isString(feature.properties.style?.placeholder);
    // not fixed-size, so it keeps its corner/edge resize handles
    assert.notEqual(feature.properties.style?.fixedSize, true);
    // no arrow was created alongside it
    assert.isUndefined(
      annotations.features.find((f) => f.properties.type === "arrow")
    );
  });

  it("should select the sticky note and arm the same interactive corner-drag as startBox", () => {
    // Like startBox/startText, this only arms placement - the user (or
    // a real mouseup in a browser) still has to complete it, either with
    // a plain click (default size, see TextHandler.applyDefaultSizeIfEmpty)
    // or by dragging one out. See test/e2e/stickyNote.test.ts for coverage
    // of a full click/drag through real Playwright mouse events.
    assert.doesNotThrow(() => control.startStickyNote(0, 0));
    const [note] = control.getAnnotations().features;
    assert.deepEqual(
      control.getSelectedAnnotations().features.map((f) => f.id),
      [note.id]
    );
    assert.isTrue(control.isDrawing());
  });

  it("should suppress viewport pan/drag while placing a sticky note", () => {
    // Same mechanism as box/arrow/text/polygon now (Handler.disablePanning,
    // via TextHandler.startDrawing()) - without it, the same mousedown that
    // places the note would also pan the viewport as the mouse moves.
    assert.notEqual(ogma.getOptions().interactions?.pan?.enabled, false);
    control.startStickyNote(0, 0);
    assert.equal(ogma.getOptions().interactions?.pan?.enabled, false);
    assert.equal(ogma.getOptions().interactions?.drag?.enabled, false);
  });

  it("should erase whatever is clicked while erase mode is active", () => {
    const arrow = createArrow(0, 0, 0, 0);
    control.add(arrow);
    assert.equal(control.getAnnotations().features.length, 1);

    control.enableEraseMode();
    assert.isTrue(control.isEraseModeActive());

    control.emit(EVT_CLICK, { id: arrow.id, position: { x: 0, y: 0 } });
    assert.equal(control.getAnnotations().features.length, 0);
  });

  it("shouldn't erase anything once erase mode is disabled", () => {
    const arrow = createArrow(0, 0, 0, 0);
    control.add(arrow);

    control.enableEraseMode();
    control.disableEraseMode();
    assert.isFalse(control.isEraseModeActive());

    control.emit(EVT_CLICK, { id: arrow.id, position: { x: 0, y: 0 } });
    assert.equal(control.getAnnotations().features.length, 1);
  });

  it("should exit erase mode when another drawing tool is enabled", () => {
    control.enableEraseMode();
    assert.isTrue(control.isEraseModeActive());

    control.enableArrowDrawing();
    assert.isFalse(control.isEraseModeActive());
  });
});
