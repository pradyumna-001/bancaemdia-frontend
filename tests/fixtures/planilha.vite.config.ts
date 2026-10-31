import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { temaInicial } from '../../scripts/tema-vite';
import { billingStatus } from './acesso';
import { sheetFixture } from './planilha';
export default defineConfig({
  root: fileURLToPath(new URL('./planilha/', import.meta.url)),
  publicDir: fileURLToPath(new URL('../../public/', import.meta.url)),
  plugins: [
    react(),
    temaInicial(),
    {
      name: 'planilha-sessao-exclusiva-tests',
      configurePreviewServer(server) {
        const fixture = sheetFixture();
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
          const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
          const send = (data: unknown, status = 200) => {
            res.statusCode = status;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'private, no-store');
            res.end(JSON.stringify(data));
          };
          if (url.pathname === '/config.json')
            return send({ VITE_API_URL: `http://${req.headers.host}` });
          if (url.pathname === '/auth/session') return send(session);
          if (url.pathname === '/api/v1/billing/status')
            return send({ ...billingStatus, access: 'FULL_WRITE' });
          if (url.pathname === '/api/v1/revisao/stats')
            return send({
              total: 0,
              por_motivo: {},
              mais_antiga_em: null,
              idade_maxima_segundos: 0,
            });
          if (!url.pathname.startsWith('/api/v1/planilhas/')) return next();
          const chunks: Buffer[] = [];
          req.on('data', (chunk: Buffer) => chunks.push(chunk));
          req.on('end', () => {
            const raw = Buffer.concat(chunks).toString();
            const body = req.headers['content-type']?.includes(
              'application/json',
            )
              ? JSON.parse(raw)
              : undefined;
            const value = fixture.handle(
              req.method ?? 'GET',
              url.pathname,
              url.searchParams,
              body,
            );
            send(value.data, value.status);
          });
        });
      },
    },
  ],
  build: {
    outDir: fileURLToPath(
      new URL('../../dist-planilha-fixture/', import.meta.url),
    ),
    emptyOutDir: true,
  },
});
