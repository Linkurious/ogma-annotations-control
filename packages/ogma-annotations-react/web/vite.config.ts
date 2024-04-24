import { defineConfig } from "vite";
import { resolve } from "path";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  root: resolve(__dirname),
  build: {
    outDir: resolve(
      __dirname,
      "..",
      "..",
      "..",
      "docs",
      "public",
      "demo-react"
    ),
  },
});
