import { defineConfig } from "vitest/dist/config";

export default defineConfig({
  test: {
    include: ['test/*.test.ts'],
    environment: 'node',
    pool: 'forks',
    reporters: ['default', 'junit'],
    outputFile: '../reports/unit/deps/junit-test-results.xml',
  }
});