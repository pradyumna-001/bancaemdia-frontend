import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { temaInicial } from '../../scripts/tema-vite';
import { billingStatus } from './acesso';
export default defineConfig({
  root: fileURLToPath(new URL('./privacidade/', import.meta.url)),
  publicDir: fileURLToPath(new URL('../../public/', import.meta.url)),
  plugins: [
    react(),
    temaInicial(),
    {
      name: 'privacidade-exclusiva-do-build-de-testes',
      configurePreviewServer(server) {
        let closed = false;
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
          const url = new URL(req.url ?? '/', 'http://fixture');
          const send = (body: unknown, status = 200) => {
            res.statusCode = status;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'no-store');
            res.end(JSON.stringify(body));
          };
          if (url.pathname === '/config.json')
            return send({ VITE_API_URL: `http://${req.headers.host}` });
          if (
            url.pathname === '/auth/session' ||
            url.pathname === '/auth/refresh'
          )
            return closed
              ? send({ code: 'account_inactive' }, 401)
              : send(session);
          if (url.pathname === '/api/v1/billing/status')
            return send({
              ...billingStatus,
              access: 'READ_ONLY',
              status: 'EXPIRED',
            });
          if (url.pathname === '/api/v1/revisao/stats')
            return send({
              total: 0,
              por_motivo: {},
              idade_maxima_segundos: 0,
              mais_antiga_em: null,
            });
          if (url.pathname === '/api/v1/usuario/me/export') {
            if (closed) return send({ code: 'account_inactive' }, 401);
            res.setHeader('Cache-Control', 'no-store');
            if (url.searchParams.get('formato') === 'xlsx') {
              res.setHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              );
              return res.end(
                readFileSync(
                  new URL('./privacidade-exemplo.xlsx', import.meta.url),
                ),
              );
            }
            return send({
              demonstracao: true,
              usuario: { nome: 'Demonstração' },
              apostas: [],
            });
          }
          if (
            url.pathname === '/api/v1/usuario/me' &&
            req.method === 'DELETE'
          ) {
            closed = true;
            return send({ status: 'anonymized' });
          }
          return next();
        });
      },
    },
  ],
  build: {
    outDir: fileURLToPath(
      new URL('../../dist-privacidade-fixture/', import.meta.url),
    ),
    emptyOutDir: true,
  },
});
