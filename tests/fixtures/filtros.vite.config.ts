import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { temaInicial } from '../../scripts/tema-vite';
export default defineConfig({
  root: fileURLToPath(new URL('./filtros/', import.meta.url)),
  publicDir: fileURLToPath(new URL('../../public/', import.meta.url)),
  plugins: [react(), temaInicial()],
  build: {
    outDir: fileURLToPath(
      new URL('../../dist-filtros-fixture/', import.meta.url),
    ),
    emptyOutDir: true,
  },
});
