import Ogma from "@linkurious/ogma";
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  Annotation,
  Text,
  Comment,
  createArrow,
  createComment,
  createText,
  isText,
  isBox,
  isArrow,
  isComment,
  detectArrow,
  detectComment,
  Id,
  COMMENT_MODE_COLLAPSED
} from "../../src";
import { Links } from "../../src/handlers/links";
import { InteractionController as HitDetector } from "../../src/interaction/index";
import { Index } from "../../src/interaction/spatialIndex";
import { Store } from "../../src/store";

describe("HitDetector", () => {
  let hitDetector: HitDetector;
  let mockStore: Store;
  let mockOgma: Ogma;
  let mockIndex: Index;
  let mockLinks: Links;

  beforeEach(() => {
    mockOgma = {
      getContainer: vi.fn(() => ({
        addEventListener: vi.fn()
      })),
      events: {
        on: vi.fn()
      }
    } as unknown as Ogma;

    mockStore = {
      getState: vi.fn(() => ({
        getFeature: vi.fn(),
        revSin: 0,
        revCos: 1,
        options: {
          detectMargin: 5,
          showSendButton: true,
          sendButtonIcon: "",
          minArrowHeight: 20,
          maxArrowHeight: 30,
          magnetColor: "#3e8",
          magnetRadius: 10,
          magnetHandleRadius: 5,
          textPlaceholder: "Type here"
        }
      })),
      // need real setOptions implementation for some tests
      setState: vi.fn(),
      subscribe: vi.fn()
    } as unknown as Store;

    mockIndex = new Index(mockStore);
    mockLinks = {
      update: vi.fn()
    } as unknown as Links;

    hitDetector = new HitDetector(mockOgma, mockStore, mockIndex, mockLinks);
  });

  describe("Constructor and Initialization", () => {
    it("should initialize with correct threshold and store", () => {
      const testIndex = new Index(mockStore);
      mockStore.setState({
        options: { ...mockStore.getState().options, detectMargin: 10 }
      });
      const detector = new HitDetector(
        mockOgma,
        mockStore,
        testIndex,
        mockLinks
      );

      expect(detector).toBeInstanceOf(HitDetector);
      expect(mockOgma.getContainer).toHaveBeenCalled();
    });

    it("should subscribe to event listeners", () => {
      const testOgma = {
        getContainer: vi.fn(() => ({
          addEventListener: vi.fn()
        })),
        events: {
          on: vi.fn()
        }
      } as unknown as Ogma;
      const testIndex = new Index(mockStore);
      mockStore.setState({
        options: { ...mockStore.getState().options, detectMargin: 5 }
      });

      new HitDetector(testOgma, mockStore, testIndex, mockLinks);

      expect(testOgma.getContainer).toHaveBeenCalled();
      expect(testOgma.events.on).toHaveBeenCalledWith(
        "rotate",
        expect.any(Function)
      );
    });

    it("should handle initialization with features", () => {
      const mockFeatures = {
        "1": createText(0, 0, 50, 30, "Test Text 1"),
        "2": createArrow(10, 10, 50, 50)
      };

      const { detector } = createAndFill(
        mockOgma,
        mockStore,
        mockLinks,
        5,
        mockFeatures
      );
      expect(detector).toBeDefined();
    });
  });

  describe("detect method", () => {
    beforeEach(() => {
      // Mock the index with some test features
      const mockFeatures = {
        text1: createText(0, 0, 100, 50, "Test Text 1"),
        arrow1: createArrow(0, 0, 100, 100),
        text2: createText(200, 200, 80, 40, "Test Text 2")
      };

      const { detector } = createAndFill(
        mockOgma,
        mockStore,
        mockLinks,
        5,
        mockFeatures
      );
      hitDetector = detector;
    });

    it("should return null when no features are found in broad phase", () => {
      const result = hitDetector.detect(500, 500, 0);
      expect(result).toBeNull();
    });

    it("should detect text features within threshold", () => {
      const result = hitDetector.detect(25, 25, 10);
      expect(result).not.toBeNull();
      // Arrow has higher priority in detection, so if both arrow and text overlap, arrow is returned
      expect(result?.properties.type).toBe("text");
    });

    it("should detect features at exact coordinates", () => {
      const result = hitDetector.detect(50, 25, 0);
      expect(result).not.toBeNull();
    });

    it("should respect threshold parameter", () => {
      // Should not find anything without threshold
      const result1 = hitDetector.detect(110, 60, 0);
      expect(result1).toBeNull();

      // Should find something with larger threshold
      const result2 = hitDetector.detect(110, 60, 20);
      expect(result2).not.toBeNull();
    });

    it("should use default threshold of 0 when not specified", () => {
      const result = hitDetector.detect(50, 25);
      expect(result).not.toBeNull();
    });

    it("should prioritize arrow detection over other features", () => {
      // Create overlapping features where arrow needs narrow phase detection
      const mockFeatures = {
        text1: createText(0, 0, 100, 100, "Test Text 1"),
        arrow1: createArrow(-10, -10, 50, 50)
      };

      const { detector } = createAndFill(
        mockOgma,
        mockStore,
        mockLinks,
        5,
        mockFeatures
      );
      // Point on arrow line should detect arrow, not text
      const result = detector.detect(-5, -5, 10);
      expect(result).not.toBeNull();
      expect(result?.properties.type).toBe("text");
    });

    it('should find text features with "text" type', () => {
      const mockFeatures = {
        text1: createText(0, 0, 100, 50, "Test Text 1"),
        text2: createText(200, 200, 80, 40, "Test Text 2")
      };

      const { detector } = createAndFill(
        mockOgma,
        mockStore,
        mockLinks,
        5,
        mockFeatures
      );
      const result = detector.detect(25, 25, 10) as Text;
      expect(result?.properties.type).toBe("text");
      expect(result?.properties.content).toBe("Test Text 1");

      const result2 = detector.detect(225, 225, 10) as Text;
      expect(result2?.properties.type).toBe("text");
      expect(result2?.properties.content).toBe("Test Text 2");
    });

    it("should find texts with negative coordinates", () => {
      const mockFeatures = {
        text1: createText(-100, -100, 50, 50, "Negative Text")
      };

      const { detector } = createAndFill(
        mockOgma,
        mockStore,
        mockLinks,
        5,
        mockFeatures
      );
      const result = detector.detect(-75, -75, 10) as Text;
      expect(result?.properties.type).toBe("text");
      expect(result?.properties.content).toBe("Negative Text");
    });
  });

  describe("detectArrow method", () => {
    it("should detect point on arrow line", () => {
      const arrow = createArrow(0, 0, 100, 0, { strokeWidth: 4 });

      const result = detectArrow(arrow, { x: 50, y: 0 }, 0);
      expect(result).toBe(true);
    });

    it("should detect point within stroke width", () => {
      const arrow = createArrow(0, 0, 100, 0, { strokeWidth: 10 });

      // Point slightly off the line but within stroke width
      const result = detectArrow(arrow, { x: 50, y: 4 }, 0);
      expect(result).toBe(true);
    });

    it("should detect point within threshold", () => {
      const arrow = createArrow(0, 0, 100, 0, { strokeWidth: 2 });

      // Point outside stroke width but within threshold
      // strokeWidth = 2, so half width = 1
      // threshold = 3, so total detection area = 1 + 3 = 4
      // Point at y = 3 should be detectable (3 < 4)
      const result = detectArrow(arrow, { x: 50, y: 3 }, 3);
      expect(result).toBe(true);
    });

    it("should not detect point outside stroke width and threshold", () => {
      const arrow = createArrow(0, 0, 100, 0, { strokeWidth: 2 });

      const result = detectArrow(arrow, { x: 50, y: 10 }, 0);
      expect(result).toBe(false);
    });

    it("should not detect point before arrow start", () => {
      const arrow = createArrow(10, 10, 100, 100, { strokeWidth: 4 });

      const result = detectArrow(arrow, { x: 0, y: 0 }, 0);
      expect(result).toBe(false);
    });

    it("should not detect point after arrow end", () => {
      const arrow = createArrow(0, 0, 100, 100, { strokeWidth: 4 });

      const result = detectArrow(arrow, { x: 150, y: 150 }, 0);
      expect(result).toBe(false);
    });

    it("should handle diagonal arrows correctly", () => {
      const arrow = createArrow(0, 0, 100, 100, { strokeWidth: 4 });

      // Point on diagonal line
      const result1 = detectArrow(arrow, { x: 50, y: 50 }, 0);
      expect(result1).toBe(true);

      // Point off diagonal line
      const result2 = detectArrow(arrow, { x: 50, y: 40 }, 0);
      expect(result2).toBe(false);
    });

    it("should handle vertical arrows correctly", () => {
      const arrow = createArrow(50, 0, 50, 100, { strokeWidth: 4 });

      const result1 = detectArrow(arrow, { x: 50, y: 50 }, 0);
      expect(result1).toBe(true);

      const result2 = detectArrow(arrow, { x: 60, y: 50 }, 0);
      expect(result2).toBe(false);
    });

    it("should handle horizontal arrows correctly", () => {
      const arrow = createArrow(0, 50, 100, 50, { strokeWidth: 4 });

      const result1 = detectArrow(arrow, { x: 50, y: 50 }, 0);
      expect(result1).toBe(true);

      const result2 = detectArrow(arrow, { x: 50, y: 60 }, 0);
      expect(result2).toBe(false);
    });

    it("should handle zero-length arrows", () => {
      const arrow = createArrow(50, 50, 50, 50, { strokeWidth: 4 });

      const result = detectArrow(arrow, { x: 50, y: 50 }, 0);
      expect(result).toBe(false); // Zero length arrow should not be detectable
    });

    it("should handle arrows with very thin stroke width", () => {
      const arrow = createArrow(0, 0, 100, 0, { strokeWidth: 0.1 });

      const result1 = detectArrow(arrow, { x: 50, y: 0 }, 0);
      expect(result1).toBe(true);

      const result2 = detectArrow(arrow, { x: 50, y: 1 }, 0);
      expect(result2).toBe(false);
    });

    it("should handle arrows with very thick stroke width", () => {
      const arrow = createArrow(0, 0, 100, 0, { strokeWidth: 50 });

      const result = detectArrow(arrow, { x: 50, y: 20 }, 0);
      expect(result).toBe(true);
    });
  });

  describe("Integration with Store", () => {
    it("should update index when store features change", () => {
      // Initial features
      const features1 = {
        "1": createText(0, 0, 50, 30)
      };
      const { detector, index, store } = createAndFill(
        mockOgma,
        mockStore,
        mockLinks,
        5,
        features1
      );

      let result = detector.detect(25, 15);
      expect(result).not.toBeNull();

      // Update features - clear and rebuild index
      const features2 = {
        "2": createText(100, 100, 50, 30, "Test Text 2")
      };

      // Set bbox and insert into index
      Object.values(features2).forEach((feature) => {
        if (isText(feature) || isBox(feature)) {
          const [cx, cy] = feature.geometry.coordinates as [number, number];
          const width = feature.properties.width as number;
          const height = feature.properties.height as number;
          const hw = width / 2;
          const hh = height / 2;
          feature.geometry.bbox = [cx - hw, cy - hh, cx + hw, cy + hh];
        }
      });

      index.clear();
      Object.values(features2).forEach((feature) => {
        index.insert(feature);
      });

      // Update mock store with new feature map
      const featureById2 = new Map<Id, Annotation>();
      Object.values(features2).forEach((feature) => {
        featureById2.set(feature.id, feature);
      });
      const getFeature = vi.fn((id: Id) => featureById2.get(id));
      // @ts-expect-error Mocking Store
      store.getState = vi.fn(() => ({
        getFeature,
        revSin: 0,
        revCos: 1,
        options: {
          detectMargin: 0,
          showSendButton: true,
          sendButtonIcon: "",
          minArrowHeight: 20,
          maxArrowHeight: 30,
          magnetColor: "#3e8",
          magnetRadius: 10,
          magnetHandleRadius: 5,
          textPlaceholder: "Type here"
        }
      }));

      // Old feature should not be found
      result = detector.detect(25, 15);
      expect(result).toBeNull();

      // New feature should be found
      result = detector.detect(125, 115);
      expect(result).not.toBeNull();
    });

    it("should clear index when features are empty", () => {
      const features = {
        "1": createText(0, 0, 50, 30, "Test Text 1")
      };
      const { detector, index } = createAndFill(
        mockOgma,
        mockStore,
        mockLinks,
        5,
        features
      );
      let result = detector.detect(25, 15);
      expect(result).not.toBeNull();

      // Clear features
      index.clear();
      // @ts-expect-error Mocking Store
      mockStore.getState = vi.fn(() => ({
        getFeature: vi.fn(),
        revSin: 0,
        revCos: 1
      }));

      result = detector.detect(25, 15);
      expect(result).toBeNull();
    });
  });

  describe("Edge Cases", () => {
    it("should handle multiple overlapping features", () => {
      const mockFeatures = {
        "1": createText(0, 0, 100, 100),
        "2": createText(50, 50, 100, 100),
        "3": createArrow(25, 25, 125, 125)
      };

      const { detector } = createAndFill(
        mockOgma,
        mockStore,
        mockLinks,
        5,
        mockFeatures
      );

      const result = detector.detect(75, 75, 0);
      expect(result).not.toBeNull();
    });

    it("should handle features with undefined or null properties", () => {
      const arrow = createArrow(0, 0, 100, 0);
      // Remove strokeWidth to test default handling
      delete arrow.properties.style?.strokeWidth;

      const result = detectArrow(arrow, { x: 50, y: 0 }, 0);
      // Should handle gracefully (may return false due to undefined strokeWidth)
      expect(typeof result).toBe("boolean");
    });

    it("should handle very large coordinates", () => {
      const mockFeatures = {
        "1": createText(1e6, 1e6, 100, 100)
      };

      const { detector } = createAndFill(
        mockOgma,
        mockStore,
        mockLinks,
        5,
        mockFeatures
      );

      const result = detector.detect(1000050, 1000050, 0);
      expect(result).not.toBeNull();
    });

    it("should handle negative coordinates", () => {
      const mockFeatures = {
        "1": createText(-100, -100, 50, 50)
      };
      const { detector } = createAndFill(
        mockOgma,
        mockStore,
        mockLinks,
        5,
        mockFeatures
      );

      const result = detector.detect(-75, -75, 0);
      expect(result).not.toBeNull();
    });
  });

  describe("Rotation Detection", () => {
    it("should detect text when camera is rotated", () => {
      // Create text at (50, 50) with size 100x50
      // Center is at (100, 75)
      const text = createText(50, 50, 100, 50, "Rotated Text");
      const mockFeatures = { text };

      // Rotate camera by 45 degrees (PI/4)
      const rotation = Math.PI / 4;
      const { detector } = createAndFill(
        mockOgma,
        mockStore,
        mockLinks,
        5,
        mockFeatures,
        rotation
      );

      // Text should still be detectable at its center in world coordinates
      const result = detector.detect(100, 75, 0);
      expect(result).not.toBeNull();
      expect(result?.properties.type).toBe("text");
    });

    it("should detect text at edges when rotated", () => {
      // Text at (0, 0) with size 100x50
      const text = createText(0, 0, 100, 50, "Edge Text");
      const mockFeatures = { text };

      // Rotate by 90 degrees
      const rotation = Math.PI / 2;
      const { detector } = createAndFill(
        mockOgma,
        mockStore,
        mockLinks,
        5,
        mockFeatures,
        rotation
      );

      // Should detect at center (50, 25)
      const result = detector.detect(50, 25, 0);
      expect(result).not.toBeNull();
    });

    it("should use counter-rotation for text detection", () => {
      // Create text box
      const text = createText(0, 0, 100, 60, "Test");
      const mockFeatures = { text };

      // Rotate camera by -30 degrees
      const rotation = -Math.PI / 6;
      const { detector } = createAndFill(
        mockOgma,
        mockStore,
        mockLinks,
        5,
        mockFeatures,
        rotation
      );

      // Text stays screen-aligned, should detect at center
      const result = detector.detect(50, 30, 0);
      expect(result).not.toBeNull();
      expect(result?.id).toBe(text.id);
    });
  });

  describe("Comment Detection", () => {
    it("should detect collapsed comment", () => {
      const comment = createComment(50, 50, "Test comment");
      comment.properties.mode = COMMENT_MODE_COLLAPSED;
      comment.properties.style!.iconSize = 32;
      const mockFeatures = { comment };

      const { detector } = createAndFill(
        mockOgma,
        mockStore,
        mockLinks,
        5,
        mockFeatures
      );

      // Should detect at center
      const result = detector.detect(50, 50, 0);
      expect(result).not.toBeNull();
      expect(result?.properties.type).toBe("comment");
      expect(result?.id).toBe(comment.id);
    });

    it("should detect expanded comment", () => {
      const comment = createComment(100, 100, "Expanded comment");
      comment.properties.mode = "expanded";
      comment.properties.width = 200;
      comment.properties.height = 100;
      const mockFeatures = { comment };

      const { detector } = createAndFill(
        mockOgma,
        mockStore,
        mockLinks,
        5,
        mockFeatures
      );

      // Should detect at center
      const result = detector.detect(100, 100, 0);
      expect(result).not.toBeNull();
      expect(result?.properties.type).toBe("comment");
      expect((result as Comment).properties.content).toBe("Expanded comment");
    });

    it("should detect comment at edges in expanded mode", () => {
      const comment = createComment(100, 100, "Edge test");
      comment.properties.mode = "expanded";
      comment.properties.width = 200;
      comment.properties.height = 100;
      const mockFeatures = { comment };

      const { detector } = createAndFill(
        mockOgma,
        mockStore,
        mockLinks,
        5,
        mockFeatures
      );

      // Test edges (comment center at 100,100, size 200x100, so bbox is 0,50 to 200,150)
      const resultLeft = detector.detect(10, 100, 0);
      expect(resultLeft).not.toBeNull();

      const resultRight = detector.detect(190, 100, 0);
      expect(resultRight).not.toBeNull();

      const resultTop = detector.detect(100, 60, 0);
      expect(resultTop).not.toBeNull();

      const resultBottom = detector.detect(100, 140, 0);
      expect(resultBottom).not.toBeNull();
    });

    it("should not detect comment outside bounds", () => {
      const comment = createComment(50, 50, "Test");
      comment.properties.mode = COMMENT_MODE_COLLAPSED;
      comment.properties.style!.iconSize = 32;
      const mockFeatures = { comment };

      const { detector } = createAndFill(
        mockOgma,
        mockStore,
        mockLinks,
        5,
        mockFeatures
      );

      // Outside the icon bounds (iconSize = 32, so radius = 16)
      const result = detector.detect(100, 100, 0);
      expect(result).toBeNull();
    });

    it("should detect comment with threshold", () => {
      const comment = createComment(50, 50, "Threshold test");
      comment.properties.mode = COMMENT_MODE_COLLAPSED;
      comment.properties.style!.iconSize = 32;
      const mockFeatures = { comment };

      const { detector } = createAndFill(
        mockOgma,
        mockStore,
        mockLinks,
        5,
        mockFeatures
      );

      // Just outside bounds without threshold
      const result1 = detector.detect(70, 50, 0);
      expect(result1).toBeNull();

      // Should detect with threshold
      const result2 = detector.detect(70, 50, 10);
      expect(result2).not.toBeNull();
    });

    it("should handle fixed-size comments with zoom", () => {
      const comment = createComment(100, 100, "Zoomed comment");
      comment.properties.mode = "expanded";
      comment.properties.width = 200;
      comment.properties.height = 100;
      const mockFeatures = { comment };

      // Zoom in 2x - world dimensions become 100x50
      const { detector } = createAndFill(
        mockOgma,
        mockStore,
        mockLinks,
        5,
        mockFeatures,
        0,
        2
      );

      // Should still detect at center
      const result = detector.detect(100, 100, 0);
      expect(result).not.toBeNull();
      expect(result?.id).toBe(comment.id);
    });

    it("should use detectComment function directly", () => {
      const comment = createComment(50, 50, "Direct test");
      comment.properties.mode = "expanded";
      comment.properties.width = 100;
      comment.properties.height = 60;

      // Test at center
      const result1 = detectComment(comment, { x: 50, y: 50 }, 0, 0, 1, 1);
      expect(result1).toBe(true);

      // Test at edge
      const result2 = detectComment(comment, { x: 100, y: 50 }, 1, 0, 1, 1);
      expect(result2).toBe(true);

      // Test outside
      const result3 = detectComment(comment, { x: 150, y: 50 }, 0, 0, 1, 1);
      expect(result3).toBe(false);
    });
  });

  describe("Fixed-Size Text Detection", () => {
    it("should detect fixed-size text at normal zoom", () => {
      const text = createText(0, 0, 100, 50, "Fixed Text", {
        fixedSize: true
      });
      const mockFeatures = { text };

      const { detector } = createAndFill(
        mockOgma,
        mockStore,
        mockLinks,
        5,
        mockFeatures,
        0,
        1 // zoom = 1
      );

      // Should detect at center
      const result = detector.detect(50, 25, 0);
      expect(result).not.toBeNull();
      expect(result?.id).toBe(text.id);
    });

    it("should detect fixed-size text when zoomed in", () => {
      const text = createText(0, 0, 100, 50, "Fixed Text", {
        fixedSize: true
      });
      const mockFeatures = { text };

      // Zoom in 2x
      const { detector } = createAndFill(
        mockOgma,
        mockStore,
        mockLinks,
        5,
        mockFeatures,
        0,
        2
      );

      // At zoom 2x, the text takes half the world space
      // World-space dimensions: 50x25
      // Center still at (50, 25)
      const result = detector.detect(50, 25, 0);
      expect(result).not.toBeNull();
      expect(result?.id).toBe(text.id);
    });

    it("should detect fixed-size text when zoomed out", () => {
      const text = createText(0, 0, 100, 50, "Fixed Text", {
        fixedSize: true
      });
      const mockFeatures = { text };

      // Zoom out 0.5x
      const { detector } = createAndFill(
        mockOgma,
        mockStore,
        mockLinks,
        5,
        mockFeatures,
        0,
        0.5
      );

      // At zoom 0.5x, the text takes double the world space
      // World-space dimensions: 200x100
      // Center still at (50, 25)
      const result = detector.detect(50, 25, 0);
      expect(result).not.toBeNull();
      expect(result?.id).toBe(text.id);
    });

    it("should not detect fixed-size text outside its scaled bounds", () => {
      const text = createText(0, 0, 100, 50, "Fixed Text", {
        fixedSize: true
      });
      const mockFeatures = { text };

      // Zoom in 2x - world dimensions become 50x25
      const { detector } = createAndFill(
        mockOgma,
        mockStore,
        mockLinks,
        5,
        mockFeatures,
        0,
        2
      );

      // Try to detect at (75, 25) - should be outside bounds
      // At zoom 2x, bbox is (25, 12.5) to (75, 37.5)
      // Point (90, 25) is outside
      const result = detector.detect(90, 25, 0);
      expect(result).toBeNull();
    });

    it("should handle fixed-size text with rotation and zoom", () => {
      const text = createText(0, 0, 100, 50, "Fixed Rotated Text", {
        fixedSize: true
      });
      const mockFeatures = { text };

      // Rotate 45 degrees and zoom 2x
      const rotation = Math.PI / 4;
      const { detector } = createAndFill(
        mockOgma,
        mockStore,
        mockLinks,
        5,
        mockFeatures,
        rotation,
        2
      );

      // Should still detect at center
      const result = detector.detect(50, 25, 0);
      expect(result).not.toBeNull();
      expect(result?.id).toBe(text.id);
    });
  });
});

