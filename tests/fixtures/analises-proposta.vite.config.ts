import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { temaInicial } from '../../scripts/tema-vite';

// Visual proposal only: no application router, session, API or simulated identity.
export default defineConfig({
  root: fileURLToPath(new URL('./analises-proposta/', import.meta.url)),
  publicDir: fileURLToPath(new URL('../../public/', import.meta.url)),
  plugins: [react(), temaInicial()],
  build: {
    outDir: fileURLToPath(
      new URL('../../dist-analises-proposta/', import.meta.url),
    ),
    emptyOutDir: true,
  },
});
