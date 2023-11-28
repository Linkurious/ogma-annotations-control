import { defineConfig } from 'vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), dts({ include: ['src'] })],
  build: {
    lib: {
      name: 'ogma-annotations-react',
      entry: resolve(__dirname, 'src/index.tsx'),
    }
  }
});