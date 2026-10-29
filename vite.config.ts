/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    proxy: {
      // The score server runs separately; proxying keeps the browser same-origin.
      '/api': {
        target: process.env.VITE_API_PROXY ?? 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // sql.js ships as CommonJS. It must be pre-bundled so esbuild converts it to
  // ESM; excluding it serves the raw CJS file and the browser cannot import it.
  // The .wasm binary is fetched at runtime via locateFile, not bundled.
  optimizeDeps: { include: ['sql.js'] },
  build: {
    target: 'es2020',
    sourcemap: true,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          editor: ['@uiw/react-codemirror', '@codemirror/lang-sql', '@codemirror/theme-one-dark'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    testTimeout: 120_000,
    hookTimeout: 120_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx', 'src/data/worlds/**'],
    },
  },
});
