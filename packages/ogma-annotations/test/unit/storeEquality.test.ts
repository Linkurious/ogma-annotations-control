import { describe, it, assert } from "vitest";
import { temporalEquality } from "../../src/store";
import type { Annotation, Id } from "../../src/types";
import { createArrow } from "../../src/types/features/Arrow";
import { createBox } from "../../src/types/features/Box";
import { createComment } from "../../src/types/features/Comment";
import { createText, type TextStyle } from "../../src/types/features/Text";

// Helper to create text with simpler signature for tests
// createText signature is: (x, y, width, height, content, styles)
const createTestText = (
  x: number,
  y: number,
  content: string,
  styles?: Partial<TextStyle>
) => createText(x, y, 100, 50, content, styles);

/**
 * Test suite for the store's temporal equality function
 * This function is critical for undo/redo performance - it determines
 * when state has actually changed and a history entry should be created.
 *
 * Tests cover:
 * - Coordinate changes (position, arrow endpoints)
 * - Style changes (colors, fonts, stroke widths)
 * - Content changes (text, comments)
 * - Link changes (arrow links, magnets)
 */

describe("Store Temporal Equality Function", () => {
  describe("Feature count changes", () => {
    it("should return false when feature is added", () => {
      const stateA = {
        features: {
          "1": createComment(0, 0, "Comment 1")
        },
        drawingFeature: null
      };

      const stateB = {
        features: {
          "1": createComment(0, 0, "Comment 1"),
          "2": createComment(10, 10, "Comment 2")
        },
        drawingFeature: null
      };

      assert.isFalse(temporalEquality(stateA, stateB));
    });

    it("should return false when feature is removed", () => {
      const stateA = {
        features: {
          "1": createComment(0, 0, "Comment 1"),
          "2": createComment(10, 10, "Comment 2")
        },
        drawingFeature: null
      };

      const stateB = {
        features: {
          "1": createComment(0, 0, "Comment 1")
        },
        drawingFeature: null
      };

      assert.isFalse(temporalEquality(stateA, stateB));
    });

    it("should return false when all features are removed", () => {
      const stateA = {
        features: {
          "1": createComment(0, 0, "Comment 1")
        },
        drawingFeature: null
      };

      const stateB = {
        features: {},
        drawingFeature: null
      };

      assert.isFalse(temporalEquality(stateA, stateB));
    });
  });

  describe("Feature ID changes", () => {
    it("should return false when feature IDs differ", () => {
      const stateA = {
        features: {
          "1": createComment(0, 0, "Comment 1")
        },
        drawingFeature: null
      };

      const stateB = {
        features: {
          "2": createComment(0, 0, "Comment 1")
        },
        drawingFeature: null
      };

      assert.isFalse(temporalEquality(stateA, stateB));
    });
  });

  describe("Coordinate changes", () => {
    it("should return false when comment position changes", () => {
      const comment1 = createComment(0, 0, "Test");
      const comment2 = createComment(10, 10, "Test");

      const stateA = {
        features: { "1": comment1 },
        drawingFeature: null
      };

      const stateB = {
        features: { "1": comment2 },
        drawingFeature: null
      };

      assert.isFalse(temporalEquality(stateA, stateB));
    });

    it("should return false when arrow start coordinate changes", () => {
      const arrow1 = createArrow(0, 0, 10, 10);
      const arrow2 = createArrow(5, 5, 10, 10);

      const stateA = {
        features: { "1": arrow1 },
        drawingFeature: null
      };

      const stateB = {
        features: { "1": arrow2 },
        drawingFeature: null
      };

      assert.isFalse(temporalEquality(stateA, stateB));
    });

    it("should return false when arrow end coordinate changes", () => {
      const arrow1 = createArrow(0, 0, 10, 10);
      const arrow2 = createArrow(0, 0, 20, 20);

      const stateA = {
        features: { "1": arrow1 },
        drawingFeature: null
      };

      const stateB = {
        features: { "1": arrow2 },
        drawingFeature: null
      };

      assert.isFalse(temporalEquality(stateA, stateB));
    });

    it("should return false when box position changes", () => {
      const box1 = createBox(0, 0, 100, 100);
      const box2 = createBox(50, 50, 100, 100);

      const stateA = {
        features: { "1": box1 },
        drawingFeature: null
      };

      const stateB = {
        features: { "1": box2 },
        drawingFeature: null
      };

      assert.isFalse(temporalEquality(stateA, stateB));
    });

    it("should return false when text position changes", () => {
      const text1 = createTestText(0, 0, "Hello");
      const text2 = createTestText(100, 100, "Hello");

      const stateA = {
        features: { "1": text1 },
        drawingFeature: null
      };

      const stateB = {
        features: { "1": text2 },
        drawingFeature: null
      };

      assert.isFalse(temporalEquality(stateA, stateB));
    });
  });

  describe("Style changes", () => {
    it("should return false when comment background color changes", () => {
      const comment1 = createComment(0, 0, "Test", {
        style: { background: "#FFFACD" }
      });
      const comment2 = createComment(0, 0, "Test", {
        style: { background: "#FFE6E6" }
      });

      const stateA = {
        features: { "1": comment1 },
        drawingFeature: null
      };

      const stateB = {
        features: { "1": comment2 },
        drawingFeature: null
      };

      assert.isFalse(temporalEquality(stateA, stateB));
    });

    it("should return false when arrow stroke color changes", () => {
      const arrow1 = createArrow(0, 0, 10, 10, {
        strokeColor: "#666"
      });
      const arrow2 = createArrow(0, 0, 10, 10, {
        strokeColor: "#FF0000"
      });

      const stateA = {
        features: { "1": arrow1 },
        drawingFeature: null
      };

      const stateB = {
        features: { "1": arrow2 },
        drawingFeature: null
      };

      assert.isFalse(temporalEquality(stateA, stateB));
    });

    it("should return false when arrow stroke width changes", () => {
      const arrow1 = createArrow(0, 0, 10, 10, {
        strokeWidth: 2
      });
      const arrow2 = createArrow(0, 0, 10, 10, {
        strokeWidth: 5
      });

      const stateA = {
        features: { "1": arrow1 },
        drawingFeature: null
      };

      const stateB = {
        features: { "1": arrow2 },
        drawingFeature: null
      };

      assert.isFalse(temporalEquality(stateA, stateB));
    });

    it("should return false when arrow head style changes", () => {
      const arrow1 = createArrow(0, 0, 10, 10, {
        head: "arrow"
      });
      const arrow2 = createArrow(0, 0, 10, 10, {
        head: "dot"
      });

      const stateA = {
        features: { "1": arrow1 },
        drawingFeature: null
      };

      const stateB = {
        features: { "1": arrow2 },
        drawingFeature: null
      };

      assert.isFalse(temporalEquality(stateA, stateB));
    });

    it("should return false when text font changes", () => {
      const text1 = createTestText(0, 0, "Hello", {
        font: "Arial"
      });
      const text2 = createTestText(0, 0, "Hello", {
        font: "Helvetica"
      });

      const stateA = {
        features: { "1": text1 },
        drawingFeature: null
      };

      const stateB = {
        features: { "1": text2 },
        drawingFeature: null
      };

      assert.isFalse(temporalEquality(stateA, stateB));
    });

    it("should return false when text font size changes", () => {
      const text1 = createTestText(0, 0, "Hello", {
        fontSize: 12
      });
      const text2 = createTestText(0, 0, "Hello", {
        fontSize: 18
      });

      const stateA = {
        features: { "1": text1 },
        drawingFeature: null
      };

      const stateB = {
        features: { "1": text2 },
        drawingFeature: null
      };

      assert.isFalse(temporalEquality(stateA, stateB));
    });

    it("should return false when box border radius changes", () => {
      const box1 = createBox(0, 0, 100, 100, {
        borderRadius: 0
      });
      const box2 = createBox(0, 0, 100, 100, {
        borderRadius: 10
      });

      const stateA = {
        features: { "1": box1 },
        drawingFeature: null
      };

      const stateB = {
        features: { "1": box2 },
        drawingFeature: null
      };

      assert.isFalse(temporalEquality(stateA, stateB));
    });
  });

  describe("Content changes", () => {
    it("should return false when comment content changes", () => {
      const comment1 = createComment(0, 0, "Original content");
      const comment2 = createComment(0, 0, "Updated content");

      const stateA = {
        features: { "1": comment1 },
        drawingFeature: null
      };

      const stateB = {
        features: { "1": comment2 },
        drawingFeature: null
      };

      assert.isFalse(temporalEquality(stateA, stateB));
    });

    it("should return false when text content changes", () => {
      const text1 = createTestText(0, 0, "Hello");
      const text2 = createTestText(0, 0, "World");

      const stateA = {
        features: { "1": text1 },
        drawingFeature: null
      };

      const stateB = {
        features: { "1": text2 },
        drawingFeature: null
      };

      assert.isFalse(temporalEquality(stateA, stateB));
    });

    it("should return false when comment content is cleared", () => {
      const comment1 = createComment(0, 0, "Some text");
      const comment2 = createComment(0, 0, "");

      const stateA = {
        features: { "1": comment1 },
        drawingFeature: null
      };

      const stateB = {
        features: { "1": comment2 },
        drawingFeature: null
      };

      assert.isFalse(temporalEquality(stateA, stateB));
    });
  });

  describe("Link changes", () => {
    it("should return false when arrow link start changes", () => {
      const arrow1 = createArrow(0, 0, 10, 10);
      arrow1.properties.link = {
        start: { id: "node1" as Id, side: "start", type: "node" },
        end: { id: "node2" as Id, side: "end", type: "node" }
      };

      const arrow2 = createArrow(0, 0, 10, 10);
      arrow2.properties.link = {
        start: { id: "node3" as Id, side: "start", type: "node" },
        end: { id: "node2" as Id, side: "end", type: "node" }
      };

      const stateA = {
        features: { "1": arrow1 },
        drawingFeature: null
      };

      const stateB = {
        features: { "1": arrow2 },
        drawingFeature: null
      };

      assert.isFalse(temporalEquality(stateA, stateB));
    });

    it("should return false when arrow link end changes", () => {
      const arrow1 = createArrow(0, 0, 10, 10);
      arrow1.properties.link = {
        start: { id: "node1" as Id, side: "start", type: "node" },
        end: { id: "node2" as Id, side: "end", type: "node" }
      };

      const arrow2 = createArrow(0, 0, 10, 10);
      arrow2.properties.link = {
        start: { id: "node1" as Id, side: "start", type: "node" },
        end: { id: "node3" as Id, side: "end", type: "node" }
      };

      const stateA = {
        features: { "1": arrow1 },
        drawingFeature: null
      };

      const stateB = {
        features: { "1": arrow2 },
        drawingFeature: null
      };

      assert.isFalse(temporalEquality(stateA, stateB));
    });

    it("should return false when arrow magnet position changes", () => {
      const arrow1 = createArrow(0, 0, 10, 10);
      arrow1.properties.link = {
        start: {
          id: "node1" as Id,
          side: "start",
          type: "node",
          magnet: { x: 0, y: 0 }
        },
        end: { id: "node2" as Id, side: "end", type: "node" }
      };

      const arrow2 = createArrow(0, 0, 10, 10);
      arrow2.properties.link = {
        start: {
          id: "node1" as Id,
          side: "start",
          type: "node",
          magnet: { x: 0.5, y: 0.5 }
        },
        end: { id: "node2" as Id, side: "end", type: "node" }
      };

      const stateA = {
        features: { "1": arrow1 },
        drawingFeature: null
      };

      const stateB = {
        features: { "1": arrow2 },
        drawingFeature: null
      };

      assert.isFalse(temporalEquality(stateA, stateB));
    });

    it("should return false when arrow link type changes", () => {
      const arrow1 = createArrow(0, 0, 10, 10);
      arrow1.properties.link = {
        start: { id: "1" as Id, side: "start", type: "node" },
        end: { id: "2" as Id, side: "end", type: "node" }
      };

      const arrow2 = createArrow(0, 0, 10, 10);
      arrow2.properties.link = {
        start: { id: "1" as Id, side: "start", type: "text" },
        end: { id: "2" as Id, side: "end", type: "node" }
      };

      const stateA = {
        features: { "1": arrow1 },
        drawingFeature: null
      };

      const stateB = {
        features: { "1": arrow2 },
        drawingFeature: null
      };

      assert.isFalse(temporalEquality(stateA, stateB));
    });
  });

  describe("Multiple features", () => {
    it("should return true when no features change", () => {
      const comment = createComment(0, 0, "Test");
      const arrow = createArrow(0, 0, 10, 10);
      const text = createTestText(20, 20, "Hello");

      const stateA = {
        features: {
          "1": comment,
          "2": arrow,
          "3": text
        },
        drawingFeature: null
      };

      const stateB = {
        features: {
          "1": comment,
          "2": arrow,
          "3": text
        },
        drawingFeature: null
      };

      assert.isTrue(temporalEquality(stateA, stateB));
    });

    it("should return false when one feature changes among many", () => {
      const comment = createComment(0, 0, "Test");
      const arrow1 = createArrow(0, 0, 10, 10);
      const arrow2 = createArrow(0, 0, 20, 20);
      const text = createTestText(20, 20, "Hello");

      const stateA = {
        features: {
          "1": comment,
          "2": arrow1,
          "3": text
        },
        drawingFeature: null
      };

      const stateB = {
        features: {
          "1": comment,
          "2": arrow2, // Changed
          "3": text
        },
        drawingFeature: null
      };

      assert.isFalse(temporalEquality(stateA, stateB));
    });

    it("should return false when last feature in list changes", () => {
      const comment = createComment(0, 0, "Test");
      const arrow = createArrow(0, 0, 10, 10);
      const text1 = createTestText(20, 20, "Hello");
      const text2 = createTestText(20, 20, "Goodbye");

      const stateA = {
        features: {
          "1": comment,
          "2": arrow,
          "3": text1
        },
        drawingFeature: null
      };

      const stateB = {
        features: {
          "1": comment,
          "2": arrow,
          "3": text2 // Changed
        },
        drawingFeature: null
      };

      assert.isFalse(temporalEquality(stateA, stateB));
    });
  });

  describe("Drawing feature state", () => {
    it("should return false when drawingFeature changes from null to id", () => {
      const comment = createComment(0, 0, "Test");

      const stateA = {
        features: { "1": comment },
        drawingFeature: null
      };

      const stateB = {
        features: { "1": comment },
        drawingFeature: "1" as Id
      };

      assert.isFalse(temporalEquality(stateA, stateB));
    });

    it("should return false when drawingFeature changes from id to null", () => {
      const comment = createComment(0, 0, "Test");

      const stateA = {
        features: { "1": comment },
        drawingFeature: "1" as Id
      };

      const stateB = {
        features: { "1": comment },
        drawingFeature: null
      };

      assert.isFalse(temporalEquality(stateA, stateB));
    });

    it("should return false when drawingFeature changes to different id", () => {
      const comment1 = createComment(0, 0, "Test 1");
      const comment2 = createComment(10, 10, "Test 2");

      const stateA = {
        features: {
          "1": comment1,
          "2": comment2
        },
        drawingFeature: "1" as Id
      };

      const stateB = {
        features: {
          "1": comment1,
          "2": comment2
        },
        drawingFeature: "2" as Id
      };

      assert.isFalse(temporalEquality(stateA, stateB));
    });
  });

  describe("Edge cases", () => {
    it("should handle empty states", () => {
      const stateA = {
        features: {},
        drawingFeature: null
      };

      const stateB = {
        features: {},
        drawingFeature: null
      };

      assert.isTrue(temporalEquality(stateA, stateB));
    });

    it("should handle large number of features efficiently", () => {
      const featuresA: Record<Id, Annotation> = {};
      const featuresB: Record<Id, Annotation> = {};

      // Create 1000 identical features
      for (let i = 0; i < 1000; i++) {
        const comment = createComment(i, i, `Comment ${i}`);
        featuresA[i.toString()] = comment;
        featuresB[i.toString()] = comment;
      }

      const stateA = {
        features: featuresA,
        drawingFeature: null
      };

      const stateB = {
        features: featuresB,
        drawingFeature: null
      };

      const startTime = performance.now();
      const result = temporalEquality(stateA, stateB);
      const endTime = performance.now();

      assert.isTrue(result);
      // Should complete in under 10ms for 1000 features
      assert.isBelow(endTime - startTime, 10, "Equality check should be fast");
    });

    it("should detect change in large state efficiently", () => {
      const featuresA: Record<Id, Annotation> = {};
      const featuresB: Record<Id, Annotation> = {};

      // Create 1000 features, change one in the middle
      for (let i = 0; i < 1000; i++) {
        const comment = createComment(i, i, `Comment ${i}`);
        featuresA[i.toString()] = comment;
        featuresB[i.toString()] =
          i === 500 ? createComment(i, i, "CHANGED") : comment;
      }

      const stateA = {
        features: featuresA,
        drawingFeature: null
      };

      const stateB = {
        features: featuresB,
        drawingFeature: null
      };

      const startTime = performance.now();
      const result = temporalEquality(stateA, stateB);
      const endTime = performance.now();

      assert.isFalse(result);
      // Should complete in under 10ms even when detecting change
      assert.isBelow(
        endTime - startTime,
        10,
        "Change detection should be fast"
      );
    });

    it("should handle features with complex nested properties", () => {
      const arrow1 = createArrow(0, 0, 100, 100, {
        strokeColor: "#FF0000",
        strokeWidth: 5,
        head: "arrow",
        tail: "dot"
      });
      arrow1.properties.link = {
        start: {
          id: "node1" as Id,
          side: "start",
          type: "node",
          magnet: { x: 0.5, y: 0.5 }
        },
        end: {
          id: "comment1" as Id,
          side: "end",
          type: "comment",
          magnet: { x: 0, y: -0.5 }
        }
      };

      const stateA = {
        features: { "1": arrow1 },
        drawingFeature: null
      };

      const stateB = {
        features: { "1": arrow1 },
        drawingFeature: null
      };

      assert.isTrue(temporalEquality(stateA, stateB));
    });
  });
});
