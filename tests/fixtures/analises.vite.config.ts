import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { temaInicial } from '../../scripts/tema-vite';
import { billingStatus } from './acesso';
import { analises, caixaAnalises } from './analises';
export default defineConfig({
  root: fileURLToPath(new URL('./analises/', import.meta.url)),
  publicDir: fileURLToPath(new URL('../../public/', import.meta.url)),
  plugins: [
    react(),
    temaInicial(),
    {
      name: 'analises-identidade-exclusivamente-fixture',
      configurePreviewServer(server) {
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
          let data: unknown;
          if (url.pathname === '/config.json')
            data = { VITE_API_URL: url.origin };
          else if (['/auth/session', '/auth/refresh'].includes(url.pathname))
            data = session;
          else if (url.pathname === '/api/v1/billing/status')
            data = { ...billingStatus, access: 'READ_ONLY' };
          else if (url.pathname === '/api/v1/revisao/stats')
            data = {
              total: 0,
              por_motivo: {},
              idade_maxima_segundos: 0,
              mais_antiga_em: null,
            };
          else if (url.pathname === '/api/v1/painel/analises') data = analises;
          else if (url.pathname === '/api/v1/painel') data = caixaAnalises;
          else if (url.pathname.startsWith('/api/v1/filtros/'))
            data = {
              dimensao: url.pathname.split('/').at(-1),
              data: url.pathname.endsWith('/casas')
                ? [{ id: '7', nome: 'Betano', ativa: true }]
                : [],
              pagination: {
                page: 1,
                page_size: 20,
                total: url.pathname.endsWith('/casas') ? 1 : 0,
              },
            };
          else return next();
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          res.end(JSON.stringify(data));
        });
      },
    },
  ],
  build: {
    outDir: fileURLToPath(
      new URL('../../dist-analises-fixture/', import.meta.url),
    ),
    emptyOutDir: true,
  },
});
