import { afterEach, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { createAccessController } from './controller';
import { operationNeedsWrite, READ_ONLY_OPERATIONS } from './operations';
import { createSession } from '../../auth/session';
import { sessionContext } from '../../auth/protocol';
import { createApiClient } from '../../api/client';
import { ApiError } from '../../api/error';
import { parseConfig } from '../../lib/config';
import { billingStatus } from '../../../tests/fixtures/acesso';

const disposers: Array<() => void> = [];
afterEach(() => {
  disposers.splice(0).forEach((dispose) => dispose());
  vi.useRealTimers();
});
async function sandbox() {
  const queries = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  let person = 1;
  const transport = {
    read: vi.fn(async () =>
      sessionContext({
        usuario_id: person,
        nome: 'Teste',
        email: 'sandbox@example.org',
        session_version: `aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa:${person}`,
        csrf_token: crypto.randomUUID(),
        refresh_required: false,
        access_expires_at: '2030-01-01T00:00:00Z',
        session_expires_at: '2030-01-02T00:00:00Z',
      }),
    ),
    renew: vi.fn(),
    logout: vi.fn(),
  };
  const session = createSession({
    baseUrl: 'http://127.0.0.1:8000',
    queryClient: queries,
    transport,
    exclusive: async (_signal, work) => work(),
  });
  await session.resume();
  const access = createAccessController(session, queries);
  let response: unknown = billingStatus;
  let status = 200;
  let headers: Record<string, string> = {};
  const fetcher = vi.fn(
    async () =>
      new Response(JSON.stringify(response), {
        status,
        headers: { 'Content-Type': 'application/json', ...headers },
      }),
  );
  const client = createApiClient(
    parseConfig({ VITE_API_URL: 'http://127.0.0.1:8000' }),
    { fetcher, captureSession: session.capture, onAccessDenied: access.denied },
  );
  disposers.push(() => {
    access.dispose();
    session.dispose();
    queries.clear();
  });
  return {
    access,
    session,
    client,
    queries,
    fetcher,
    switchPerson: (id: number) => {
      person = id;
    },
    reply: (body: unknown, code = 200, extra = {}) => {
      response = body;
      status = code;
      headers = extra;
    },
  };
}
it('confere escrita com status fresco; exceções explícitas continuam disponíveis sem billing', async () => {
  const s = await sandbox();
  const work = vi.fn(async () => 'resultado');
  expect(await s.access.run(s.client, 'POST /api/v1/apostas', work)).toBe(
    'resultado',
  );
  s.reply({
    ...billingStatus,
    access: 'READ_ONLY',
    trial_ends_at: '2099-01-01T00:00:00Z',
  });
  await expect(
    s.access.run(s.client, 'POST /api/v1/apostas', work),
  ).rejects.toMatchObject({ status: 402 });
  expect(work).toHaveBeenCalledTimes(1);
  const before = s.fetcher.mock.calls.length;
  for (const operation of READ_ONLY_OPERATIONS)
    await s.access.run(s.client, operation, work);
  await s.access.run(s.client, 'GET /api/v1/apostas', work);
  expect(s.fetcher).toHaveBeenCalledTimes(before);
  expect(operationNeedsWrite('PATCH /api/v1/apostas/{chave}')).toBe(true);
});
it('402 real invalida a confirmação, notifica e não reenvia mutação; pagamento exige nova intenção', async () => {
  const s = await sandbox();
  const listener = vi.fn();
  const unsub = s.access.subscribe(listener);
  const key = s.access.key();
  s.reply({ detail: 'account_read_only' }, 402);
  await expect(
    s.client.POST('/api/v1/apostas', {
      body: { casa: 'betano', odd: 2, stake_unidades: 1, freebet: false },
    }),
  ).rejects.toMatchObject({ status: 402, code: 'account_read_only' });
  expect(s.access.getSnapshot()).toBe(1);
  expect(s.access.key()).not.toEqual(key);
  expect(listener).toHaveBeenCalledTimes(1);
  s.reply(billingStatus);
  await s.access.consult(s.client, new AbortController().signal);
  expect(s.fetcher).toHaveBeenCalledTimes(2);
  unsub();
  s.access.denied();
  expect(listener).toHaveBeenCalledTimes(1);
});
it('falha de status ou shape inválido não concede escrita, respeita prazo comum e não repete pedido', async () => {
  vi.useFakeTimers();
  const s = await sandbox();
  const work = vi.fn();
  s.reply({ access: 'inventado' });
  await expect(
    s.access.run(s.client, 'POST /api/v1/apostas', work),
  ).rejects.toMatchObject({ kind: 'invalid_response' });
  s.reply({}, 503, { 'Retry-After': '120' });
  await expect(
    s.access.consult(s.client, new AbortController().signal),
  ).rejects.toMatchObject({ status: 503 });
  await expect(
    s.access.consult(s.client, new AbortController().signal),
  ).rejects.toMatchObject({ status: 429 });
  expect(s.fetcher).toHaveBeenCalledTimes(2);
  expect(work).not.toHaveBeenCalled();
  vi.advanceTimersByTime(120000);
  s.reply(billingStatus);
  await s.access.consult(s.client, new AbortController().signal);
  expect(s.fetcher).toHaveBeenCalledTimes(3);
});
it('logout/troca limpa sinal e prazo; consulta antiga não permite executar nem revelar resultado', async () => {
  const s = await sandbox();
  s.access.denied();
  s.switchPerson(2);
  await s.session.resume();
  expect(s.access.getSnapshot()).toBe(0);
  expect(s.access.key()[1]).toBe(2);
  let resolve!: (response: Response) => void;
  s.fetcher.mockImplementationOnce(
    () =>
      new Promise<Response>((r) => {
        resolve = r;
      }),
  );
  const work = vi.fn();
  const pending = s.access.run(s.client, 'POST /api/v1/apostas', work);
  const rejected = expect(pending).rejects.toMatchObject({ kind: 'cancelled' });
  await Promise.resolve();
  await s.session.logout();
  resolve(
    new Response(JSON.stringify(billingStatus), {
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  await rejected;
  expect(work).not.toHaveBeenCalled();
  s.access.denied();
  expect(s.access.getSnapshot()).toBe(0);
});
it('recusa nova concorrente ao status não permite que confirmação antiga libere escrita', async () => {
  const s = await sandbox();
  const work = vi.fn();
  s.fetcher.mockImplementationOnce(async () => {
    s.access.denied();
    return new Response(JSON.stringify(billingStatus), {
      headers: { 'Content-Type': 'application/json' },
    });
  });
  await expect(
    s.access.run(s.client, 'POST /api/v1/apostas', work),
  ).rejects.toBeInstanceOf(ApiError);
  expect(work).not.toHaveBeenCalled();
});
