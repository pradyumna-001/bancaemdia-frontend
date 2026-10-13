import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { temaInicial } from '../../scripts/tema-vite';
import { billingStatus } from './acesso';
import { printItem, printIntent } from './prints';
import type { PrintItem } from '../../src/features/prints/model';

export default defineConfig({
  root: fileURLToPath(new URL('./prints/', import.meta.url)),
  publicDir: fileURLToPath(new URL('../../public/', import.meta.url)),
  plugins: [
    react(),
    temaInicial(),
    {
      name: 'prints-e-sessao-exclusivos-dos-testes',
      configurePreviewServer(server) {
        const items = new Map<string, PrintItem>();
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
          const path = req.url?.split('?')[0];
          const send = (data: unknown, status = 200) => {
            res.statusCode = status;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'private, no-store');
            res.end(JSON.stringify(data));
          };
          if (path === '/config.json')
            return send({ VITE_API_URL: `http://${req.headers.host}` });
          if (path === '/auth/session') return send(session);
          if (path === '/api/v1/billing/status')
            return send({ ...billingStatus, access: 'FULL_WRITE' });
          if (path === '/api/v1/revisao/stats')
            return send({
              total: 1,
              por_motivo: { FOTO: 1 },
              mais_antiga_em: null,
              idade_maxima_segundos: 0,
            });
          const match = path?.match(
            /^\/api\/v1\/prints\/intencoes\/([\da-f-]{36})(?:\/itens\/([\da-f-]{36}))?$/,
          );
          if (!match) return next();
          const [, intent, item] = match;
          if (req.method === 'POST' && item) {
            req.resume();
            req.on('end', () => {
              const number = items.size;
              const data = printItem({
                intent_id: intent!,
                item_id: item,
                status: 'completed',
                outcome:
                  number % 3 === 0
                    ? 'materialized'
                    : number % 3 === 1
                      ? 'review'
                      : 'duplicate',
                duplicate: number % 3 === 2,
                progress_percent: 100,
                results: [
                  {
                    type: number % 3 === 1 ? 'review' : 'materialized',
                    bet_key: number % 3 === 1 ? null : 'demo',
                    review_ids: number % 3 === 1 ? [1] : [],
                  },
                ],
              });
              items.set(item, data);
              send(data, 202);
            });
            return;
          }
          if (item)
            return items.has(item)
              ? send(items.get(item))
              : send({ detail: 'não encontrado' }, 404);
          const received = [...items.values()].filter(
            (value) => value.intent_id === intent,
          );
          return received.length
            ? send(
                printIntent(received, {
                  intent_id: intent!,
                  state: 'complete',
                }),
              )
            : send({ detail: 'não encontrado' }, 404);
        });
      },
    },
  ],
  build: {
    outDir: fileURLToPath(
      new URL('../../dist-prints-fixture/', import.meta.url),
    ),
    emptyOutDir: true,
  },
});
