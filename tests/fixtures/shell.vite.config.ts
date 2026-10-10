import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { temaInicial } from '../../scripts/tema-vite';
import { billingStatus } from './acesso';
// Build separado: nenhuma entrada de sessão simulada participa de dist/.
export default defineConfig({
  root: fileURLToPath(new URL('./shell/', import.meta.url)),
  publicDir: fileURLToPath(new URL('../../public/', import.meta.url)),
  plugins: [
    react(),
    temaInicial(),
    {
      name: 'fila-simulada-apenas-na-demonstracao',
      configurePreviewServer(server) {
        server.middlewares.use('/config.json', (req, res) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              VITE_API_URL: 'http://' + req.headers.host,
              VITE_APP_ENV: 'production',
            }),
          );
        });
        server.middlewares.use('/api/v1/billing/status', (_req, res) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(billingStatus));
        });
        server.middlewares.use('/api/v1/apostas', (req, res) => {
          const query = new URL(req.url ?? '/', 'http://fixture.invalid')
            .searchParams;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              data: [],
              pagination: {
                page: Number(query.get('page') ?? 1),
                page_size: Number(query.get('page_size') ?? 50),
                total: 0,
              },
            }),
          );
        });
        server.middlewares.use('/testes/rota', (_req, res) => {
          res.setHeader('Content-Type', 'application/json');
          res.end('{}');
        });
        server.middlewares.use('/api/v1/revisao/stats', (_req, res) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              total: 12,
              por_motivo: {},
              idade_maxima_segundos: 0,
              mais_antiga_em: null,
            }),
          );
        });
      },
    },
  ],
  build: {
    outDir: fileURLToPath(
      new URL('../../dist-shell-fixture/', import.meta.url),
    ),
    emptyOutDir: true,
  },
});
