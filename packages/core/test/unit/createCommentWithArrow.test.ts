import { describe, it, expect } from "vitest";
import { createCommentWithArrow } from "../../src";

describe("createCommentWithArrow ids", () => {
  it("generates ids and links the arrow to the comment by default", () => {
    const { comment, arrow } = createCommentWithArrow(0, 0, 50, 50);
    expect(comment.id).toBeDefined();
    expect(arrow.properties.link?.start?.id).toBe(comment.id);
  });

  it("uses supplied commentId and arrowId, and links to commentId", () => {
    const { comment, arrow } = createCommentWithArrow(0, 0, 50, 50, "hi", {
      commentId: "c1",
      arrowId: "a1"
    });
    expect(comment.id).toBe("c1");
    expect(arrow.id).toBe("a1");
    expect(arrow.properties.link?.start?.id).toBe("c1");
  });

  it("keeps numeric ids as given", () => {
    const { comment, arrow } = createCommentWithArrow(0, 0, 50, 50, "", {
      commentId: 7
    });
    expect(comment.id).toBe(7);
    expect(arrow.properties.link?.start?.id).toBe(7);
  });
});
