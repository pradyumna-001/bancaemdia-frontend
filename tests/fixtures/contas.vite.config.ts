import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { temaInicial } from '../../scripts/tema-vite';
import { billingStatus } from './acesso';
import { createContasFixture } from './contas';
export default defineConfig({
  root: fileURLToPath(new URL('./contas/', import.meta.url)),
  publicDir: fileURLToPath(new URL('../../public/', import.meta.url)),
  plugins: [
    react(),
    temaInicial(),
    {
      name: 'contas-somente-fixture',
      configurePreviewServer(server) {
        const api = createContasFixture();
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
          const send = (data: unknown, status = 200) => {
            res.statusCode = status;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'no-store');
            res.end(JSON.stringify(data));
          };
          if (url.pathname === '/config.json')
            return send({ VITE_API_URL: url.origin });
          if (
            url.pathname === '/auth/session' ||
            url.pathname === '/auth/refresh'
          )
            return send(session);
          if (url.pathname === '/api/v1/billing/status')
            return send(billingStatus);
          if (url.pathname === '/api/v1/revisao/stats')
            return send({
              total: 0,
              por_motivo: {},
              idade_maxima_segundos: 0,
              mais_antiga_em: null,
            });
          if (
            !url.pathname.startsWith('/api/v1/titulares') &&
            !url.pathname.startsWith('/api/v1/filtros/')
          )
            return next();
          let input = '';
          req.on('data', (chunk) => {
            input += chunk;
          });
          req.on('end', () => {
            const value = api.handle(
              req.method!,
              url,
              input ? JSON.parse(input) : {},
            );
            send(
              value ?? {},
              value === undefined
                ? 404
                : req.method === 'POST' && !url.pathname.endsWith('/ativar')
                  ? 201
                  : 200,
            );
          });
        });
      },
    },
  ],
  build: {
    outDir: fileURLToPath(
      new URL('../../dist-contas-fixture/', import.meta.url),
    ),
    emptyOutDir: true,
  },
});
