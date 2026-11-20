import { describe, it, expect } from "vitest";
import { isTextTruncated } from "../../src/renderer/shapes/text";
import { createText } from "../../src";

// 18px font -> 21.6px lines. padding 10 on every side.
const note = (content: string) =>
  createText(0, 0, 300, 200, content, { fontSize: 18, padding: 10 });

describe("isTextTruncated", () => {
  it("is false for empty content", () => {
    expect(isTextTruncated(note(""), 300, 10, 1)).toBe(false);
  });

  it("counts hard line breaks, including blank lines", () => {
    // "a\n\nb" = 3 lines = 64.8px, + 20px padding = 84.8px
    const t = note("a\n\nb");
    expect(isTextTruncated(t, 300, 90, 1)).toBe(false);
    expect(isTextTruncated(t, 300, 80, 1)).toBe(true);
  });

  it("respects bottom padding, not just top", () => {
    // 4 lines = 86.4px. Top-padding-only (96.4) would say it fits at 100;
    // with both paddings it needs 106.4.
    const t = note("a\nb\nc\nd");
    expect(isTextTruncated(t, 300, 100, 1)).toBe(true);
    expect(isTextTruncated(t, 300, 110, 1)).toBe(false);
  });

  it("depends on the font scale", () => {
    const t = note("a\nb\nc\nd");
    expect(isTextTruncated(t, 300, 110, 1)).toBe(false);
    expect(isTextTruncated(t, 300, 110, 2)).toBe(true);
  });

  it("always allows at least one line", () => {
    expect(isTextTruncated(note("a"), 300, 1, 1)).toBe(false);
  });

  it("reserves room for the author line, clear of the content", () => {
    const t = createText(0, 0, 300, 200, "a\nb\nc\nd", {
      fontSize: 18,
      padding: 10,
      showAuthor: true
    });
    t.properties.author = "Someone";
    // 4 lines (86.4) + 2*padding fits in 110 without an author line...
    expect(isTextTruncated(note("a\nb\nc\nd"), 300, 110, 1)).toBe(false);
    // ...but the author line (padding + its own line height + gap) does not.
    expect(isTextTruncated(t, 300, 110, 1)).toBe(true);
    expect(isTextTruncated(t, 300, 160, 1)).toBe(false);
  });
});
