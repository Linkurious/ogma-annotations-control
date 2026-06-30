import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

import { resolve } from "path";

// config for production builds
export default defineConfig({
  plugins: [
    dts({
      outDir: "dist/types",
      rollupTypes: true
    })
  ],
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
