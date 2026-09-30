// @vitest-environment node
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { parseConfig } from '../lib/config';
import * as configModule from '../lib/config';
import { ApiError } from './error';
import {
  API_TIMEOUTS,
  createApiClient,
  createIdempotencyKey,
  getApiClient,
  initializeApiClient,
} from './client';
import {
  betsWithUnknownValues,
  acceptedUpload,
  partialUpload,
  deposit,
  depositCreated,
} from '../../tests/fixtures/api/responses';

const config = parseConfig({ VITE_API_URL: 'http://127.0.0.1:8000' });
const url = config.apiUrl;
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

it('preserva null, envia filtros/paginação e força cookie/no-store sem Authorization', async () => {
  server.use(
    http.get(url + '/api/v1/apostas', ({ request }) => {
      expect(request.credentials).toBe('include');
      expect(request.cache).toBe('no-store');
      expect(request.headers.has('Authorization')).toBe(false);
      expect(request.headers.has('X-CSRF-Token')).toBe(false);
      const query = new URL(request.url).searchParams;
      expect(query.get('page')).toBe('2');
      expect(query.get('estado')).toBe('PENDENTE');
      return HttpResponse.json(betsWithUnknownValues);
    }),
  );
  const result = await createApiClient(config).GET('/api/v1/apostas', {
    params: { query: { page: 2, estado: 'PENDENTE' } },
    credentials: 'omit',
    cache: 'force-cache',
    headers: { 'X-CSRF-Token': 'stale-test-proof' },
  });
  expect(result.data?.data[0]?.lucro_centavos).toBeNull();
  expect(result.data?.data[0]?.casa).toBeNull();
});

it('usa CSRF atual e a mesma chave para reconciliar a mesma intenção sem repetir sozinho', async () => {
  let csrf = 'disposable-proof-a';
  const key = createIdempotencyKey();
  const calls: string[] = [];
  server.use(
    http.post(url + '/api/v1/caixa', async ({ request }) => {
      calls.push(request.headers.get('Idempotency-Key')!);
      expect(request.headers.get('X-CSRF-Token')).toBe(csrf);
      expect(await request.json()).toEqual(deposit);
      return HttpResponse.json(depositCreated, { status: 201 });
    }),
  );
  const client = createApiClient(config, { getCsrfToken: () => csrf });
  const intent = {
    body: deposit,
    params: { header: { 'Idempotency-Key': key } },
  };
  await client.POST('/api/v1/caixa', intent);
  csrf = 'disposable-proof-b';
  await client.POST('/api/v1/caixa', intent);
  expect(calls).toEqual([key, key]);
  expect(createIdempotencyKey()).not.toBe(key);
});

it.each([401, 402, 409, 422, 429, 500, 503])(
  'normaliza HTTP %s sem mostrar corpo/stack',
  async (status) => {
    const calls = vi.fn();
    server.use(
      http.post(url + '/api/v1/apostas', () => {
        calls();
        return HttpResponse.json(
          { detail: 'INTERNAL_DETAIL_FOR_TEST_ONLY' },
          {
            status,
            headers: {
              'Retry-After': '2',
              'X-Request-Id': 'test-request-1',
              'X-Auth-Error': 'account_read_only',
            },
          },
        );
      }),
    );
    await expect(
      createApiClient(config).POST('/api/v1/apostas', {
        body: { casa: 'betano', odd: 2, stake_unidades: 1, freebet: false },
      }),
    ).rejects.toMatchObject({
      name: 'ApiError',
      kind: 'http',
      status,
      code: 'account_read_only',
      retryAfterMs: 2000,
      requestId: 'test-request-1',
    });
    expect(calls).toHaveBeenCalledTimes(1);
  },
);

it('não tenta novamente uma leitura 503 no transporte', async () => {
  const calls = vi.fn();
  server.use(
    http.get(url + '/health', () => {
      calls();
      return new HttpResponse('unavailable', { status: 503 });
    }),
  );
  await expect(createApiClient(config).GET('/health')).rejects.toMatchObject({
    status: 503,
  });
  expect(calls).toHaveBeenCalledTimes(1);
});

