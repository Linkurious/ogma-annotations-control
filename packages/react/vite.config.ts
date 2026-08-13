import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import { libInjectCss } from "vite-plugin-lib-inject-css";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      jsxRuntime: "classic"
    }),
    libInjectCss(),
    dts({
      outDir: "dist/types",
      rollupTypes: true,
      tsconfigPath: resolve(__dirname, "tsconfig-build.json")
    })
  ],
  define: { "process.env": { NODE_ENV: "production" } },
  build: {
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
      external: [
        /^@linkurious\/ogma($|\/)/,
        /^@linkurious\/ogma-react($|\/)/,
        /^@linkurious\/ogma-annotations($|\/)/,
        // The /ui entry imports the package's own main entry for the React
        // context so consumers share a single context instance (avoids the
        // "editor is undefined" dual-context bug).
        /^@linkurious\/ogma-annotations-react($|\/)/,
        /^vanilla-colorful($|\/)/,
        "react",
        "react-dom"
      ]
    }
  },
  test: {
    globals: true,
    environment: "jsdom",
    //setupFiles: "./test/setup.ts",
    coverage: {
      reporter: ["json", "cobertura"],
      include: ["src/**/*.{ts,tsx}"],
      all: true,
      reportsDirectory: "reports/coverage"
    }
  }
});
