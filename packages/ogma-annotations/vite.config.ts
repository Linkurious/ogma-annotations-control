import { defineConfig } from 'vite';
import { name } from './package.json';

// config for production builds
export default defineConfig({
  build: {
    sourcemap: false,
    lib: {
      entry: 'src/index.ts',
      fileName: 'index',
      name
    },
    rollupOptions: {
      external: ["@linkurious/ogma",],
      output: {
        globals: {
          "@linkurious/ogma": "Ogma"
        },
      },
    },
    minify: true
  },
});
