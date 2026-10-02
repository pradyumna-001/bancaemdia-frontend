// @vitest-environment node
import { expect, it, vi } from 'vitest';
import { parseConfig } from '../lib/config';
import { createApiClient } from './client';
import { betsWithUnknownValues } from '../../tests/fixtures/api/responses';

const config = parseConfig({ VITE_API_URL: 'https://api.example.org' });
it('resposta cujo aborto chega tarde nunca pode repovoar o cache de outro usuário', async () => {
  const controller = new AbortController();
  let current = true;
  let finish: (value: Response) => void = () => {};
  let started: () => void = () => {};
  const waiting = new Promise<void>((resolve) => {
    started = resolve;
  });
  const client = createApiClient(config, {
    captureSession: () => ({
      signal: controller.signal,
      isCurrent: () => current,
      csrfToken: crypto.randomUUID(),
    }),
    fetcher: async () => {
      started();
      return new Promise<Response>((resolve) => {
        finish = resolve;
      });
    },
  });
  const result = client.GET('/api/v1/apostas');
  const rejected = expect(result).rejects.toMatchObject({ kind: 'cancelled' });
  await waiting;
  current = false;
  controller.abort();
  finish(Response.json(betsWithUnknownValues));
  await rejected;
});
it('recusa contexto já invalidado antes de iniciar a rede', async () => {
  const fetcher = vi.fn(async () => Response.json(betsWithUnknownValues));
  const client = createApiClient(config, {
    fetcher,
    captureSession: () => ({
      signal: new AbortController().signal,
      isCurrent: () => false,
    }),
  });
  await expect(client.GET('/api/v1/apostas')).rejects.toMatchObject({
    kind: 'cancelled',
  });
  expect(fetcher).not.toHaveBeenCalled();
});
it('trava também a leitura do corpo pelo openapi-fetch depois do transporte retornar', async () => {
  let checks = 0;
  const client = createApiClient(config, {
    captureSession: () => ({
      signal: new AbortController().signal,
      isCurrent: () => ++checks < 3,
    }),
    fetcher: async () => Response.json(betsWithUnknownValues),
  });
  await expect(client.GET('/api/v1/apostas')).rejects.toMatchObject({
    kind: 'cancelled',
  });
  expect(checks).toBe(3);
});
it('usa prova da captura, ignora header fornecido e não repete uma gravação expirada', async () => {
  const proof = crypto.randomUUID();
  const onUnauthorized = vi.fn();
  const fetcher = vi.fn(async (request: Request) => {
    expect(request.headers.get('X-CSRF-Token')).toBe(proof);
    expect(request.headers.has('Authorization')).toBe(false);
    return Response.json(
      { detail: 'PRIVATE' },
      { status: 401, headers: { 'X-Auth-Error': 'access_expired' } },
    );
  });
  const client = createApiClient(config, {
    fetcher,
    onUnauthorized,
    captureSession: () => ({
      signal: new AbortController().signal,
      isCurrent: () => true,
      csrfToken: proof,
    }),
  });
  await expect(
    client.POST('/api/v1/apostas', {
      body: { casa: 'betano', odd: 2, stake_unidades: 1, freebet: false },
      headers: { 'X-CSRF-Token': 'stale' },
    }),
  ).rejects.toMatchObject({ status: 401, code: 'access_expired' });
  expect(fetcher).toHaveBeenCalledOnce();
  expect(onUnauthorized).toHaveBeenCalledOnce();
});
it('402 passa como restrição comercial sem evento de logout', async () => {
  const onUnauthorized = vi.fn();
  const client = createApiClient(config, {
    onUnauthorized,
    fetcher: async () => Response.json({}, { status: 402 }),
    captureSession: () => ({
      signal: new AbortController().signal,
      isCurrent: () => true,
    }),
  });
  await expect(client.GET('/api/v1/apostas')).rejects.toMatchObject({
    status: 402,
  });
  expect(onUnauthorized).not.toHaveBeenCalled();
});
it('contexto válido mantém inferência e resposta autorizada', async () => {
  const client = createApiClient(config, {
    captureSession: () => ({
      signal: new AbortController().signal,
      isCurrent: () => true,
    }),
    fetcher: async () => Response.json(betsWithUnknownValues),
  });
  expect(
    (await client.GET('/api/v1/apostas')).data?.data[0]?.lucro_centavos,
  ).toBeNull();
});
