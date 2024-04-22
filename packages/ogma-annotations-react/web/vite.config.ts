import { defineConfig } from "vite";
import { resolve } from "path";
import react from "@vitejs/plugin-react";
export default defineConfig({
  base: "/ogma-annotations-control/",
  plugins: [react()],
  root: resolve(__dirname),
});
