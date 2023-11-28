import { defineConfig } from "vitest/dist/config";

export default defineConfig({
  test: {
    include: ['test/unit/**/*.test.ts'],
    environment: 'jsdom',
    threads: false,

  }
});