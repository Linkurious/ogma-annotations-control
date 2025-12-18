import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
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
    // @ts-expect-error - libInjectCss has no types
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
      name: resolve(__dirname, "src/index.ts"),
      fileName: (format) => `index.${format === "umd" ? "" : "m"}js`,
      entry: resolve(__dirname, "src/index.ts")
    },

    rollupOptions: {
      external: [
        "@linkurious/ogma",
        "@linkurious/ogma-react",
        "react",
        "react-dom"
      ],
      output: {
        globals: {
          "@linkurious/ogma": "Ogma",
          "@linkurious/ogma-react": "OgmaReact",
          react: "React",
          "react-dom": "ReactDOM"
        }
      }
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
