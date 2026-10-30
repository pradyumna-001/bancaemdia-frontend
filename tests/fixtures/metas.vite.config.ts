import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { temaInicial } from '../../scripts/tema-vite';
import { billingStatus } from './acesso';
import { createMetasFixture } from './metas';
export default defineConfig({
  root: fileURLToPath(new URL('./metas/', import.meta.url)),
  publicDir: fileURLToPath(new URL('../../public/', import.meta.url)),
  plugins: [
    react(),
    temaInicial(),
    {
      name: 'metas-sessao-somente-fixture',
      configurePreviewServer(server) {
        const scenarios = new Map<
          string,
          ReturnType<typeof createMetasFixture>
        >();
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
          const send = (value: unknown, status = 200) => {
            res.statusCode = status;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'no-store');
            res.end(JSON.stringify(value));
          };
          if (url.pathname === '/config.json')
            return send({ VITE_API_URL: url.origin });
          if (['/auth/session', '/auth/refresh'].includes(url.pathname)) {
            if (!req.headers.cookie?.includes('metas-demo='))
              res.setHeader(
                'Set-Cookie',
                `metas-demo=${randomUUID()}; Path=/; HttpOnly; SameSite=Strict`,
              );
            return send(session);
          }
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
            !url.pathname.startsWith('/api/v1/painel/metas') &&
            url.pathname !== '/api/v1/painel/preferencias'
          )
            return next();
          let input = '';
          req.on('data', (chunk) => {
            input += chunk;
          });
          req.on('end', () => {
            const scenario =
              /(?:^|;\s*)metas-demo=([a-f\d-]{36})(?:;|$)/.exec(
                req.headers.cookie ?? '',
              )?.[1] ?? 'direct-fixture';
            if (!scenarios.has(scenario))
              scenarios.set(scenario, createMetasFixture());
            const value = scenarios
              .get(scenario)!
              .handle(req.method!, url, input ? JSON.parse(input) : undefined);
            send(value.data, value.status);
          });
        });
      },
    },
  ],
  build: {
    outDir: fileURLToPath(
      new URL('../../dist-metas-fixture/', import.meta.url),
    ),
    emptyOutDir: true,
  },
});
