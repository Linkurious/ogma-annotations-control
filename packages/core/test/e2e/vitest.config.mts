import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/e2e/**/*.test.ts"],
    globalSetup: ["./test/print-ogma-build.mts"],
    // Browser-driven e2e tests start a Playwright/WebSocket session; retry
    // once to absorb transient connection/timing flakiness under CI load.
    retry: 2
  }
});
