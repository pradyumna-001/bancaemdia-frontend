import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { temaInicial } from '../../scripts/tema-vite';
import { billingStatus } from './acesso';
import { diarioDemo, gruposDemo, legado, filtrado } from './painel';

export default defineConfig({
  root: fileURLToPath(new URL('./painel/', import.meta.url)),
  publicDir: fileURLToPath(new URL('../../public/', import.meta.url)),
  plugins: [
    react(),
    temaInicial(),
    {
      name: 'painel-simulado-exclusivo-dos-testes',
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
          const send = (data: unknown) => {
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
            return send({ ...billingStatus, access: 'READ_ONLY' });
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
              data: [],
              pagination: { page: 1, page_size: 20, total: 0 },
            });
          if (url.pathname === '/api/v1/painel') return send(legado);
          if (url.pathname === '/api/v1/painel/filtrado') return send(filtrado);
          if (url.pathname === '/api/v1/painel/filtrado/diario') {
            const d = diarioDemo(
              url.searchParams.get('inicio_dia') ?? undefined,
              url.searchParams.get('dias_por_pagina') === '90' ? 90 : 14,
            );
            d.filtros = {
              ...d.filtros,
              ...Object.fromEntries(
                [...url.searchParams].filter(
                  ([k]) =>
                    !['dias_por_pagina', 'inicio_dia', 'fresh'].includes(k),
                ),
              ),
            };
            return send(d);
          }
          if (url.pathname === '/api/v1/painel/filtrado/grupos') {
            const g = gruposDemo();
            g.filtros = Object.fromEntries(
              [...url.searchParams].filter(
                ([k]) => !['page_size', 'cursor', 'fresh'].includes(k),
              ),
            );
            return send(g);
          }
          if (url.pathname === '/api/v1/painel/filtrado/detalhado/export') {
            res.setHeader(
              'Content-Type',
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            );
            res.setHeader('Cache-Control', 'no-store');
            return res.end(
              readFileSync(new URL('./painel-exemplo.xlsx', import.meta.url)),
            );
          }
          return next();
        });
      },
    },
  ],
  build: {
    outDir: fileURLToPath(
      new URL('../../dist-painel-fixture/', import.meta.url),
    ),
    emptyOutDir: true,
  },
});
