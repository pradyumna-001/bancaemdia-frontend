// @vitest-environment node
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { ApiError } from './error';
import { createApiClient } from './client';
import { paginacaoConsulta } from './query';
import { createAppQueryClient, atrasoConsulta } from '../app/queryClient';
import { parseConfig } from '../lib/config';
import { betsWithUnknownValues } from '../../tests/fixtures/api/responses';
const config = parseConfig({ VITE_API_URL: 'http://127.0.0.1:8000' });
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

it('normaliza sintaxe antes da API e preserva filtro válido após 422', async () => {
  const search = new URLSearchParams(
    'page=NaN&page_size=200&estado=PENDENTE&apagadas=1',
  );
  const before = search.toString();
  const called = vi.fn();
  server.use(
    http.get(config.apiUrl + '/api/v1/apostas', ({ request }) => {
      const params = new URL(request.url).searchParams;
      expect(params.get('page')).toBe('1');
      expect(params.get('page_size')).toBe('50');
      expect(params.get('estado')).toBe('PENDENTE');
      called();
      return HttpResponse.json(
        {
          detail: [
            {
              loc: ['query', 'estado'],
              type: 'value_error',
              msg: 'PRIVATE_MSG',
            },
          ],
        },
        { status: 422 },
      );
    }),
  );
  await expect(
    createApiClient(config).GET('/api/v1/apostas', {
      params: {
        query: {
          ...paginacaoConsulta('GET /api/v1/apostas', search),
          estado: search.get('estado'),
        },
      },
    }),
  ).rejects.toMatchObject({
    status: 422,
    invalidFields: [{ scope: 'query', field: 'estado' }],
  });
  expect(called).toHaveBeenCalledTimes(1);
  expect(search.toString()).toBe(before);
});
it('leitura 429 respeita Retry-After sem atrasar outro recurso', async () => {
  vi.useFakeTimers();
  vi.spyOn(Math, 'random').mockReturnValue(0);
  let attempts = 0;
  const times: number[] = [];
  server.use(
    http.get(config.apiUrl + '/api/v1/apostas', () => {
      attempts++;
      times.push(Date.now());
      return attempts === 1
        ? HttpResponse.json(
            { error: 'rate_limited' },
            { status: 429, headers: { 'Retry-After': '3' } },
          )
        : HttpResponse.json(betsWithUnknownValues);
    }),
    http.get(config.apiUrl + '/health', () =>
      HttpResponse.json({ status: 'ok' }),
    ),
  );
  const client = createApiClient(config);
  const cache = createAppQueryClient();
  try {
    const query = cache.fetchQuery({
      queryKey: ['apostas'],
      queryFn: ({ signal }) => client.GET('/api/v1/apostas', { signal }),
    });
    await vi.advanceTimersByTimeAsync(0);
    await vi.waitFor(() => expect(attempts).toBe(1));
    const independent = await cache.fetchQuery({
      queryKey: ['health'],
      queryFn: ({ signal }) => client.GET('/health', { signal }),
    });
    expect(independent.data?.status).toBe('ok');
    await vi.advanceTimersByTimeAsync(2500);
    expect(attempts).toBe(1);
    await vi.advanceTimersByTimeAsync(1000);
    await query;
    expect(attempts).toBe(2);
    expect(times[1]! - times[0]!).toBeGreaterThanOrEqual(3000);
  } finally {
    cache.clear();
  }
});
it.each([
  [500, 2],
  [503, 4],
  [429, 3],
  [401, 1],
  [402, 1],
  [409, 1],
  [422, 1],
] as const)(
  'leitura HTTP %s termina após %s chamadas e não entra em loop',
  async (status, count) => {
    vi.useFakeTimers();
    let attempts = 0;
    server.use(
      http.get(config.apiUrl + '/api/v1/apostas', () => {
        attempts++;
        return HttpResponse.json({ detail: 'synthetic' }, { status });
      }),
    );
    const cache = createAppQueryClient();
    const client = createApiClient(config);
    try {
      const assertion = expect(
        cache.fetchQuery({
          queryKey: ['apostas'],
          queryFn: ({ signal }) => client.GET('/api/v1/apostas', { signal }),
        }),
      ).rejects.toMatchObject({ status });
      await vi.runAllTimersAsync();
      await assertion;
      expect(attempts).toBe(count);
    } finally {
      cache.clear();
    }
  },
);
it('Retry-After longo não é truncado para antecipar uma chamada', async () => {
  vi.useFakeTimers();
  const cache = createAppQueryClient();
  const queryFn = vi.fn().mockRejectedValue(
    new ApiError('http', {
      status: 503,
      headers: new Headers({ 'Retry-After': '120' }),
    }),
  );
  try {
    await expect(
      cache.fetchQuery({ queryKey: ['apostas'], queryFn }),
    ).rejects.toMatchObject({ status: 503 });
    expect(queryFn).toHaveBeenCalledTimes(1);
    expect(
      atrasoConsulta(
        0,
        new ApiError('http', {
          status: 429,
          headers: new Headers({ 'Retry-After': '120' }),
        }),
      ),
    ).toBe(120_000);
  } finally {
    cache.clear();
  }
});
it.each(['network', 'timeout', 'cancelled', 'invalid_response'] as const)(
  'leitura %s tem no máximo uma tentativa extra; cancelamento não reinicia',
  async (kind) => {
    vi.useFakeTimers();
    const cache = createAppQueryClient();
    const queryFn = vi.fn().mockRejectedValue(new ApiError(kind));
    try {
      const assertion = expect(
        cache.fetchQuery({ queryKey: ['apostas'], queryFn }),
      ).rejects.toMatchObject({ kind });
      await vi.runAllTimersAsync();
      await assertion;
      expect(queryFn).toHaveBeenCalledTimes(
        kind === 'network' || kind === 'timeout' ? 2 : 1,
      );
    } finally {
      cache.clear();
    }
  },
);
it('timeout após commit fica desconhecido; mutations não tentam de novo', async () => {
  vi.useFakeTimers();
  let committed = 0;
  const client = createApiClient(config, {
    fetcher: async () => {
      committed++;
      return new Promise<Response>(() => {});
    },
  });
  const cache = createAppQueryClient();
  try {
    const mutation = cache.getMutationCache().build(cache, {
      mutationFn: () =>
        client.POST('/api/v1/apostas', {
          body: { casa: 'betano', odd: 2, stake_unidades: 1, freebet: false },
        }),
    });
    const assertion = expect(mutation.execute(undefined)).rejects.toMatchObject(
      { kind: 'timeout', outcomeUnknown: true },
    );
    await vi.runAllTimersAsync();
    await assertion;
    expect(committed).toBe(1);
  } finally {
    cache.clear();
  }
});
