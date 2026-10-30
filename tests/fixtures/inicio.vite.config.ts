import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { temaInicial } from '../../scripts/tema-vite';
import { billingStatus } from './acesso';
import { inicioResposta } from './inicio';
export default defineConfig({
  root: fileURLToPath(new URL('./inicio/', import.meta.url)),
  publicDir: fileURLToPath(new URL('../../public/', import.meta.url)),
  plugins: [
    react(),
    temaInicial(),
    {
      name: 'inicio-sessao-somente-fixture',
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
          const send = (value: unknown) => {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'no-store');
            res.end(JSON.stringify(value));
          };
          if (url.pathname === '/config.json')
            return send({ VITE_API_URL: url.origin });
          if (['/auth/session', '/auth/refresh'].includes(url.pathname))
            return send(session);
          if (url.pathname === '/api/v1/billing/status')
            return send({
              ...billingStatus,
              trial_ends_at: '2026-10-25T12:00:00Z',
            });
          if (url.pathname === '/api/v1/revisao/stats')
            return send({
              total: 0,
              por_motivo: {},
              idade_maxima_segundos: 0,
              mais_antiga_em: null,
            });
          const response = inicioResposta(url.pathname);
          if (response) return send(response);
          return next();
        });
      },
    },
  ],
  build: {
    outDir: fileURLToPath(
      new URL('../../dist-inicio-fixture/', import.meta.url),
    ),
    emptyOutDir: true,
  },
});
