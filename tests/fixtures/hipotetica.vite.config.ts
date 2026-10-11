import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { temaInicial } from '../../scripts/tema-vite';
import { billingStatus } from './acesso';
import examples from './hipotetica.json';

const fixture: Plugin = {
  name: 'hipotetica-simulada-exclusiva-do-build-de-testes',
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
      const url = new URL(req.url ?? '/', 'http://fixture.test');
      const send = (data: unknown) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify(data));
      };
      if (url.pathname === '/config.json')
        return send({ VITE_API_URL: `http://${req.headers.host}` });
      if (url.pathname === '/auth/session' || url.pathname === '/auth/refresh')
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
      if (url.pathname.startsWith('/api/v1/filtros/')) {
        const dimensao = url.pathname.split('/').at(-1)!;
        const id = url.searchParams.get('id') ?? '7';
        return send({
          dimensao,
          data: [
            {
              id,
              nome: dimensao === 'tipsters' ? 'Tipster de exemplo' : 'Exemplo',
              ativa: true,
            },
          ],
          pagination: { page: 1, page_size: 20, total: 1 },
        });
      }
      if (url.pathname !== '/api/v1/painel/hipotetica') return next();
      if (req.method !== 'GET') {
        res.statusCode = 405;
        return send({});
      }
      const data = structuredClone(examples.comparado);
      for (const [key, value] of url.searchParams) {
        if (key in data.filtros) {
          Reflect.set(
            data.filtros,
            key,
            ['incluir_apagadas', 'revisao_grave'].includes(key)
              ? value === 'true'
              : value,
          );
        }
      }
      return send(data);
    });
  },
};
export default defineConfig({
  root: fileURLToPath(new URL('./hipotetica/', import.meta.url)),
  publicDir: fileURLToPath(new URL('../../public/', import.meta.url)),
  plugins: [react(), temaInicial(), fixture],
  build: {
    outDir: fileURLToPath(
      new URL('../../dist-hipotetica-fixture/', import.meta.url),
    ),
    emptyOutDir: true,
  },
});
