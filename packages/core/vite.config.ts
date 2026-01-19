import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

import { resolve } from "path";
import { name } from "./package.json";

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
      entry: resolve(__dirname, "src/index.ts"),
      fileName: (format) => `index.${format === "umd" ? "" : "m"}js`,
      name
    },
    rollupOptions: {
      external: ["@linkurious/ogma"],
      output: {
        globals: {
          "@linkurious/ogma": "Ogma"
        }
      }
    },
    minify: true
  }
});
