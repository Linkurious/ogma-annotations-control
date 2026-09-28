import { describe, it, expect, afterEach } from "vitest";
import { createOgma } from "./utils";
import { Annotation, Control, createComment, createText } from "../../src";
import { Index } from "../../src/interaction/spatialIndex";
import { Store } from "../../src/store";
import { getBbox } from "../../src/utils/utils";

const searchAt = (index: Index, a: Annotation) => {
  const [minX, minY, maxX, maxY] = getBbox(a);
  return index.search({ minX, minY, maxX, maxY }).map((f) => f.id);
};

describe("spatial index while dragging", () => {
  let ogma: ReturnType<typeof createOgma>;
  let control: Control;

  afterEach(() => {
    try { control.destroy(); } catch (_) { /* headless */ }
    try { ogma.destroy(); } catch (_) { /* headless */ }
  });

  const setup = () => {
    ogma = createOgma();
    control = new Control(ogma);
    // @ts-expect-error private
    const store = control.store as Store;
    // @ts-expect-error private
    const index = control.index as Index;
    return { store, index };
  };

  it("a scoped commit (e.g. LinkSync's mid-drag arrow commit) does not end the drag", () => {
    const { store } = setup();
    const text = createText(0, 0, 100, 50, "a");
    control.add(text);

    store.setState({ isDragging: true });
    store.getState().applyLiveUpdates({
      [text.id]: { ...text, geometry: { type: "Point", coordinates: [10, 10] } }
    });
    store.getState().commitLiveUpdates(new Set([text.id]));

    expect(store.getState().liveUpdates).toEqual({});
    expect(store.getState().isDragging).toBe(true);
  });

  it("an unscoped commit with nothing left live still ends the drag", () => {
    const { store } = setup();
    const text = createText(0, 0, 100, 50, "a");
    control.add(text);

    store.setState({ isDragging: true });
    store.getState().applyLiveUpdates({
      [text.id]: { ...text, geometry: { type: "Point", coordinates: [10, 10] } }
    });
    store.getState().commitLiveUpdates();

    expect(store.getState().isDragging).toBe(false);
  });

  it("defers re-indexing of mid-drag commits until the drag ends", () => {
    const { store, index } = setup();
    const comment = createComment(0, 0, "a");
    control.add(comment);
    const before = index.all().slice();

    store.setState({ isDragging: true });
    const moved = { ...comment, geometry: { type: "Point", coordinates: [5000, 5000] } };
    store.getState().applyLiveUpdates({ [comment.id]: moved as Annotation });
    store.getState().commitLiveUpdates(new Set([comment.id]));

    // Mid-drag: tree untouched (same entries, not cleared and re-inserted).
    expect(index.all()).toEqual(before);

    store.setState({ isDragging: false });

    const committed = store.getState().features[comment.id];
    expect(index.all().length).toBe(1);
    expect(searchAt(index, committed)).toEqual([comment.id]);
  });

  it("keeps every item findable after inserts that split nodes", () => {
    const { index } = setup();
    // rbush's _insert holds on to the inserted item's toBBox() result across
    // a node split, which calls toBBox() on sibling items - a shared/reused
    // bbox object got overwritten there, leaving ancestors' bboxes not
    // covering the new item (so search() - and remove() - missed it).
    let missing = 0;
    for (let s0 = 1; s0 < 60; s0++) {
      let seed = s0;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      index.clear();
      const texts = Array.from({ length: 300 }, (_, i) =>
        createText((i * 13) % 1000 + rnd() * 50, rnd() * 10000, 10, 10)
      );
      texts.forEach((t) => index.insert(t));
      for (const t of texts) if (!searchAt(index, t).includes(t.id)) missing++;
    }
    expect(missing).toBe(0);
  });
});
