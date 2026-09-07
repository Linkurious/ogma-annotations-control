import { Ogma } from "@linkurious/ogma";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createOgma } from "./utils";
import { Control, createText, createBox } from "../../src";
import { createStore, Store } from "../../src/store";
import { Links } from "../../src/handlers/links";
import { Snapping } from "../../src/handlers/snapping";
import { handleMultiDrag, dragSelectionAlong } from "../../src/handlers/dragging";
import { EVT_MOUSEDOWN_ANNOTATION } from "../../src/constants";

describe("multi-select drag: dragging.ts helpers", () => {
  let store: Store;
  let links: Links;

  beforeEach(() => {
    const ogma = createOgma();
    store = createStore();
    // Snapping isn't exercised by these code paths (only arrow endpoint
    // dragging uses it) - mock it out the same way links.test.ts does.
    const mockSnapping = {} as unknown as Snapping;
    links = new Links(ogma, mockSnapping, store);
  });

  it("handleMultiDrag moves every given annotation by the same displacement", () => {
    const a = createText(0, 0, 50, 50, "a"); // center [25, 25]
    const b = createBox(100, 100, 50, 50); // center [125, 125]
    store.getState().addFeature(a);
    store.getState().addFeature(b);

    handleMultiDrag(store, links, [a.id, b.id], { x: 10, y: -5 });

    expect(store.getState().liveUpdates[a.id]?.geometry?.coordinates).toEqual([35, 20]);
    expect(store.getState().liveUpdates[b.id]?.geometry?.coordinates).toEqual([135, 120]);
  });

  it("dragSelectionAlong is a no-op when the primary id isn't part of a multi-selection", () => {
    const a = createText(0, 0, 50, 50, "a");
    store.getState().addFeature(a);
    store.getState().setSelectedFeatures([a.id]);

    dragSelectionAlong(store, links, a.id, { x: 10, y: 10 });

    expect(store.getState().liveUpdates[a.id]).toBeUndefined();
  });

  it("dragSelectionAlong moves the rest of a multi-selection, not the primary id itself", () => {
    const a = createText(0, 0, 50, 50, "a"); // center [25, 25]
    const b = createBox(100, 100, 50, 50); // center [125, 125]
    store.getState().addFeature(a);
    store.getState().addFeature(b);
    store.getState().setSelectedFeatures([a.id, b.id]);

    dragSelectionAlong(store, links, a.id, { x: 10, y: 10 });

    // The caller is expected to move the primary id itself via handleDrag -
    // dragSelectionAlong only carries the *rest* of the selection along.
    expect(store.getState().liveUpdates[a.id]).toBeUndefined();
    expect(store.getState().liveUpdates[b.id]?.geometry?.coordinates).toEqual([135, 135]);
  });

  it("dragSelectionAlong ignores ids outside the current selection", () => {
    const a = createText(0, 0, 50, 50, "a");
    const b = createBox(100, 100, 50, 50);
    store.getState().addFeature(a);
    store.getState().addFeature(b);
    store.getState().setSelectedFeatures([a.id]); // b never got selected

    dragSelectionAlong(store, links, a.id, { x: 10, y: 10 });

    expect(store.getState().liveUpdates[b.id]).toBeUndefined();
  });
});

describe("multi-select drag: same-type handler arming", () => {
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

  // "text", "box" and "comment" annotations each share a single Handler
  // instance for their type (see AnnotationEditor's constructor), so two
  // selected annotations of the *same* type contend over one instance's
  // single `annotation` field. These guard the fixes in
  // AnnotationEditor.editFeature/stopEditingFeature and
  // Handler.isAnnotation against that instance being stomped.
  it("selecting a second same-type annotation re-arms the shared handler onto it", () => {
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
    editor.editFeature(b.id); // handler now armed on b

    // Deselecting a (which the handler is no longer tracking) must not
    // deactivate the handler's tracking of b.
    editor.stopEditingFeature(a.id);
    expect(textHandler.isAnnotation(b.id)).toBe(true);

    editor.stopEditingFeature(b.id);
    expect(textHandler.isAnnotation(b.id)).toBe(false);
  });

  it("a mousedown-annotation event re-arms the shared handler onto the clicked sibling", () => {
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
    editor.editFeature(b.id); // handler now armed on b, a would be undraggable

    interactions.dispatchEvent(
      new CustomEvent(EVT_MOUSEDOWN_ANNOTATION, { detail: { id: a.id } })
    );

    expect(textHandler.isAnnotation(a.id)).toBe(true);
  });

  // Handler.setAnnotation's mousemove/mouseup/mousedown/click listeners only
  // attach when ogma.getContainer() is non-null - headless test Ogma
  // instances (see createOgma() in ./utils) never have one, so re-arming's
  // remove-before-add listener bookkeeping can't be exercised at this
  // level. Covered by e2e instead (see test/e2e), against a real container.
});
