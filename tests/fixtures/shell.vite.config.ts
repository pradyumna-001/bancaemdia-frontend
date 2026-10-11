import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { temaInicial } from '../../scripts/tema-vite';
import { randomUUID } from 'node:crypto';
import { billingStatus } from './acesso';
import { createContasFixture } from './contas';
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
        const contas = createContasFixture();
        const session = {
          usuario_id: 1,
          nome: 'Demonstração',
          email: 'sandbox@example.org',
          session_version: `${randomUUID()}:1`,
          csrf_token: randomUUID(),
          refresh_required: false,
          access_expires_at: '2030-01-01T00:00:00Z',
          session_expires_at: '2030-01-02T00:00:00Z',
        };
        server.middlewares.use((req, res, next) => {
          const url = new URL(req.url!, `http://${req.headers.host}`);
          const send = (data: unknown) => {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'no-store');
            res.end(JSON.stringify(data));
          };
          if (url.pathname === '/config.json')
            return send({ VITE_API_URL: url.origin });
          if (url.pathname === '/auth/session') return send(session);
          if (url.pathname === '/api/v1/billing/status')
            return send(billingStatus);
          if (req.method === 'GET') {
            const data = contas.handle('GET', url, {});
            if (data !== undefined) return send(data);
          }
          next();
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
