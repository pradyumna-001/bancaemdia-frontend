import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { temaInicial } from '../../scripts/tema-vite';
import { billingStatus } from './acesso';

export default defineConfig({
  root: fileURLToPath(new URL('./midia/', import.meta.url)),
  publicDir: fileURLToPath(new URL('../../public/', import.meta.url)),
  plugins: [
    react(),
    temaInicial(),
    {
      name: 'foto-sintetica-e-sessao-exclusivas-dos-testes',
      configurePreviewServer(server) {
        const photo = readFileSync(
          new URL('./midia/foto.png', import.meta.url),
        );
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
          const send = (data: unknown) => {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'private, no-store');
            res.end(JSON.stringify(data));
          };
          if (path === '/config.json')
            return send({ VITE_API_URL: `http://${req.headers.host}` });
          if (path === '/auth/session') return send(session);
          if (path === '/api/v1/billing/status')
            return send({ ...billingStatus, access: 'READ_ONLY' });
          if (path === '/api/v1/revisao/stats')
            return send({
              total: 0,
              por_motivo: {},
              mais_antiga_em: null,
              idade_maxima_segundos: 0,
            });
          if (!path?.startsWith('/api/v1/apostas/') || !path.endsWith('/foto'))
            return next();
          if (path.includes('/sem-foto/')) {
            res.statusCode = 404;
            return send({ detail: 'não achei a foto desta aposta' });
          }
          res.setHeader('Content-Type', 'image/png');
          res.setHeader('Cache-Control', 'private, no-store');
          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.end(photo);
        });
      },
    },
  ],
  build: {
    outDir: fileURLToPath(
      new URL('../../dist-midia-fixture/', import.meta.url),
    ),
    emptyOutDir: true,
  },
});
