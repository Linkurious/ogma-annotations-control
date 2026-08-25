import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/e2e/**/*.test.ts"],
    globalSetup: ["./test/print-ogma-build.mts"],
    // Browser-driven e2e tests start a Playwright/WebSocket session; retry
    // once to absorb transient connection/timing flakiness under CI load.
    retry: 2,
    // Each file spins up its own Chromium + vite preview server. Running
    // every file concurrently (vitest's default, effectively unbounded)
    // piles those up at once - fine locally, but on a constrained CI agent
    // the resulting CPU/memory contention makes every test dramatically
    // slower (a test that takes ~6s locally took 47s in CI), and once the
    // suite runs long enough to hit CI's own step timeout, the whole
    // process gets interrupted and every in-flight/pending test fails at
    // once ("Target page, context or browser has been closed") regardless
    // of its own correctness.
    //
    // Fully serializing (fileParallelism: false) fixed that cascade, but
    // traded it for the same failure mode from the other direction: dead
    // serial is slow enough that the *whole suite* now runs past the step
    // timeout and gets killed partway through. Capping concurrency instead
    // of removing it keeps peak concurrent Chromium instances low without
    // giving up all the parallel speedup.
    maxWorkers: 2,
    // beforeAll's session.start() (vite build + chromium.launch + page.goto)
    // comfortably clears the 10s default hookTimeout locally, but under CI's
    // slower/contended agent - especially with two files' beforeAll racing
    // to launch their own Chromium at once under maxWorkers: 2 - it can miss
    // that window (observed: "Hook timed out in 10000ms" on a beforeAll,
    // nothing to do with the test itself). Individual `it()` calls already
    // set their own generous per-test timeouts; this just gives the
    // once-per-file setup/teardown hooks the same kind of headroom.
    hookTimeout: 60000
  }
});
