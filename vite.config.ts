import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { temaInicial } from './scripts/tema-vite';
import { faviconMarca } from './scripts/favicon-vite';

export default defineConfig({
  plugins: [react(), temaInicial(), faviconMarca()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'tests/unit/**/*.test.mjs'],
    clearMocks: true,
  },
});
