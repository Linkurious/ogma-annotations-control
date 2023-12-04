import { defineConfig } from 'vite';
import { name } from './package.json';

// config for production builds
export default defineConfig({
  build: {
    sourcemap: true,
    lib: {
      entry: 'src/index.ts',
      fileName: 'index',

      name
    },
    minify: true
  },
});