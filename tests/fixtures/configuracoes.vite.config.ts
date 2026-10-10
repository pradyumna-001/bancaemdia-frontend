import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { temaInicial } from '../../scripts/tema-vite';
import { billingStatus } from './acesso';
import { unlinkedTelegram } from './telegram';

export default defineConfig({
  root: fileURLToPath(new URL('./configuracoes/', import.meta.url)),
  publicDir: fileURLToPath(new URL('../../public/', import.meta.url)),
  plugins: [
    react(),
    temaInicial(),
    {
      name: 'preferencias-simuladas-exclusivas-do-build-de-testes',
      configurePreviewServer(server) {
        let fuso = 'America/Sao_Paulo';
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
            res.setHeader('Cache-Control', 'no-store');
            res.end(JSON.stringify(data));
          };
          if (path === '/config.json')
            return send({ VITE_API_URL: `http://${req.headers.host}` });
          if (path === '/auth/session' || path === '/auth/refresh')
            return send(session);
          if (path === '/api/v1/billing/status') return send(billingStatus);
          if (path === '/api/v1/revisao/stats')
            return send({
              total: 0,
              por_motivo: {},
              idade_maxima_segundos: 0,
              mais_antiga_em: null,
            });
          if (path === '/api/v1/telegram/link') return send(unlinkedTelegram);
          if (path !== '/api/v1/painel/preferencias') return next();
          if (req.method === 'GET') return send({ fuso_horario: fuso });
          if (req.method !== 'PATCH') {
            res.statusCode = 405;
            return send({});
          }
          let body = '';
          req.on('data', (chunk) => {
            body += String(chunk);
          });
          req.on('end', () => {
            try {
              const data: unknown = JSON.parse(body);
              if (
                !data ||
                typeof data !== 'object' ||
                !('fuso_horario' in data) ||
                typeof data.fuso_horario !== 'string'
              )
                throw new Error('Entrada inválida');
              new Intl.DateTimeFormat('pt-BR', { timeZone: data.fuso_horario });
              fuso = data.fuso_horario;
              send({ fuso_horario: fuso });
            } catch {
              res.statusCode = 422;
              send({});
            }
          });
        });
      },
    },
  ],
  build: {
    outDir: fileURLToPath(
      new URL('../../dist-configuracoes-fixture/', import.meta.url),
    ),
    emptyOutDir: true,
  },
});
