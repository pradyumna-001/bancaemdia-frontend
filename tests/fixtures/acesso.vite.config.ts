import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { temaInicial } from '../../scripts/tema-vite';
import { billingStatus } from './acesso';
export default defineConfig({
  root: fileURLToPath(new URL('./acesso/', import.meta.url)),
  publicDir: fileURLToPath(new URL('../../public/', import.meta.url)),
  plugins: [
    react(),
    temaInicial(),
    {
      name: 'acesso-simulado-somente-no-build-de-testes',
      configurePreviewServer(server) {
        server.middlewares.use('/api/v1/billing/status', (_req, res) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ...billingStatus, access: 'READ_ONLY' }));
        });
        server.middlewares.use('/api/v1/apostas', (_req, res) => {
          res.statusCode = 402;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ detail: 'account_read_only' }));
        });
      },
    },
  ],
  build: {
    outDir: fileURLToPath(
      new URL('../../dist-acesso-fixture/', import.meta.url),
    ),
    emptyOutDir: true,
  },
});
