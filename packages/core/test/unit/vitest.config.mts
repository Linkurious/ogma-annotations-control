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
    outputFile: "../../reports/unit/annotations/junit-test-results.xml",
    coverage: {
      // CI's "test:unit" (no --coverage flag) is what actually runs per-PR —
      // must be on unconditionally or the cobertura file never gets written.
      enabled: true,
      provider: "v8",
      reporter: ["text", "json", "cobertura"],
      include: ["src/**/*.ts"],
      // Same "../../" climb as outputFile above: cwd is packages/core when
      // this runs, so this lands at the repo-root reports/ tree CI scans
      // for `reports/**/cobertura-coverage.xml`.
      reportsDirectory: "../../reports/coverage/core"
    }
  }
});
