import { defineConfig } from "vitest/dist/config";

export default defineConfig({
  test: {
    include: ['test/unit/**/*.test.ts'],
    environment: 'jsdom',
    threads: false,
    reporters: ['default', 'junit'],
    outputFile: '../../reports/unit/annotations/junit-test-results.xml',
  }
});