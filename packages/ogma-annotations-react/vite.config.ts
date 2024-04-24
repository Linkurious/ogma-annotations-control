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
  // @ts-expect-error Types incompatible
  plugins: [react(), libInjectCss(), dts({ include: ["src"] })],
  build: {
    lib: {
      name: "index",
      fileName: (format) => `index.${format === "umd" ? "" : "m"}js`,
      entry: resolve(__dirname, "src/index.ts"),
    },

    rollupOptions: {
      external: [
        "@linkurious/ogma",
        "@linkurious/ogma-react",
        "react",
        "react-dom",
      ],
      output: {
        globals: {
          "@linkurious/ogma": "Ogma",
          "@linkurious/ogma-react": "OgmaReact",
          react: "React",
          "react-dom": "ReactDOM",
        },
      },
    },
  },
});
