import { defineConfig } from "vite";
import { resolve, dirname, basename } from "path";
import { fileURLToPath } from "url";
import { readdirSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Every worked-example page under web/*.html (index.html plus each
// standalone demo, e.g. lock-toolbar-item.html) - discovered dynamically
// so a newly added demo page is deployed automatically, without also
// having to remember to list it here.
const htmlEntries = Object.fromEntries(
  readdirSync(__dirname)
    .filter((file) => file.endsWith(".html"))
    .map((file) => [basename(file, ".html"), resolve(__dirname, file)])
);

export default defineConfig({
  base: "./",
  root: resolve(__dirname),
  build: {
    target: "esnext",
    outDir: resolve(__dirname, "..", "..", "..", "docs", "public", "demo"),
    rollupOptions: {
      input: htmlEntries
    }
  }
});
