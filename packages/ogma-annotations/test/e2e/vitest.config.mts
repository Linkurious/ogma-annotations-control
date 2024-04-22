import { defineConfig } from "vitest/dist/config";

export default defineConfig({
  test: {
    include: ["test/e2e/**/*.test.ts"],
  },
});
