import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { temaInicial } from './scripts/tema-vite';
import { faviconMarca } from './scripts/favicon-vite';

export default defineConfig({
  plugins: [react(), temaInicial(), faviconMarca()],
  build: { manifest: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'tests/unit/**/*.test.mjs'],
    clearMocks: true,
    coverage: {
      provider: 'v8',
      all: true,
      include: [
        'src/lib/**/*.{ts,tsx}',
        'src/features/**/*.{ts,tsx}',
        'src/api/**/*.ts',
      ],
      exclude: ['**/*.test.{ts,tsx}', '**/*.d.ts'],
      reporter: ['text', 'json-summary', 'html', 'lcov'],
      thresholds: {
        perFile: true,
        lines: 80,
        statements: 80,
        functions: 80,
        branches: 80,
      },
    },
  },
});
