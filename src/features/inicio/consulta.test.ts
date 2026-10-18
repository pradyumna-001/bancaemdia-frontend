import { expect, it } from 'vitest';
import { createApiClient } from '../../api/client';
import { parseConfig } from '../../lib/config';
import { inicioResposta } from '../../../tests/fixtures/inicio';
import { consultarInicio } from './consulta';
it('erro rápido não antecipa Retry-After mais longo das consultas paralelas', async () => {
  const client = createApiClient(
    parseConfig({ VITE_API_URL: 'http://127.0.0.1:8000' }),
    {
      fetcher: async (request) => {
        const path = new URL(request.url).pathname;
        return new Response('{}', {
          status: path.endsWith('/titulares')
            ? 503
            : path.endsWith('/contas')
              ? 429
              : 500,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': path.endsWith('/titulares') ? '120' : '61',
          },
        });
      },
    },
  );
  await expect(
    consultarInicio(client, new AbortController().signal),
  ).rejects.toMatchObject({ status: 503, retryAfterMs: 120000 });
});
it.each([
  ['contas', { dimensao: 'casas' }],
  ['contas', { pagination: { page: 2, page_size: 1, total: 0 } }],
  ['contas', { pagination: { page: 1, page_size: 5, total: 0 } }],
  ['contas', { pagination: { page: 1, page_size: 1, total: -1 } }],
  ['contas', { pagination: { page: 1, page_size: 1, total: 1.5 } }],
  [
    'contas',
    { pagination: { page: 1, page_size: 1, total: 9007199254740992 } },
  ],
  ['titulares', { total: -1 }],
  ['apostas', { data: 'invalid' }],
] as const)('rejeita presença inválida de %s %j', async (path, override) => {
  const client = createApiClient(
    parseConfig({ VITE_API_URL: 'http://127.0.0.1:8000' }),
    {
      fetcher: async (request) => {
        const url = new URL(request.url);
        const initial = inicioResposta(url.pathname);
        const value = url.pathname.endsWith('/' + path)
          ? { ...initial, ...override }
          : initial;
        return new Response(JSON.stringify(value), {
          headers: { 'Content-Type': 'application/json' },
        });
      },
    },
  );
  await expect(
    consultarInicio(client, new AbortController().signal),
  ).rejects.toMatchObject({ kind: 'invalid_response' });
});
