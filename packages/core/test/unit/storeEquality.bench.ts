import { bench, describe } from "vitest";
import { temporalEquality } from "../../src/store";
import type { Annotation, Arrow, Id, Text } from "../../src/types";
import { createArrow } from "../../src/types/features/Arrow";
import { createBox } from "../../src/types/features/Box";
import { createComment } from "../../src/types/features/Comment";
import { createText } from "../../src/types/features/Text";

/**
 * Performance benchmark comparing temporalEquality vs JSON.stringify
 *
 * This benchmark measures the performance difference between our custom
 * shallow equality function and the naive JSON.stringify approach for
 * detecting state changes in the undo/redo system.
 */

// Helper to create test states with realistic annotation data
function createTestState(numFeatures: number) {
  const features: Record<Id, Annotation> = {};

  for (let i = 0; i < numFeatures; i++) {
    // Create a mix of different annotation types
    if (i % 4 === 0) {
      features[i] = createComment(i * 10, i * 10, `Comment ${i}`);
    } else if (i % 4 === 1) {
      features[i] = createArrow(i * 10, i * 10, i * 10 + 50, i * 10 + 50);
    } else if (i % 4 === 2) {
      features[i] = createBox(i * 10, i * 10, 100, 100);
    } else {
      features[i] = createText(i * 10, i * 10, 100, 50, `Text ${i}`);
    }
  }

  return { features, drawingFeature: null };
}

describe("temporalEquality vs JSON.stringify - Small (10 features)", () => {
  const stateA = createTestState(10);
  const stateB = { ...stateA, features: { ...stateA.features } };

  bench("temporalEquality", () => {
    temporalEquality(stateA, stateB);
  });

  bench("JSON.stringify", () => {
    JSON.stringify(stateA) === JSON.stringify(stateB);
  });
});

describe("temporalEquality vs JSON.stringify - Medium (100 features)", () => {
  const stateA = createTestState(100);
  const stateB = { ...stateA, features: { ...stateA.features } };

  bench("temporalEquality", () => {
    temporalEquality(stateA, stateB);
  });

  bench("JSON.stringify", () => {
    JSON.stringify(stateA) === JSON.stringify(stateB);
  });
});

describe("temporalEquality vs JSON.stringify - Large (1000 features)", () => {
  const stateA = createTestState(1000);
  const stateB = { ...stateA, features: { ...stateA.features } };

  bench("temporalEquality", () => {
    temporalEquality(stateA, stateB);
  });

  bench("JSON.stringify", () => {
    JSON.stringify(stateA) === JSON.stringify(stateB);
  });
});

describe("With coordinate change - 100 features (early detection)", () => {
  const stateA = createTestState(100);
  const stateB = { ...stateA, features: { ...stateA.features } };

  // Modify first feature's coordinates (best case - early exit)
  stateB.features[0] = {
    ...stateB.features[0],
    geometry: {
      ...stateB.features[0].geometry,
      coordinates: [999, 999]
    }
  } as Text;

  bench("temporalEquality (detects change early)", () => {
    temporalEquality(stateA, stateB);
  });

  bench("JSON.stringify (must stringify all)", () => {
    JSON.stringify(stateA) === JSON.stringify(stateB);
  });
});

describe("With coordinate change - 1000 features (late detection)", () => {
  const stateA = createTestState(1000);
  const stateB = { ...stateA, features: { ...stateA.features } };

  // Modify middle feature's coordinates (worst case for temporalEquality)
  stateB.features[500] = {
    ...stateB.features[500],
    geometry: {
      ...stateB.features[500].geometry,
      coordinates: [999, 999]
    }
  } as Text;

  bench("temporalEquality (detects change at middle)", () => {
    temporalEquality(stateA, stateB);
  });

  bench("JSON.stringify (must stringify all)", () => {
    JSON.stringify(stateA) === JSON.stringify(stateB);
  });
});

describe("With style change - 1000 features", () => {
  const stateA = createTestState(1000);
  const stateB = { ...stateA, features: { ...stateA.features } };

  // Modify a feature's style
  stateB.features[500] = {
    ...stateB.features[500],
    properties: {
      ...stateB.features[500].properties,
      style: {
        ...stateB.features[500].properties.style,
        strokeColor: "#ff0000"
      }
    }
  } as Arrow;

  bench("temporalEquality (detects style change)", () => {
    temporalEquality(stateA, stateB);
  });

  bench("JSON.stringify (detects style change)", () => {
    JSON.stringify(stateA) === JSON.stringify(stateB);
  });
});

describe("No changes (identical states) - 1000 features", () => {
  const stateA = createTestState(1000);
  const stateB = stateA; // Same reference

  bench("temporalEquality (identical states)", () => {
    temporalEquality(stateA, stateB);
  });

  bench("JSON.stringify (identical states)", () => {
    JSON.stringify(stateA) === JSON.stringify(stateB);
  });
});
