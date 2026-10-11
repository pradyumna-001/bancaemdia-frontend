import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { temaInicial } from '../../scripts/tema-vite';

// Design review only. No session, API replacement, or production route.
export default defineConfig({
  root: fileURLToPath(new URL('./painel-proposta/', import.meta.url)),
  publicDir: fileURLToPath(new URL('../../public/', import.meta.url)),
  plugins: [react(), temaInicial()],
  build: {
    outDir: fileURLToPath(
      new URL('../../dist-painel-proposta/', import.meta.url),
    ),
    emptyOutDir: true,
  },
});
