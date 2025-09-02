import { describe, it, expect, beforeEach, vi } from "vitest";
import { Index } from "../../src/interaction/spatialIndex";
import { Store } from "../../src/store";
import { createText, createArrow } from "../../src";

describe("Index (Spatial Index)", () => {
  let spatialIndex: Index;
  let mockStore: Store;
  let storeCallback: (features: Record<string, any>) => void;

  beforeEach(() => {
    // Mock the store subscribe method
    mockStore = {
      subscribe: vi.fn((selector, callback) => {
        storeCallback = callback;
        return vi.fn(); // unsubscribe function
      })
    } as unknown as Store;

    spatialIndex = new Index(mockStore);
  });

  describe("Constructor and Store Subscription", () => {
    it("should initialize and subscribe to store features", () => {
      expect(spatialIndex).toBeInstanceOf(Index);
      expect(mockStore.subscribe).toHaveBeenCalledWith(
        expect.any(Function), // state selector
        expect.any(Function)  // callback
      );
    });

    it("should clear and rebuild index when store features change", () => {
      const features = {
        "text1": createText(10, 10, 100, 50, "Test Text 1"),
        "arrow1": createArrow(50, 50, 150, 150)
      };

      // Trigger store callback
      storeCallback(features);

      // Verify features are in the spatial index
      const results = spatialIndex.search({
        minX: 0,
        minY: 0,
        maxX: 200,
        maxY: 200
      });

      expect(results).toHaveLength(2);
      expect(results.find(r => r.id === "text1")).toBeDefined();
      expect(results.find(r => r.id === "arrow1")).toBeDefined();
    });

    it("should reflect feature additions in spatial index", () => {
      // Start with empty features
      storeCallback({});
      
      let results = spatialIndex.search({
        minX: 0,
        minY: 0,
        maxX: 200,
        maxY: 200
      });
      expect(results).toHaveLength(0);

      // Add features
      const features = {
        "text1": createText(10, 10, 100, 50, "Test Text"),
        "arrow1": createArrow(50, 50, 150, 150)
      };
      
      storeCallback(features);

      results = spatialIndex.search({
        minX: 0,
        minY: 0,
        maxX: 200,
        maxY: 200
      });
      
      expect(results).toHaveLength(2);
      expect(results.map(r => r.id)).toContain("text1");
      expect(results.map(r => r.id)).toContain("arrow1");
    });

    it("should reflect feature removals in spatial index", () => {
      // Start with features
      const initialFeatures = {
        "text1": createText(10, 10, 100, 50, "Test Text 1"),
        "text2": createText(200, 200, 100, 50, "Test Text 2"),
        "arrow1": createArrow(50, 50, 150, 150)
      };
      
      storeCallback(initialFeatures);
      
      let results = spatialIndex.search({
        minX: 0,
        minY: 0,
        maxX: 300,
        maxY: 300
      });
      expect(results).toHaveLength(3);

      // Remove one feature
      const updatedFeatures = {
        "text1": createText(10, 10, 100, 50, "Test Text 1"),
        "arrow1": createArrow(50, 50, 150, 150)
      };
      
      storeCallback(updatedFeatures);

      results = spatialIndex.search({
        minX: 0,
        minY: 0,
        maxX: 300,
        maxY: 300
      });
      
      expect(results).toHaveLength(2);
      expect(results.map(r => r.id)).toContain("text1");
      expect(results.map(r => r.id)).toContain("arrow1");
      expect(results.map(r => r.id)).not.toContain("text2");
    });

    it("should clear index when all features are removed", () => {
      // Start with features
      const features = {
        "text1": createText(10, 10, 100, 50, "Test Text"),
        "arrow1": createArrow(50, 50, 150, 150)
      };
      
      storeCallback(features);
      
      let results = spatialIndex.search({
        minX: 0,
        minY: 0,
        maxX: 200,
        maxY: 200
      });
      expect(results).toHaveLength(2);

      // Remove all features
      storeCallback({});

      results = spatialIndex.search({
        minX: 0,
        minY: 0,
        maxX: 200,
        maxY: 200
      });
      
      expect(results).toHaveLength(0);
    });

    it("should handle feature updates (removal + addition)", () => {
      // Initial features
      const initialFeatures = {
        "text1": createText(10, 10, 100, 50, "Old Text"),
        "arrow1": createArrow(50, 50, 150, 150)
      };
      
      storeCallback(initialFeatures);

      // Updated features (text moved to different position)
      const updatedFeatures = {
        "text1": createText(300, 300, 100, 50, "New Text"), // moved position
        "arrow1": createArrow(50, 50, 150, 150),
        "text2": createText(500, 500, 100, 50, "Added Text") // new feature
      };
      
      storeCallback(updatedFeatures);

      // Search in old location should not find text1
      let results = spatialIndex.search({
        minX: 0,
        minY: 0,
        maxX: 200,
        maxY: 200
      });
      expect(results.map(r => r.id)).toContain("arrow1");
      expect(results.map(r => r.id)).not.toContain("text1");

      // Search in new location should find text1
      results = spatialIndex.search({
        minX: 250,
        minY: 250,
        maxX: 450,
        maxY: 400
      });
      expect(results.map(r => r.id)).toContain("text1");

      // Search for new feature
      results = spatialIndex.search({
        minX: 450,
        minY: 450,
        maxX: 650,
        maxY: 600
      });
      expect(results.map(r => r.id)).toContain("text2");
    });
  });

  describe("Spatial Index Methods", () => {
    beforeEach(() => {
      // Add some test features
      const features = {
        "text1": createText(0, 0, 100, 50, "Text 1"),
        "text2": createText(200, 200, 100, 50, "Text 2"),
        "arrow1": createArrow(100, 100, 200, 200)
      };
      storeCallback(features);
    });

    it("should implement compareMinX correctly", () => {
      const text1 = createText(10, 0, 50, 50, "Text 1");
      const text2 = createText(20, 0, 50, 50, "Text 2");
      
      const result = spatialIndex.compareMinX(text1, text2);
      expect(result).toBe(-10); // 10 - 20 = -10
    });

    it("should implement compareMinY correctly", () => {
      const text1 = createText(0, 10, 50, 50, "Text 1");
      const text2 = createText(0, 20, 50, 50, "Text 2");
      
      const result = spatialIndex.compareMinY(text1, text2);
      expect(result).toBe(-10); // 10 - 20 = -10
    });

    it("should implement toBBox correctly", () => {
      const text = createText(10, 20, 100, 50, "Test Text");
      
      const bbox = spatialIndex.toBBox(text);
      
      expect(bbox).toEqual({
        minX: 10,
        minY: 20,
        maxX: 110, // 10 + 100
        maxY: 70   // 20 + 50
      });
    });

    it("should support spatial queries", () => {
      // Query that should find text1 (0,0,100,50)
      let results = spatialIndex.search({
        minX: -10,
        minY: -10,
        maxX: 150,
        maxY: 100
      });
      expect(results.map(r => r.id)).toContain("text1");

      // Query that should find text2 (200,200,100,50)
      results = spatialIndex.search({
        minX: 150,
        minY: 150,
        maxX: 350,
        maxY: 300
      });
      expect(results.map(r => r.id)).toContain("text2");

      // Query that should find arrow1 (100,100 to 200,200)
      results = spatialIndex.search({
        minX: 50,
        minY: 50,
        maxX: 250,
        maxY: 250
      });
      expect(results.map(r => r.id)).toContain("arrow1");
    });
  });
});