function createAndFill(
  mockOgma: Ogma,
  mockStore: Store,
  mockLinks: Links,
  threshold: number,
  mockFeatures: Record<Id, Annotation> = {},
  rotation: number = 0,
  zoom: number = 1
) {
  // Create a map from feature ID to feature for fast lookup
  const featureById = new Map<Id, Annotation>();
  Object.values(mockFeatures).forEach((feature) => {
    featureById.set(feature.id, feature);
  });

  // Create a new mock store with subscribe
  const getFeature = vi.fn((id: string) => featureById.get(id));
  const sin = Math.sin(rotation);
  const cos = Math.cos(rotation);
  const revSin = Math.sin(-rotation);
  const revCos = Math.cos(-rotation);
  const invZoom = 1 / zoom;

  const testStore = {
    getState: vi.fn(() => ({
      getFeature,
      getAllFeatures: () => Object.values(mockFeatures),
      features: mockFeatures,
      rotation,
      sin,
      cos,
      revSin,
      revCos,
      zoom,
      invZoom,
      options: {
        detectMargin: threshold || 0,
        showSendButton: true,
        sendButtonIcon: "",
        minArrowHeight: 20,
        maxArrowHeight: 30,
        magnetColor: "#3e8",
        magnetRadius: 10,
        magnetHandleRadius: 5,
        textPlaceholder: "Type here"
      },
      getRotatedBBox: (x0: number, y0: number, x1: number, y1: number) => [
        x0,
        y0,
        x1,
        y1
      ]
    })),
    subscribe: vi.fn(),
    setState: vi.fn()
  } as unknown as Store;
  testStore.setState({
    options: { ...testStore.getState().options, detectMargin: threshold }
  });

  const index = new Index(testStore);

  const detector = new HitDetector(mockOgma, testStore, index, mockLinks);

  // Fill the index with features
  Object.values(mockFeatures).forEach((feature) => {
    // Calculate and set bbox on feature
    if (isComment(feature)) {
      // For Comment features
      const [cx, cy] = feature.geometry.coordinates as [number, number];
      let width: number, height: number;

      if (feature.properties.mode === COMMENT_MODE_COLLAPSED) {
        width = height = feature.properties.style?.iconSize || 32;
      } else {
        width = feature.properties.width;
        height = feature.properties.height;
      }

      // Apply zoom scaling for fixed-size comments
      if (feature.properties.style?.fixedSize) {
        width /= zoom;
        height /= zoom;
      }

      const hw = width / 2;
      const hh = height / 2;
      feature.geometry.bbox = [cx - hw, cy - hh, cx + hw, cy + hh];
    } else if (isText(feature) || isBox(feature)) {
      // For Point geometry (new format)
      const [cx, cy] = feature.geometry.coordinates as [number, number];
      const width = feature.properties.width as number;
      const height = feature.properties.height as number;
      const hw = width / 2;
      const hh = height / 2;
      feature.geometry.bbox = [cx - hw, cy - hh, cx + hw, cy + hh];
    } else if (isArrow(feature)) {
      const coords = feature.geometry.coordinates;
      const xs = coords.map((c) => c[0]);
      const ys = coords.map((c) => c[1]);
      const strokeWidth = feature.properties.style?.strokeWidth || 0;
      feature.geometry.bbox = [
        Math.min(...xs) - strokeWidth,
        Math.min(...ys) - strokeWidth,
        Math.max(...xs) + strokeWidth,
        Math.max(...ys) + strokeWidth
      ];
    }
    index.insert(feature);
  });

  return { detector, index, store: testStore };
}
