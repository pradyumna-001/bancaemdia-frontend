import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { temaInicial } from '../../scripts/tema-vite';
import { billingStatus } from './acesso';
import { casasManual, matrizManual, reciboManual, manualKey } from './manual';
import { detalheExemplo } from './detalhe';
export default defineConfig({
  root: fileURLToPath(new URL('./manual/', import.meta.url)),
  publicDir: fileURLToPath(new URL('../../public/', import.meta.url)),
  plugins: [
    react(),
    temaInicial(),
    {
      name: 'aposta-manual-exclusiva-do-build-de-testes',
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
        const receipts = new Map<string, typeof reciboManual>();
        server.middlewares.use((req, res, next) => {
          const url = new URL(req.url ?? '/', 'http://fixture');
          const send = (body: unknown, status = 200) => {
            res.statusCode = status;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'no-store');
            res.end(JSON.stringify(body));
          };
          if (url.pathname === '/config.json')
            return send({ VITE_API_URL: `http://${req.headers.host}` });
          if (['/auth/session', '/auth/refresh'].includes(url.pathname))
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
          if (url.pathname === '/api/v1/filtros/casas')
            return send(casasManual);
          if (url.pathname === '/api/v1/titulares/casas/7/matriz')
            return send(matrizManual);
          if (url.pathname.startsWith('/api/v1/apostas-manuais/operacoes/')) {
            const id = url.pathname.split('/').at(-1)!;
            if (req.method === 'POST') {
              req.resume();
              const receipt = { ...reciboManual, intencao_id: id };
              receipts.set(id, receipt);
              return send(receipt, 201);
            }
            return receipts.has(id)
              ? send(receipts.get(id))
              : send({ detail: 'manual_intention_not_found' }, 404);
          }
          if (
            decodeURIComponent(url.pathname) ===
            '/api/v1/apostas/' + manualKey
          )
            return send({
              ...detalheExemplo,
              aposta: {
                ...detalheExemplo.aposta,
                chave: manualKey,
                evento: 'Palmeiras × Santos',
                descricao: 'Mais de 2,5 gols',
                origem: 'manual',
                estado: 'PENDENTE',
                freebet: true,
                valor_aposta_centavos: 10000,
                stake_centavos: 0,
                retorno_centavos: null,
                lucro_centavos: null,
                conta_contexto: null,
                conta_casa_id: null,
                conta_atribuicao: 'UNASSIGNED',
              },
              selecoes: {
                casa: 'Betano',
                evento: 'Palmeiras × Santos',
                descricao: 'Mais de 2,5 gols',
                mercado: 'Total de gols',
              },
              eventos: [],
              revisao_pendente: null,
            });
          return next();
        });
      },
    },
  ],
  build: {
    outDir: fileURLToPath(
      new URL('../../dist-manual-fixture/', import.meta.url),
    ),
    emptyOutDir: true,
  },
});
