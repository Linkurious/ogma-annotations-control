import { defineConfig } from "vitest/dist/config";

export default defineConfig({
  test: {
    include: ['test/unit/**/*.test.ts'],
    environment: 'jsdom',
    pool: 'forks',
    reporters: ['default', 'junit'],
    outputFile: '../../reports/unit/annotations/junit-test-results.xml',
  }
});