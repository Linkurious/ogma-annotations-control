import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  base: "./",
  plugins: [react()],
  root: resolve(__dirname),
  // Bind all interfaces so Vite detects a port already held on 0.0.0.0
  // (localhost binds succeed on macOS even when 5173 is taken) and falls forward
  server: {
    host: "0.0.0.0"
  },
  build: {
    outDir: resolve(__dirname, "..", "..", "..", "docs", "public", "demo-react")
  }
});
