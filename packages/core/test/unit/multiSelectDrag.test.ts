import { Ogma } from "@linkurious/ogma";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createOgma } from "./utils";
import { Control, createArrow, createText, createBox } from "../../src";
import { createStore, Store } from "../../src/store";
import { Links } from "../../src/handlers/links";
import { Snapping } from "../../src/handlers/snapping";
import { handleDrag } from "../../src/handlers/dragging";
import { EVT_MOUSEDOWN_ANNOTATION } from "../../src/interaction/index";

describe("handleDrag: carries the rest of a multi-selection along", () => {
  let store: Store;
  let links: Links;

  beforeEach(() => {
    const ogma = createOgma();
    store = createStore();
    // Snapping isn't exercised by this code path (only arrow endpoint
    // dragging uses it) - mock it out the same way links.test.ts does.
    const mockSnapping = {} as unknown as Snapping;
    links = new Links(ogma, mockSnapping, store);
  });

  it("moves only the dragged annotation when it's not part of a multi-selection", () => {
    const a = createText(0, 0, 50, 50, "a"); // center [25, 25]
    store.getState().addFeature(a);
    store.getState().setSelectedFeatures([a.id]);

    handleDrag(store, links, a.id, { x: 10, y: -5 });

    expect(store.getState().liveUpdates[a.id]?.geometry?.coordinates).toEqual([35, 20]);
  });

  it("moves every selected annotation by the same displacement", () => {
    const a = createText(0, 0, 50, 50, "a"); // center [25, 25]
    const b = createBox(100, 100, 50, 50); // center [125, 125]
    store.getState().addFeature(a);
    store.getState().addFeature(b);
    store.getState().setSelectedFeatures([a.id, b.id]);

    handleDrag(store, links, a.id, { x: 10, y: -5 });

    expect(store.getState().liveUpdates[a.id]?.geometry?.coordinates).toEqual([35, 20]);
    expect(store.getState().liveUpdates[b.id]?.geometry?.coordinates).toEqual([135, 120]);
  });

  it("ignores annotations outside the current selection", () => {
    const a = createText(0, 0, 50, 50, "a");
    const b = createBox(100, 100, 50, 50);
    store.getState().addFeature(a);
    store.getState().addFeature(b);
    store.getState().setSelectedFeatures([a.id]); // b never got selected

    handleDrag(store, links, a.id, { x: 10, y: 10 });

    expect(store.getState().liveUpdates[b.id]).toBeUndefined();
  });

  // Regression: moving a linked shape (moveConnected) cascades into
  // updateLinkedArrowsDuringDrag, which stages a matching update for the
  // dragged arrow's own endpoint too - if the arrow's own translation had
  // already been staged by then, that cascade added to it instead of
  // replacing it, displacing the endpoint twice.
  it("doesn't double-apply displacement to a moveConnected arrow's linked endpoint", () => {
    const shape = createText(100, 100, 50, 50, "s"); // center [125, 125]
    const arrow = createArrow(0, 0, 125, 125);
    const magnet = { x: 0, y: 0 };
    arrow.properties.link = {
      end: { side: "end", id: shape.id, type: "text", magnet }
    };
    store.getState().addFeature(shape);
    store.getState().addFeature(arrow);
    links.add(arrow, "end", shape.id, "text", magnet);

    handleDrag(store, links, arrow.id, { x: 10, y: 0 }, true);

    const liveArrow = store.getState().liveUpdates[arrow.id];
    expect(liveArrow?.geometry?.coordinates?.[1]).toEqual([135, 125]);
  });
});

describe("multi-select drag: same-type handler switching", () => {
  let ogma: Ogma;
  let control: Control;

  beforeEach(() => {
    ogma = createOgma();
    control = new Control(ogma);
  });

  afterEach(() => {
    try {
      control?.destroy();
    } catch (e) {
      // Ignore - headless mode
    }
    try {
      ogma?.destroy();
    } catch (e) {
      // Ignore - headless mode
    }
  });

  // Same-type annotations (two texts here) share one Handler instance -
  // see AnnotationEditor's constructor.
  it("selecting a second same-type annotation switches the shared handler onto it", () => {
    const a = createText(0, 0, 50, 50, "a");
    const b = createText(200, 200, 50, 50, "b");
    control.add(a);
    control.add(b);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const editor = control["editor"] as any;
    const textHandler = editor.handlers.get("text");

    editor.editFeature(a.id);
    expect(textHandler.isAnnotation(a.id)).toBe(true);

    editor.editFeature(b.id);
    expect(textHandler.isAnnotation(b.id)).toBe(true);
    expect(textHandler.isAnnotation(a.id)).toBe(false);
  });

  it("stopEditingFeature on a stale same-type id doesn't clobber the sibling the handler is still tracking", () => {
    const a = createText(0, 0, 50, 50, "a");
    const b = createText(200, 200, 50, 50, "b");
    control.add(a);
    control.add(b);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const editor = control["editor"] as any;
    const textHandler = editor.handlers.get("text");

    editor.editFeature(a.id);
    editor.editFeature(b.id); // handler now tracking b

    // Deselecting a (which the handler is no longer tracking) must not
    // deactivate the handler's tracking of b.
    editor.stopEditingFeature(a.id);
    expect(textHandler.isAnnotation(b.id)).toBe(true);

    editor.stopEditingFeature(b.id);
    expect(textHandler.isAnnotation(b.id)).toBe(false);
  });

  it("a mousedown-annotation event switches the shared handler onto the clicked sibling", () => {
    const a = createText(0, 0, 50, 50, "a");
    const b = createText(200, 200, 50, 50, "b");
    control.add(a);
    control.add(b);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const editor = control["editor"] as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const interactions = control["interactions"] as any;
    const textHandler = editor.handlers.get("text");

    editor.editFeature(a.id);
    editor.editFeature(b.id); // handler now tracking b, a would be undraggable

    interactions.dispatchEvent(
      new CustomEvent(EVT_MOUSEDOWN_ANNOTATION, { detail: { id: a.id } })
    );

    expect(textHandler.isAnnotation(a.id)).toBe(true);
  });

  // Handler.setAnnotation's mousemove/mouseup/mousedown/click listeners only
  // attach when ogma.getContainer() is non-null - headless test Ogma
  // instances (see createOgma() in ./utils) never have one, so switching's
  // remove-before-add listener bookkeeping can't be exercised at this
  // level. Covered by e2e instead (see test/e2e), against a real container.
});
