import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createOgma } from "./utils";
import { Control, createComment } from "../../src";

// `CommentManager` and the store are private on `Control` - reached directly
// here (same pattern `links.test.ts` uses for `control.links`) since neither
// is part of the public API, and the bug this covers only shows up in the
// store's live-update overlay, which the public getAnnotation()/
// getAnnotations() deliberately don't merge in (see api/update.ts).
describe("CommentManager - zoom-driven auto collapse/expand", () => {
  let ogma: ReturnType<typeof createOgma>;
  let control: Control;

  beforeEach(() => {
    ogma = createOgma();
    control = new Control(ogma);
  });

  afterEach(() => {
    try { control.destroy(); } catch { /* headless */ }
    try { ogma.destroy(); } catch { /* headless */ }
  });

  function mergedMode(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const store = (control as any).store;
    return store.getState().getMergedFeature(id)?.properties.mode;
  }

  function updateForZoom(zoom: number) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (control as any).commentManager.updateCommentModesForZoom(zoom);
  }

  it("re-expands a comment once zoom crosses back above its threshold after an earlier auto-collapse", () => {
    // width 150 -> threshold = 80/150 ≈ 0.533 (calculateCommentZoomThreshold)
    const comment = createComment(0, 0, "review", { width: 150 });
    control.add(comment);

    // Below threshold: auto-collapses (into the live-update overlay - the
    // comment's raw, stored `mode` is never touched by this).
    updateForZoom(0.1);
    expect(mergedMode(comment.id)).toBe("collapsed");

    // Regression: back above threshold should re-expand. Before the fix,
    // this compared the target mode against the comment's raw (untouched,
    // always "expanded") mode instead of its current effective one, saw a
    // spurious "already correct" match, and left it stuck collapsed no
    // matter how far zoom moved back the other way.
    updateForZoom(2);
    expect(mergedMode(comment.id)).toBe("expanded");
  });

  it("keeps toggling correctly across repeated zoom crossings, not just once", () => {
    const comment = createComment(0, 0, "review", { width: 150 });
    control.add(comment);

    updateForZoom(0.1);
    expect(mergedMode(comment.id)).toBe("collapsed");
    updateForZoom(2);
    expect(mergedMode(comment.id)).toBe("expanded");
    updateForZoom(0.1);
    expect(mergedMode(comment.id)).toBe("collapsed");
    updateForZoom(2);
    expect(mergedMode(comment.id)).toBe("expanded");
  });

  it("toggleComment() flips from the comment's current effective mode, not its stale raw one", () => {
    const comment = createComment(0, 0, "review", { width: 150 });
    control.add(comment);

    // Auto-collapse via zoom (live-update only, raw mode stays "expanded").
    updateForZoom(0.1);
    expect(mergedMode(comment.id)).toBe("collapsed");

    // A manual toggle from here should expand it (it's currently collapsed
    // on screen) - not collapse it again by reading the untouched raw
    // "expanded" mode and flipping the wrong direction.
    control.toggleComment(comment.id);
    expect(mergedMode(comment.id)).toBe("expanded");
  });

  it("respects an explicit style.collapseZoomThreshold over the width-derived default", () => {
    const comment = createComment(0, 0, "review", {
      width: 150,
      style: { collapseZoomThreshold: 1.5 }
    });
    control.add(comment);

    // Width-derived threshold would be ~0.533 (would already be expanded
    // at zoom 1), but the explicit 1.5 threshold means it should still be
    // collapsed here.
    updateForZoom(1);
    expect(mergedMode(comment.id)).toBe("collapsed");

    updateForZoom(2);
    expect(mergedMode(comment.id)).toBe("expanded");
  });
});