it('trata erro HTML/malformado e não mantém payload no ApiError', async () => {
  server.use(
    http.get(
      url + '/health',
      () =>
        new HttpResponse('<html>PRIVATE_DEBUG_TEST</html>', { status: 500 }),
    ),
  );
  const error = await createApiClient(config)
    .GET('/health')
    .catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ApiError);
  expect(JSON.stringify(error)).not.toContain('PRIVATE_DEBUG_TEST');
  expect(String(error)).not.toContain('<html>');
  server.use(
    http.get(
      url + '/health',
      () =>
        new HttpResponse('{bad json', {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }),
    ),
  );
  await expect(createApiClient(config).GET('/health')).rejects.toMatchObject({
    kind: 'http',
    status: 503,
  });
});

it.each([
  new HttpResponse('html', { headers: { 'Content-Type': 'text/html' } }),
  new HttpResponse('{invalid', {
    headers: { 'Content-Type': 'application/json' },
  }),
  new HttpResponse('', { headers: { 'Content-Type': 'application/json' } }),
])('recusa sucesso incompatível com leitura JSON', async (response) => {
  server.use(http.get(url + '/health', () => response.clone()));
  await expect(createApiClient(config).GET('/health')).rejects.toMatchObject({
    kind: 'invalid_response',
  });
});

it.each(['9007199254740993', '1e400'])(
  'recusa inteiro impreciso/infinito %s sem arredondar dinheiro',
  async (number) => {
    const raw = JSON.stringify(betsWithUnknownValues).replace(
      '"stake_centavos":100',
      '"stake_centavos":' + number,
    );
    server.use(
      http.get(
        url + '/api/v1/apostas',
        () =>
          new HttpResponse(raw, {
            headers: { 'Content-Type': 'application/json' },
          }),
      ),
    );
    await expect(
      createApiClient(config).GET('/api/v1/apostas'),
    ).rejects.toMatchObject({ kind: 'invalid_response' });
  },
);

it('lê arquivos binários e texto explicitamente, preservando cabeçalhos', async () => {
  const bytes = new Uint8Array([0, 255, 80, 75]);
  server.use(
    http.get(
      url + '/api/v1/painel/export',
      () =>
        new HttpResponse(bytes, {
          headers: {
            'Content-Type':
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename=export.xlsx',
          },
        }),
    ),
    http.get(url + '/metrics', () => HttpResponse.text('test_metric 1')),
  );
  const result = await createApiClient(config).GET('/api/v1/painel/export', {
    parseAs: 'blob',
  });
  expect(new Uint8Array(await result.data!.arrayBuffer())).toEqual(bytes);
  expect(result.response.headers.get('Content-Disposition')).toContain(
    'export.xlsx',
  );
  expect(
    (await createApiClient(config).GET('/metrics', { parseAs: 'text' })).data,
  ).toBe('test_metric 1');
});

it('envia multipart real sem Content-Type JSON e mantém resultado parcial do job', async () => {
  server.use(
    http.post(url + '/api/v1/upload', async ({ request }) => {
      expect(request.headers.get('Content-Type')).toContain(
        'multipart/form-data; boundary=',
      );
      const form = await request.formData();
      expect(await (form.get('file') as File).text()).toBe('disposable export');
      return HttpResponse.json(acceptedUpload, { status: 202 });
    }),
    http.get(url + '/api/v1/upload/:job_id', () =>
      HttpResponse.json(partialUpload),
    ),
  );
  const file = new File(['disposable export'], 'descartavel.json');
  const accepted = await createApiClient(config).POST('/api/v1/upload', {
    body: { file: file.name },
    bodySerializer: () => {
      const form = new FormData();
      form.append('file', file);
      return form;
    },
  });
  expect(accepted.data?.job_id).toBe(acceptedUpload.job_id);
  const status = await createApiClient(config).GET('/api/v1/upload/{job_id}', {
    params: { path: { job_id: acceptedUpload.job_id } },
  });
  expect(status.data?.bets_failed).toBe(1);
  expect(status.data?.bets_processed).toBe(2);
});

