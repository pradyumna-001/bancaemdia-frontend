import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { temaInicial } from '../../scripts/tema-vite';
import { billingStatus } from './acesso';
import { createTrocaFixture } from './troca';
export default defineConfig({
  root: fileURLToPath(new URL('./troca/', import.meta.url)),
  publicDir: fileURLToPath(new URL('../../public/', import.meta.url)),
  plugins: [
    react(),
    temaInicial(),
    {
      name: 'troca-sessao-somente-fixture',
      configurePreviewServer(server) {
        const scenarios = new Map<
          string,
          ReturnType<typeof createTrocaFixture>
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
          if (url.pathname === '/config.json') {
            return send({ VITE_API_URL: url.origin });
          }
          if (['/auth/session', '/auth/refresh'].includes(url.pathname)) {
            if (!req.headers.cookie?.includes('troca-demo='))
              res.setHeader(
                'Set-Cookie',
                `troca-demo=${randomUUID()}; Path=/; HttpOnly; SameSite=Strict`,
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
          if (url.pathname.startsWith('/api/v1/filtros/'))
            return send({
              dimensao: url.pathname.split('/').at(-1),
              data: [{ id: '7', nome: 'Betano', ativa: true }],
              pagination: { page: 1, page_size: 20, total: 1 },
            });
          if (!url.pathname.startsWith('/api/v1/titulares/')) return next();
          let input = '';
          req.on('data', (chunk) => {
            input += chunk;
          });
          req.on('end', () => {
            const scenario =
              /(?:^|;\s*)troca-demo=([a-f\d-]{36})(?:;|$)/.exec(
                req.headers.cookie ?? '',
              )?.[1] ?? 'direct-fixture';
            if (!scenarios.has(scenario))
              scenarios.set(scenario, createTrocaFixture());
            const api = scenarios.get(scenario)!;
            const value = api.handle(
              req.method!,
              url,
              String(req.headers['idempotency-key'] ?? ''),
              input ? JSON.parse(input) : undefined,
            );
            send(
              value ?? { detail: 'swap_intention_unknown' },
              value ? 200 : 404,
            );
          });
        });
      },
    },
  ],
  build: {
    outDir: fileURLToPath(
      new URL('../../dist-troca-fixture/', import.meta.url),
    ),
    emptyOutDir: true,
  },
});
