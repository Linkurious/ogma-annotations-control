import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  base: "./",
  // @ts-expect-error Types incompatible
  plugins: [react()],
  root: resolve(__dirname),
  build: {
    outDir: resolve(__dirname, "..", "..", "..", "docs", "public", "demo-react")
  }
});
