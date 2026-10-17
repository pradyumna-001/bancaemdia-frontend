import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { temaInicial } from '../../scripts/tema-vite';
import { billingStatus } from './acesso';
import {
  linkedTelegram,
  unlinkedTelegram,
  temporaryTelegramCode,
} from './telegram';

export default defineConfig({
  root: fileURLToPath(new URL('./telegram/', import.meta.url)),
  publicDir: fileURLToPath(new URL('../../public/', import.meta.url)),
  plugins: [
    react(),
    temaInicial(),
    {
      name: 'telegram-simulado-somente-no-build-de-testes',
      configurePreviewServer(server) {
        let status: typeof linkedTelegram | typeof unlinkedTelegram =
          unlinkedTelegram;
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
          let data: unknown;
          if (path === '/config.json')
            data = { VITE_API_URL: `http://${req.headers.host}` };
          else if (path === '/auth/session' || path === '/auth/refresh')
            data = session;
          else if (path === '/api/v1/billing/status')
            data = { ...billingStatus, access: 'READ_ONLY' };
          else if (path === '/api/v1/revisao/stats')
            data = {
              total: 0,
              por_motivo: {},
              idade_maxima_segundos: 0,
              mais_antiga_em: null,
            };
          else if (
            path === '/fixture/telegram/connect' &&
            req.method === 'POST'
          ) {
            status = linkedTelegram;
            data = { simulated: true };
          } else if (path === '/api/v1/telegram/link') {
            if (req.method === 'DELETE') {
              data = { revoked: status.linked };
              status = unlinkedTelegram;
            } else data = status;
          } else if (
            path === '/api/v1/telegram/link-codes' &&
            req.method === 'POST'
          ) {
            res.statusCode = 201;
            data = temporaryTelegramCode();
          } else return next();
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          res.end(JSON.stringify(data));
        });
      },
    },
  ],
  build: {
    outDir: fileURLToPath(
      new URL('../../dist-telegram-fixture/', import.meta.url),
    ),
    emptyOutDir: true,
  },
});
