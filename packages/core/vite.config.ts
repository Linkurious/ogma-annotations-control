import { defineConfig } from "vite";

import { resolve } from "path";

// config for production builds
//
// Declaration files (`dist/types`) are generated separately by
// `npm run types` (scripts/build-types.mjs, via rollup-plugin-dts) - a real
// chunked declaration bundle, so `Control` (and every other type shared
// between the `index`/`ui` entries below) is the exact same declaration
// wherever it's imported from, instead of each entry independently
// bundling its own copy. See scripts/build-types.mjs for why that matters.
export default defineConfig({
  build: {
    sourcemap: false,
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        ui: resolve(__dirname, "src/ui/index.ts")
      },
      // Multi-entry libs cannot use UMD; emit ESM (.mjs) and CJS (.js).
      formats: ["es", "cjs"],
      fileName: (format, entryName) =>
        `${entryName}.${format === "es" ? "mjs" : "js"}`
    },
    rollupOptions: {
      // Externalize @linkurious/ogma and every vanilla-colorful entry
      // (including deep imports like vanilla-colorful/lib/entrypoints/rgba.js).
      external: [/^@linkurious\/ogma($|\/)/, /^vanilla-colorful($|\/)/]
    },
    minify: true
  }
});
