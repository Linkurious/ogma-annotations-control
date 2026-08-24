// eslint-disable-next-line import/no-unresolved
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/unit/**/*.test.ts"],
    globalSetup: ["./test/print-ogma-build.mts"],
    setupFiles: ["vitest-canvas-mock"],
    environment: "jsdom",
    pool: "forks",
    reporters: ["default", "junit"],
    outputFile: "../../reports/unit/annotations/junit-test-results.xml"
  }
});
