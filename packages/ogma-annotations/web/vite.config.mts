import { defineConfig } from "vite";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  base: "./",
  root: resolve(__dirname),
  build: {
    target: "esnext",
    outDir: resolve(__dirname, "..", "..", "..", "docs", "public", "demo")
  }
});
