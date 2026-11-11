import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createSession } from '../../auth/session';
import { sessionContext } from '../../auth/protocol';
import { ProvedorAuth } from '../../auth/ProvedorAuth';
import { createApiClient } from '../../api/client';
import { parseConfig } from '../../lib/config';
import { createAccessController } from '../acesso/controller';
import { ProvedorAcesso } from '../acesso/ProvedorAcesso';
import { billingStatus } from '../../../tests/fixtures/acesso';
import { unidadeFixture } from '../../../tests/fixtures/unidade';
import { useUnidade } from './useUnidade';

const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).forEach((fn) => fn()));
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
const AGORA = '2026-11-04T15:00:00-03:00';

async function setup(
  post?: (req: Request) => Promise<Response>,
  expireOnce = false,
) {
  const queries = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  // Each session read publishes a new version, as a renewal does.
  let version = 0;
  const context = () =>
    sessionContext({
      usuario_id: 1,
      nome: 'Sandbox',
      email: 'sandbox@example.org',
      session_version: `aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa:${++version}`,
      csrf_token: crypto.randomUUID(),
      refresh_required: false,
      access_expires_at: '2030-01-01T00:00:00Z',
      session_expires_at: '2030-01-02T00:00:00Z',
    });
  let expired = expireOnce;
  const session = createSession({
    baseUrl: 'http://127.0.0.1:8000',
    queryClient: queries,
    transport: {
      read: async () => context(),
      renew: async () => context(),
      logout: async () => {},
    },
    exclusive: async (_signal, work) => work(),
  });
  await session.resume();
  const controller = createAccessController(session, queries);
  const fixture = unidadeFixture();
  const requests: Request[] = [];
  const client = createApiClient(
    parseConfig({ VITE_API_URL: 'http://127.0.0.1:8000' }),
    {
      captureSession: session.capture,
      fetcher: async (req) => {
        const path = new URL(req.url).pathname;
        if (path === '/api/v1/billing/status')
          return json({ ...billingStatus, access: 'FULL_WRITE' });
        requests.push(req.clone());
        const key = req.headers.get('Idempotency-Key') ?? '';
        if (path === '/api/v1/unidade/vigencias/intencao') {
          if (expired) {
            expired = false;
            return new Response(JSON.stringify({ detail: 'access_expired' }), {
              status: 401,
              headers: {
                'Content-Type': 'application/json',
                'X-Auth-Error': 'access_expired',
              },
            });
          }
          const r = fixture.intencao(key);
          return json(r.data, r.status);
        }
        if (post) return post(req);
        const r = fixture.post(key, await req.json(), AGORA);
        return json(r.data, r.status);
      },
    },
  );
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ProvedorAuth service={session}>
      <QueryClientProvider client={queries}>
        <ProvedorAcesso controller={controller} client={client}>
          {children}
        </ProvedorAcesso>
      </QueryClientProvider>
    </ProvedorAuth>
  );
  const hook = renderHook(() => useUnidade(client), { wrapper });
  cleanups.push(() => {
    hook.unmount();
    controller.dispose();
    session.dispose();
    queries.clear();
  });
  await waitFor(() => expect(hook.result.current.canWrite).toBe(true));
  return { hook, requests, session };
}

it('ações fora do estado certo não transmitem nada', async () => {
  const { hook, requests } = await setup();
  // Without a lost response there is nothing to consult or resend.
  await act(() => hook.result.current.consult());
  await act(() => hook.result.current.resend());
  expect(requests).toHaveLength(0);
  await act(() => hook.result.current.send({ valor_centavos: 1000 }));
  expect(hook.result.current.state.receipt?.vigencia.valor_centavos).toBe(1000);
  // After a receipt a new, distinct attempt is allowed.
  await act(() => hook.result.current.send({ valor_centavos: 2000 }));
  expect(requests).toHaveLength(2);
  expect(requests[1]!.headers.get('Idempotency-Key')).not.toBe(
    requests[0]!.headers.get('Idempotency-Key'),
  );
});

it('dois envios simultâneos transmitem um só pedido', async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const fixture = unidadeFixture();
  const { hook, requests } = await setup(async (req) => {
    await gate;
    const r = fixture.post(
      req.headers.get('Idempotency-Key')!,
      await req.json(),
      AGORA,
    );
    return json(r.data, r.status);
  });
  let first!: Promise<void>;
  act(() => {
    first = hook.result.current.send({ valor_centavos: 1000 });
  });
  await act(() => hook.result.current.send({ valor_centavos: 3000 }));
  release();
  await act(() => first);
  expect(requests).toHaveLength(1);
});

it('resultado incerto bloqueia descarte e novo envio até a consulta', async () => {
  const { hook, requests } = await setup(async () => {
    throw new TypeError('rede');
  });
  await act(() => hook.result.current.send({ valor_centavos: 1000 }));
  expect(hook.result.current.state.uncertain).toBe(true);
  act(() => hook.result.current.reset());
  expect(hook.result.current.state.uncertain).toBe(true);
  await act(() => hook.result.current.send({ valor_centavos: 2000 }));
  expect(requests).toHaveLength(1);
});

it('saída da sessão limpa a tentativa em memória', async () => {
  const { hook, session } = await setup(async () => {
    throw new TypeError('rede');
  });
  await act(() => hook.result.current.send({ valor_centavos: 1000 }));
  expect(hook.result.current.state.body).toBeDefined();
  await act(() => session.logout());
  await waitFor(() => expect(hook.result.current.state.body).toBeUndefined());
});

it('consulta atravessa a renovação do acesso e mostra o recibo, sem novo envio', async () => {
  const fixture = unidadeFixture();
  const { hook, requests } = await setup(async (req) => {
    fixture.post(req.headers.get('Idempotency-Key')!, await req.json(), AGORA);
    throw new TypeError('rede');
  }, true);
  await act(() => hook.result.current.send({ valor_centavos: 1000 }));
  expect(hook.result.current.state.uncertain).toBe(true);
  await act(() => hook.result.current.consult());
  // The renewed read answers 404 from this fixture (another instance), but
  // the answer is delivered instead of being silently dropped.
  await waitFor(() => expect(hook.result.current.busy).toBe(false));
  expect(hook.result.current.state.notRecorded).toBe(true);
  expect(requests.filter((r) => r.method === 'POST')).toHaveLength(1);
});
