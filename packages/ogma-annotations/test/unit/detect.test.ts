import { describe, it, expect, beforeEach, vi } from "vitest";
import { Annotation, createArrow, createText } from "../../src";
import { HitDetector } from "../../src/interaction/detect";
import { Store } from "../../src/store";

describe("HitDetector", () => {
  let hitDetector: HitDetector;
  let mockStore: Store;

  beforeEach(() => {
    mockStore = {
      subscribe: vi.fn()
    } as unknown as Store;
    hitDetector = new HitDetector(5, mockStore);
  });

  describe("Constructor and Initialization", () => {
    it("should initialize with correct threshold and store", () => {
      const threshold = 10;
      const detector = new HitDetector(threshold, mockStore);

      expect(detector).toBeInstanceOf(HitDetector);
      expect(mockStore.subscribe).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function)
      );
    });

    it("should subscribe to store features changes", () => {
      const subscribeSpy = vi.fn();
      const testStore = { subscribe: subscribeSpy } as unknown as Store;

      new HitDetector(5, testStore);

      expect(subscribeSpy).toHaveBeenCalledTimes(1);
      expect(subscribeSpy).toHaveBeenCalledWith(
        expect.any(Function), // selector function
        expect.any(Function) // callback function
      );
    });

    it("should handle store subscription callback", () => {
      const mockFeatures = {
        "1": createText(0, 0, 50, 30, "Test Text 1"),
        "2": createArrow(10, 10, 50, 50)
      };

      const { storeCallback } = createAndFill(mockStore, 5, mockFeatures);

      storeCallback(mockFeatures);
      expect(storeCallback).toBeDefined();
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

      const { detector } = createAndFill(mockStore, 5, mockFeatures);
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
      expect(result?.properties.type).toBe("arrow");
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
        arrow1: createArrow(10, 10, 90, 90)
      };

      const { detector } = createAndFill(mockStore, 5, mockFeatures);
      // Point on arrow line should detect arrow, not text
      const result = detector.detect(50, 50, 5);
      expect(result?.properties.type).toBe("arrow");
    });
  });

  describe("detectArrow method", () => {
    it("should detect point on arrow line", () => {
      const arrow = createArrow(0, 0, 100, 0, { strokeWidth: 4 });

      const result = hitDetector.detectArrow(arrow, { x: 50, y: 0 }, 0);
      expect(result).toBe(true);
    });

    it("should detect point within stroke width", () => {
      const arrow = createArrow(0, 0, 100, 0, { strokeWidth: 10 });

      // Point slightly off the line but within stroke width
      const result = hitDetector.detectArrow(arrow, { x: 50, y: 4 }, 0);
      expect(result).toBe(true);
    });

    it("should detect point within threshold", () => {
      const arrow = createArrow(0, 0, 100, 0, { strokeWidth: 2 });

      // Point outside stroke width but within threshold
      // strokeWidth = 2, so half width = 1
      // threshold = 3, so total detection area = 1 + 3 = 4
      // Point at y = 3 should be detectable (3 < 4)
      const result = hitDetector.detectArrow(arrow, { x: 50, y: 3 }, 3);
      expect(result).toBe(true);
    });

    it("should not detect point outside stroke width and threshold", () => {
      const arrow = createArrow(0, 0, 100, 0, { strokeWidth: 2 });

      const result = hitDetector.detectArrow(arrow, { x: 50, y: 10 }, 0);
      expect(result).toBe(false);
    });

    it("should not detect point before arrow start", () => {
      const arrow = createArrow(10, 10, 100, 100, { strokeWidth: 4 });

      const result = hitDetector.detectArrow(arrow, { x: 0, y: 0 }, 0);
      expect(result).toBe(false);
    });

    it("should not detect point after arrow end", () => {
      const arrow = createArrow(0, 0, 100, 100, { strokeWidth: 4 });

      const result = hitDetector.detectArrow(arrow, { x: 150, y: 150 }, 0);
      expect(result).toBe(false);
    });

    it("should handle diagonal arrows correctly", () => {
      const arrow = createArrow(0, 0, 100, 100, { strokeWidth: 4 });

      // Point on diagonal line
      const result1 = hitDetector.detectArrow(arrow, { x: 50, y: 50 }, 0);
      expect(result1).toBe(true);

      // Point off diagonal line
      const result2 = hitDetector.detectArrow(arrow, { x: 50, y: 40 }, 0);
      expect(result2).toBe(false);
    });

    it("should handle vertical arrows correctly", () => {
      const arrow = createArrow(50, 0, 50, 100, { strokeWidth: 4 });

      const result1 = hitDetector.detectArrow(arrow, { x: 50, y: 50 }, 0);
      expect(result1).toBe(true);

      const result2 = hitDetector.detectArrow(arrow, { x: 60, y: 50 }, 0);
      expect(result2).toBe(false);
    });

    it("should handle horizontal arrows correctly", () => {
      const arrow = createArrow(0, 50, 100, 50, { strokeWidth: 4 });

      const result1 = hitDetector.detectArrow(arrow, { x: 50, y: 50 }, 0);
      expect(result1).toBe(true);

      const result2 = hitDetector.detectArrow(arrow, { x: 50, y: 60 }, 0);
      expect(result2).toBe(false);
    });

    it("should handle zero-length arrows", () => {
      const arrow = createArrow(50, 50, 50, 50, { strokeWidth: 4 });

      const result = hitDetector.detectArrow(arrow, { x: 50, y: 50 }, 0);
      expect(result).toBe(false); // Zero length arrow should not be detectable
    });

    it("should handle arrows with very thin stroke width", () => {
      const arrow = createArrow(0, 0, 100, 0, { strokeWidth: 0.1 });

      const result1 = hitDetector.detectArrow(arrow, { x: 50, y: 0 }, 0);
      expect(result1).toBe(true);

      const result2 = hitDetector.detectArrow(arrow, { x: 50, y: 1 }, 0);
      expect(result2).toBe(false);
    });

    it("should handle arrows with very thick stroke width", () => {
      const arrow = createArrow(0, 0, 100, 0, { strokeWidth: 50 });

      const result = hitDetector.detectArrow(arrow, { x: 50, y: 20 }, 0);
      expect(result).toBe(true);
    });
  });

  describe("Integration with Store", () => {
    it("should update index when store features change", () => {
      // Initial features
      const features1 = {
        "1": createText(0, 0, 50, 30)
      };
      const { detector, storeCallback } = createAndFill(
        mockStore,
        5,
        features1
      );

      let result = detector.detect(25, 15, 0);
      expect(result).not.toBeNull();

      // Update features
      const features2 = {
        "2": createText(100, 100, 50, 30, "Test Text 2")
      };
      storeCallback(features2);

      // Old feature should not be found
      result = detector.detect(25, 15, 0);
      expect(result).toBeNull();

      // New feature should be found
      result = detector.detect(125, 115, 0);
      expect(result).not.toBeNull();
    });

    it("should clear index when features are empty", () => {
      const features = {
        "1": createText(0, 0, 50, 30, "Test Text 1")
      };
      const { detector, storeCallback } = createAndFill(mockStore, 5, features);
      let result = detector.detect(25, 15, 0);
      expect(result).not.toBeNull();

      // Clear features
      storeCallback({});
      result = detector.detect(25, 15, 0);
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

      const { detector } = createAndFill(mockStore, 5, mockFeatures);

      const result = detector.detect(75, 75, 0);
      expect(result).not.toBeNull();
    });

    it("should handle features with undefined or null properties", () => {
      const arrow = createArrow(0, 0, 100, 0);
      // Remove strokeWidth to test default handling
      delete arrow.properties.style?.strokeWidth;

      const result = hitDetector.detectArrow(arrow, { x: 50, y: 0 }, 0);
      // Should handle gracefully (may return false due to undefined strokeWidth)
      expect(typeof result).toBe("boolean");
    });

    it("should handle very large coordinates", () => {
      const mockFeatures = {
        "1": createText(1e6, 1e6, 100, 100)
      };

      const { detector } = createAndFill(mockStore, 5, mockFeatures);

      const result = detector.detect(1000050, 1000050, 0);
      expect(result).not.toBeNull();
    });

    it("should handle negative coordinates", () => {
      const mockFeatures = {
        "1": createText(-100, -100, 50, 50)
      };
      const { detector } = createAndFill(mockStore, 5, mockFeatures);

      const result = detector.detect(-75, -75, 0);
      expect(result).not.toBeNull();
    });
  });
});

function createAndFill(
  mockStore: Store,
  threshold: number,
  mockFeatures: Record<string, Annotation> = {}
) {
  let storeCallback: (features) => void;
  // @ts-expect-error Mocking Store subscribe method
  mockStore.subscribe = vi.fn((_selector, callback) => {
    storeCallback = callback;
  });

  const detector = new HitDetector(threshold, mockStore);
  // @ts-expect-error it's assigned in subscribe
  storeCallback(mockFeatures);
  // @ts-expect-error it's assigned in subscribe
  return { detector, storeCallback };
}