it('normaliza falha de rede sem mensagem original', async () => {
  const fetcher = vi
    .fn()
    .mockRejectedValue(new TypeError('PRIVATE_NETWORK_TEST'));
  await expect(
    createApiClient(config, { fetcher }).GET('/health'),
  ).rejects.toMatchObject({
    kind: 'network',
    status: 0,
    outcomeUnknown: false,
  });
});

it('aborto anterior impede envio; aborto durante POST indica resultado desconhecido', async () => {
  const aborted = new AbortController();
  aborted.abort();
  const fetcher = vi.fn(() => new Promise<Response>(() => {}));
  const client = createApiClient(config, { fetcher });
  await expect(
    client.GET('/health', { signal: aborted.signal }),
  ).rejects.toMatchObject({ kind: 'cancelled' });
  expect(fetcher).not.toHaveBeenCalled();
  await expect(
    client.POST('/api/v1/apostas', {
      body: { casa: 'betano', odd: 2, stake_unidades: 1, freebet: false },
      signal: aborted.signal,
    }),
  ).rejects.toMatchObject({ kind: 'cancelled', outcomeUnknown: false });
  const active = new AbortController();
  const request = client.POST('/api/v1/apostas', {
    body: { casa: 'betano', odd: 2, stake_unidades: 1, freebet: false },
    signal: active.signal,
  });
  const assertion = expect(request).rejects.toMatchObject({
    kind: 'cancelled',
    outcomeUnknown: true,
  });
  await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
  active.abort();
  await assertion;
});

it.each([
  ['read', '/health', API_TIMEOUTS.read],
  ['write', '/api/v1/apostas', API_TIMEOUTS.write],
  ['upload', '/api/v1/upload', API_TIMEOUTS.upload],
] as const)(
  'timeout %s interrompe espera e não repete pedido',
  async (kind, _path, timeout) => {
    vi.useFakeTimers();
    const fetcher = vi.fn(() => new Promise<Response>(() => {}));
    const client = createApiClient(config, { fetcher });
    const request =
      kind === 'read'
        ? client.GET('/health')
        : kind === 'write'
          ? client.POST('/api/v1/apostas', {
              body: {
                casa: 'betano',
                odd: 2,
                stake_unidades: 1,
                freebet: false,
              },
            })
          : client.POST('/api/v1/upload', { body: { file: 'descartavel' } });
    const assertion = expect(request).rejects.toMatchObject({
      kind: 'timeout',
      outcomeUnknown: kind !== 'read',
    });
    await vi.advanceTimersByTimeAsync(timeout - 1);
    expect(fetcher).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  },
);

it('timeout inclui corpo demorado depois dos cabeçalhos', async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn(
    async () =>
      new Response(new ReadableStream({ start() {} }), {
        headers: { 'Content-Type': 'application/json' },
      }),
  );
  const request = createApiClient(config, { fetcher }).GET('/health');
  const assertion = expect(request).rejects.toMatchObject({ kind: 'timeout' });
  await vi.advanceTimersByTimeAsync(API_TIMEOUTS.read);
  await assertion;
});

it.each([
  { baseUrl: 'https://untrusted.example' },
  { fetch: async () => new Response() },
  { parseAs: 'stream' as const },
  { headers: { Authorization: 'invalid-disposable-value' } },
  { headers: { 'Idempotency-Key': 'uncontracted' } },
])('recusa override que contorna transporte/contrato', async (options) => {
  await expect(
    createApiClient(config).GET('/health', options),
  ).rejects.toMatchObject({ kind: 'invalid_request' });
});

it('recusa chave idempotente vazia em Caixa', async () => {
  await expect(
    createApiClient(config).POST('/api/v1/caixa', {
      body: deposit,
      params: { header: { 'Idempotency-Key': '' } },
    }),
  ).rejects.toMatchObject({ kind: 'invalid_request' });
});

it('cliente padrão só nasce após configuração e é único', async () => {
  expect(() => createApiClient()).toThrow(configModule.ConfigError);
  vi.spyOn(configModule, 'getConfig').mockReturnValue(config);
  expect(getApiClient()).toBe(getApiClient());
  expect(() => initializeApiClient()).toThrow(ApiError);
});
