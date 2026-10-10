import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { temaInicial } from '../../scripts/tema-vite';
import { billingStatus } from './acesso';
import { paginaDensaExemplo, resumoDenso } from './apostas';

export default defineConfig({
  root: fileURLToPath(new URL('./apostas/', import.meta.url)),
  publicDir: fileURLToPath(new URL('../../public/', import.meta.url)),
  plugins: [
    react(),
    temaInicial(),
    {
      name: 'contrato-de-filtros-exclusivo-do-exercicio',
      load(id) {
        if (
          id.replaceAll('\\', '/').endsWith('/src/api/site-read.generated.ts')
        )
          return `export {FILTER_READ_CONTRACT as SITE_READ_CONTRACT} from ${JSON.stringify(fileURLToPath(new URL('./apostas-contract.generated.ts', import.meta.url)))};`;
      },
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
          const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
          const send = (data: unknown) => {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'no-store');
            res.end(JSON.stringify(data));
          };
          if (url.pathname === '/config.json')
            return send({ VITE_API_URL: `http://${req.headers.host}` });
          if (
            url.pathname === '/auth/session' ||
            url.pathname === '/auth/refresh'
          )
            return send(session);
          if (url.pathname === '/api/v1/billing/status')
            return send(billingStatus);
          if (url.pathname === '/api/v1/revisao/stats')
            return send({
              total: 0,
              por_motivo: {},
              idade_maxima_segundos: 0,
              mais_antiga_em: null,
            });
          if (url.pathname === '/api/v1/apostas')
            return send(
              paginaDensaExemplo(
                Number(url.searchParams.get('page') ?? 1),
                Number(url.searchParams.get('page_size') ?? 50),
              ),
            );
          if (url.pathname === '/api/v1/painel/filtrado')
            return send(resumoDenso);
          if (url.pathname.startsWith('/api/v1/filtros/'))
            return send({
              dimensao: url.pathname.split('/').at(-1),
              data: [
                {
                  id: url.searchParams.get('id') ?? '7',
                  nome: 'Exemplo demonstrativo',
                  ativa: true,
                },
              ],
              pagination: { page: 1, page_size: 20, total: 1 },
            });
          return next();
        });
      },
    },
  ],
  build: {
    outDir: fileURLToPath(
      new URL('../../dist-apostas-fixture/', import.meta.url),
    ),
    emptyOutDir: true,
  },
});
