import { defineConfig } from 'vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { libInjectCss } from 'vite-plugin-lib-inject-css';
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), libInjectCss(), dts({ include: ['src'] })],
  build: {
    lib: {
      name: 'index',
      entry: resolve(__dirname, 'src/index.tsx'),
    },
    rollupOptions: {
      external: ["@linkurious/ogma", "@linkurious/ogma-react", "@linkurious/ogma-annotations", "react", "react-dom"],
      output: {
        globals: {
          "@linkurious/ogma": "Ogma",
          "react": "react",
          "react-dom": "react-dom",
        },
      },
    },
  }
});
