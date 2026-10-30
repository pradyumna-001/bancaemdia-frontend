import { webcrypto } from 'node:crypto';
import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createSession } from '../../auth/session';
import { sessionContext } from '../../auth/protocol';
import { createApiClient } from '../../api/client';
import { parseConfig } from '../../lib/config';
import {
  serializarConsulta,
  adaptarFiltros,
  lerFiltros,
} from '../../lib/params';
import { resultadosFixture } from '../../../tests/fixtures/resultados';
import { anteciparFila } from './ResultadosPage';

const clean: (() => void)[] = [];
beforeEach(() => vi.stubGlobal('crypto', webcrypto));
afterEach(() => {
  clean.splice(0).forEach((fn) => fn());
  vi.unstubAllGlobals();
});

async function preparar(autenticar = true) {
  const fixture = resultadosFixture();
  const requests: URL[] = [];
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30000 } },
  });
  const context = sessionContext({
    usuario_id: 1,
    nome: 'Teste',
    email: 'teste@example.org',
    session_version: `${crypto.randomUUID()}:1`,
    csrf_token: crypto.randomUUID(),
    refresh_required: false,
    access_expires_at: '2030-01-01T00:00:00Z',
    session_expires_at: '2030-01-02T00:00:00Z',
  });
  const service = createSession({
    baseUrl: 'https://site.example.org',
    queryClient,
    exclusive: async (_signal, work) => work(),
    transport: {
      read: async () => context,
      renew: async () => context,
      logout: async () => {},
    },
  });
  if (autenticar) await service.resume();
  const api = createApiClient(
    parseConfig({ VITE_API_URL: 'https://site.example.org' }),
    {
      captureSession: service.capture,
      fetcher: async (request) => {
        const url = new URL(request.url);
        requests.push(url);
        const response = fixture.handle('GET', url.pathname, url.searchParams);
        return new Response(JSON.stringify(response.data), {
          status: response.status,
          headers: { 'Content-Type': 'application/json' },
        });
      },
    },
  );
  clean.push(() => {
    service.dispose();
    queryClient.clear();
  });
  return { queryClient, service, api, requests };
}

it('antecipa a primeira página da fila com a mesma chave da página', async () => {
  const { queryClient, service, api, requests } = await preparar();
  const search = new URLSearchParams('casa=7');
  anteciparFila({ queryClient, service, api, search });
  const query = adaptarFiltros(
    lerFiltros(search, 'resultados'),
    'resultados',
  ).query;
  const key = [
    'resultados-fila',
    service.getSnapshot().privateEpoch,
    serializarConsulta(query),
  ];
  await vi.waitFor(() =>
    expect(queryClient.getQueryData(key)).toMatchObject({
      pages: [expect.objectContaining({ data: expect.any(Array) })],
    }),
  );
  expect(requests).toHaveLength(1);
  expect(requests[0]!.pathname).toBe('/api/v1/resultados/fila');
  expect(requests[0]!.searchParams.get('casa_id')).toBe('7');
});

it('sem sessão confirmada ou com filtro bloqueado não envia nada', async () => {
  const anonima = await preparar(false);
  anteciparFila({ ...anonima, search: new URLSearchParams() });
  const bloqueada = await preparar();
  anteciparFila({ ...bloqueada, search: new URLSearchParams('grupo=3') });
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(anonima.requests).toHaveLength(0);
  expect(bloqueada.requests).toHaveLength(0);
  expect(bloqueada.queryClient.getQueryCache().getAll()).toHaveLength(0);
});
