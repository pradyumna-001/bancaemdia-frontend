import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { createSession } from '../../auth/session';
import { sessionContext } from '../../auth/protocol';
import { ProvedorAuth } from '../../auth/ProvedorAuth';
import { createApiClient } from '../../api/client';
import { ApiError } from '../../api/error';
import { parseConfig } from '../../lib/config';
import { createAccessController } from '../acesso/controller';
import { ProvedorAcesso } from '../acesso/ProvedorAcesso';
import { billingStatus } from '../../../tests/fixtures/acesso';
import { LOTE_FIXTURE_ID, loteFixture } from '../../../tests/fixtures/lote';
import {
  conferirIntencao,
  conferirLote,
  conferirPrevia,
  fraseConfere,
  LOTE,
} from './lote';
import { ApagarApostas } from './ApagarApostas';

const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).forEach((fn) => fn()));
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
const KEY = '5e1a7c3b-9d2f-4a6e-8b1c-3f5d7a9e2c4b';

type Hooks = {
  access?: string;
  ativas?: number;
  apagar?: (
    req: Request,
    fixture: ReturnType<typeof loteFixture>,
  ) => Promise<Response>;
  restaurar?: (
    req: Request,
    fixture: ReturnType<typeof loteFixture>,
  ) => Promise<Response>;
  intencao?: () => Promise<Response>;
  entry?: string;
  expirePrevia?: boolean;
};

async function open(hooks: Hooks = {}) {
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
  let expired = !!hooks.expirePrevia;
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
  const fixture = loteFixture({ ativas: hooks.ativas ?? 12 });
  const posts: Array<{
    path: string;
    key: string | null;
    url: string;
    body: string;
  }> = [];
  const lookups: Array<string | null> = [];
  const reads: string[] = [];
  // eslint-disable-next-line prefer-const
  let router: ReturnType<typeof createMemoryRouter>;
  const client = createApiClient(
    parseConfig({ VITE_API_URL: 'http://127.0.0.1:8000' }),
    {
      captureSession: session.capture,
      fetcher: async (req) => {
        const path = new URL(req.url).pathname;
        const key = req.headers.get('Idempotency-Key');
        if (path === '/api/v1/billing/status')
          return json({
            ...billingStatus,
            access: hooks.access ?? 'FULL_WRITE',
          });
        if (path === '/api/v1/apostas/lotes/previa-apagar') {
          reads.push(path);
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
          return json(fixture.previa());
        }
        if (path === '/api/v1/apostas/lotes/intencao') {
          lookups.push(key);
          if (hooks.intencao) return hooks.intencao();
          const r = fixture.intencao(key ?? '');
          return json(r.data, r.status);
        }
        if (req.method === 'POST') {
          const body = await req.clone().text();
          // The key must already be in the URL when the POST leaves.
          posts.push({ path, key, url: router.state.location.search, body });
          if (path === '/api/v1/apostas/lotes') {
            if (hooks.apagar) return hooks.apagar(req, fixture);
            const r = fixture.apagar(key!, JSON.parse(body));
            return json(r.data, r.status);
          }
          const id = path.split('/').at(-2)!;
          if (hooks.restaurar) return hooks.restaurar(req, fixture);
          const r = fixture.restaurar(key!, id);
          return json(r.data, r.status);
        }
        if (path.startsWith('/api/v1/apostas/lotes/')) {
          reads.push(path);
          const r = fixture.consultar(path.split('/').at(-1)!);
          return json(r.data, r.status);
        }
        return json({}, 404);
      },
    },
  );
  router = createMemoryRouter(
    [{ path: '/configuracoes', element: <ApagarApostas client={client} /> }],
    { initialEntries: [hooks.entry ?? '/configuracoes?casa=7'] },
  );
  queries.setQueryData(['outra-leitura'], 1);
  const view = render(
    <ProvedorAuth service={session}>
      <QueryClientProvider client={queries}>
        <ProvedorAcesso controller={controller} client={client}>
          <RouterProvider router={router} />
        </ProvedorAcesso>
      </QueryClientProvider>
    </ProvedorAuth>,
  );
  cleanups.push(() => {
    view.unmount();
    router.dispose();
    controller.dispose();
    session.dispose();
    queries.clear();
  });
  const search = () => new URLSearchParams(router.state.location.search);
  return { fixture, posts, lookups, reads, session, queries, search, router };
}

async function preparar(user = userEvent.setup()) {
  await user.click(
    await screen.findByRole('button', { name: 'Preparar exclusão' }),
  );
  return user;
}
async function apagar(user: ReturnType<typeof userEvent.setup>, frase: string) {
  const input = await screen.findByLabelText('Para confirmar, digite', {
    exact: false,
  });
  await user.type(input, frase);
  await waitFor(() =>
    expect(screen.getByRole('button', { name: /^Apagar \d/ })).toBeEnabled(),
  );
  await user.click(screen.getByRole('button', { name: /^Apagar \d/ }));
}

it('protocolo recusa prévia, lote e intenção fora do contrato', () => {
  const previa = loteFixture().previa();
  expect(conferirPrevia(previa)).toBe(previa);
  for (const bad of [
    { ...previa, total: -1 },
    { ...previa, total: 1.5 },
    { ...previa, frase: '  ' },
    { ...previa, confirmacao: '' },
    { ...previa, expira_em: 'ontem' },
  ])
    expect(() => conferirPrevia(bad)).toThrow(ApiError);
  const lote = {
    lote_id: LOTE_FIXTURE_ID,
    escopo: 'apostas' as const,
    apostas_afetadas: 3,
    criado_em: '2026-11-04T18:00:00Z',
    restaurado_em: null,
    apostas_restauradas: null,
  };
  expect(conferirLote(lote, LOTE)).toBe(lote);
  for (const bad of [
    { ...lote, lote_id: 'lote-1' },
    { ...lote, apostas_afetadas: 0 },
    { ...lote, restaurado_em: '2026-11-04T19:00:00Z' },
    { ...lote, apostas_restauradas: 3 },
  ])
    expect(() => conferirLote(bad, LOTE)).toThrow(ApiError);
  // A write receipt outside the contract leaves the outcome unknown.
  try {
    conferirLote({ ...lote, apostas_afetadas: 0 }, LOTE, true);
  } catch (error) {
    expect((error as ApiError).outcomeUnknown).toBe(true);
  }
  const restaurado = {
    ...lote,
    restaurado_em: '2026-11-04T19:00:00Z',
    apostas_restauradas: 0,
  };
  expect(
    conferirIntencao(
      { operacao: 'APAGAR', status_code: 201, resposta: lote },
      'APAGAR',
    ),
  ).toBe(lote);
  expect(
    conferirIntencao(
      { operacao: 'RESTAURAR', status_code: 200, resposta: restaurado },
      'RESTAURAR',
    ),
  ).toBe(restaurado);
  for (const [value, operacao] of [
    [
      { operacao: 'RESTAURAR', status_code: 200, resposta: restaurado },
      'APAGAR',
    ],
    [{ operacao: 'APAGAR', status_code: 409, resposta: lote }, 'APAGAR'],
    [{ operacao: 'APAGAR', status_code: 201, resposta: restaurado }, 'APAGAR'],
    [{ operacao: 'RESTAURAR', status_code: 200, resposta: lote }, 'RESTAURAR'],
  ] as const)
    expect(() => conferirIntencao(value, operacao)).toThrow(ApiError);
  expect(fraseConfere('  apagar 3 apostas ', 'APAGAR 3 APOSTAS')).toBe(true);
  expect(fraseConfere('APAGAR 4 APOSTAS', 'APAGAR 3 APOSTAS')).toBe(false);
});

it('apaga pela frase digitada, com chave na URL antes do POST, e restaura o lote', async () => {
  const { posts, search, fixture, queries } = await open();
  const user = await preparar();
  expect(await screen.findByText('12 apostas')).toBeVisible();
  expect(screen.getByText('APAGAR 12 APOSTAS')).toBeVisible();
  const input = screen.getByLabelText('Para confirmar, digite', {
    exact: false,
  });
  // The phrase is never filled in for the person.
  expect(input).toHaveValue('');
  expect(
    screen.getByRole('button', { name: 'Apagar 12 apostas' }),
  ).toBeDisabled();
  await user.type(input, 'APAGAR 11');
  expect(
    screen.getByRole('button', { name: 'Apagar 12 apostas' }),
  ).toBeDisabled();
  await user.clear(input);
  await apagar(user, 'apagar 12 apostas');
  expect(
    await screen.findByText('apagadas em', { exact: false }),
  ).toBeVisible();
  expect(posts).toHaveLength(1);
  expect(posts[0]!.key).toMatch(/^[0-9a-f-]{36}$/);
  expect(new URLSearchParams(posts[0]!.url).get('lote_apagar')).toBe(
    posts[0]!.key,
  );
  expect(JSON.parse(posts[0]!.body)).toEqual({
    acao: 'apagar_todas',
    confirmacao: 'assinada:1:12',
    frase: 'apagar 12 apostas',
  });
  expect(search().get('lote')).toBe(LOTE_FIXTURE_ID);
  expect(search().has('lote_apagar')).toBe(false);
  expect(search().get('casa')).toBe('7');
  expect(fixture.total).toBe(0);
  expect(queries.getQueryState(['outra-leitura'])?.isInvalidated).toBe(true);
  expect(
    screen.getByRole('link', { name: 'Ver apostas, incluindo apagadas' }),
  ).toHaveAttribute('href', '/apostas?casa=7&apagadas=1');

  await user.click(
    screen.getByRole('button', { name: 'Restaurar apostas deste lote' }),
  );
  expect(
    await screen.findByText('Lote restaurado em', { exact: false }),
  ).toBeVisible();
  expect(screen.getByText('voltaram', { exact: false })).toBeVisible();
  expect(
    screen.queryByRole('button', { name: 'Restaurar apostas deste lote' }),
  ).toBeNull();
  expect(posts).toHaveLength(2);
  expect(posts[1]!.path).toBe(
    `/api/v1/apostas/lotes/${LOTE_FIXTURE_ID}/restaurar`,
  );
  expect(new URLSearchParams(posts[1]!.url).get('lote_restaurar')).toBe(
    posts[1]!.key,
  );
  expect(search().has('lote_restaurar')).toBe(false);
  expect(fixture.total).toBe(12);
  await user.click(
    screen.getByRole('button', { name: 'Fechar acompanhamento' }),
  );
  expect(search().has('lote')).toBe(false);
  expect(search().get('casa')).toBe('7');
});

it('resposta perdida não reenvia: consulta a mesma chave e recupera o lote', async () => {
  const { posts, lookups, search } = await open({
    apagar: async (req, fixture) => {
      fixture.apagar(req.headers.get('Idempotency-Key')!, await req.json());
      throw new TypeError('rede');
    },
  });
  const user = await preparar();
  await apagar(user, 'APAGAR 12 APOSTAS');
  expect(
    await screen.findByText('Não foi possível confirmar', { exact: false }),
  ).toBeVisible();
  expect(
    screen.queryByRole('button', { name: 'Preparar exclusão' }),
  ).toBeNull();
  expect(search().get('lote_apagar')).toBe(posts[0]!.key);
  // Links to other areas keep the filters, never the batch identities.
  expect(screen.getByRole('link', { name: 'Privacidade' })).toHaveAttribute(
    'href',
    '/configuracoes/privacidade?casa=7',
  );
  await user.click(screen.getByRole('button', { name: 'Consultar resultado' }));
  expect(
    await screen.findByText('apagadas em', { exact: false }),
  ).toBeVisible();
  expect(lookups).toEqual([posts[0]!.key]);
  expect(posts).toHaveLength(1);
  expect(search().get('lote')).toBe(LOTE_FIXTURE_ID);
});

it('sem registro, reenvia só a mesma chave e o mesmo corpo, por gesto', async () => {
  let first = true;
  const { posts, search } = await open({
    apagar: async (req, fixture) => {
      if (first) {
        first = false;
        throw new TypeError('rede');
      }
      const r = fixture.apagar(
        req.headers.get('Idempotency-Key')!,
        await req.json(),
      );
      return json(r.data, r.status);
    },
  });
  const user = await preparar();
  await apagar(user, 'APAGAR 12 APOSTAS');
  await user.click(
    await screen.findByRole('button', { name: 'Consultar resultado' }),
  );
  expect(
    await screen.findByText('Isso não prova que nada foi feito', {
      exact: false,
    }),
  ).toBeVisible();
  expect(posts).toHaveLength(1);
  await user.click(
    screen.getByRole('button', { name: 'Reenviar o mesmo pedido' }),
  );
  expect(
    await screen.findByText('apagadas em', { exact: false }),
  ).toBeVisible();
  expect(posts).toHaveLength(2);
  expect(posts[1]!.key).toBe(posts[0]!.key);
  expect(posts[1]!.body).toBe(posts[0]!.body);
  expect(search().has('lote_apagar')).toBe(false);
});

it('chave na URL sem pedido em memória só permite consultar ou descartar', async () => {
  const { posts, lookups, search } = await open({
    entry: `/configuracoes?casa=7&lote_apagar=${KEY}`,
  });
  expect(
    await screen.findByText('Não foi possível confirmar', { exact: false }),
  ).toBeVisible();
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Consultar resultado' }));
  expect(
    await screen.findByText('O pedido original não está mais nesta página', {
      exact: false,
    }),
  ).toBeVisible();
  expect(lookups).toEqual([KEY]);
  expect(
    screen.queryByRole('button', { name: 'Reenviar o mesmo pedido' }),
  ).toBeNull();
  await user.click(
    screen.getByRole('button', { name: 'Descartar este pedido' }),
  );
  expect(search().has('lote_apagar')).toBe(false);
  expect(search().get('casa')).toBe('7');
  expect(
    await screen.findByRole('button', { name: 'Preparar exclusão' }),
  ).toBeVisible();
  expect(posts).toHaveLength(0);
});

it('falha na consulta mantém a incerteza', async () => {
  const { lookups } = await open({
    entry: `/configuracoes?lote_apagar=${KEY}`,
    intencao: async () => json({ detail: 'erro_interno' }, 500),
  });
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole('button', { name: 'Consultar resultado' }),
  );
  await waitFor(() => expect(lookups).toHaveLength(1));
  expect(
    await screen.findByText('Não foi possível confirmar', { exact: false }),
  ).toBeVisible();
  expect(
    screen.queryByRole('button', { name: 'Descartar este pedido' }),
  ).toBeNull();
});

it('prévia desatualizada libera a chave e pede nova prévia', async () => {
  const { posts, search, fixture } = await open();
  const user = await preparar();
  await screen.findByText('APAGAR 12 APOSTAS');
  fixture.mudar();
  await apagar(user, 'APAGAR 12 APOSTAS');
  expect(
    await screen.findByText('Suas apostas mudaram depois da prévia', {
      exact: false,
    }),
  ).toBeVisible();
  expect(posts).toHaveLength(1);
  expect(search().has('lote_apagar')).toBe(false);
  expect(
    screen.queryByLabelText('Para confirmar, digite', { exact: false }),
  ).toBeNull();
  await preparar(user);
  expect(await screen.findByText('APAGAR 13 APOSTAS')).toBeVisible();
});

it('frase recusada pelo serviço mantém a prévia', async () => {
  const { posts } = await open({
    apagar: async () => json({ detail: 'frase_incorreta' }, 422),
  });
  const user = await preparar();
  await apagar(user, 'APAGAR 12 APOSTAS');
  expect(
    await screen.findByText('A frase digitada não confere', { exact: false }),
  ).toBeVisible();
  expect(screen.getByText('APAGAR 12 APOSTAS')).toBeVisible();
  expect(posts).toHaveLength(1);
});

it('sem apostas ativas não oferece exclusão', async () => {
  await open({ ativas: 0 });
  const user = await preparar();
  expect(
    await screen.findByText('Não há apostas ativas para apagar.'),
  ).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Fechar' }));
  expect(
    await screen.findByRole('button', { name: 'Preparar exclusão' }),
  ).toBeVisible();
});

it('modo de leitura consulta prévia e lote, sem apagar nem restaurar', async () => {
  const { posts } = await open({ access: 'READ_ONLY' });
  const user = await preparar();
  await user.type(
    await screen.findByLabelText('Para confirmar, digite', { exact: false }),
    'APAGAR 12 APOSTAS',
  );
  expect(
    screen.getByText('as apostas podem ser consultadas', { exact: false }),
  ).toBeVisible();
  expect(
    screen.getByRole('button', { name: 'Apagar 12 apostas' }),
  ).toBeDisabled();
  expect(posts).toHaveLength(0);
});

it('lote desconhecido é informado e o acompanhamento pode ser fechado', async () => {
  const { search, reads } = await open({
    entry: `/configuracoes?casa=7&lote=${KEY}`,
  });
  expect(
    await screen.findByText('Este lote não foi encontrado nesta conta.'),
  ).toBeVisible();
  expect(reads).toContain(`/api/v1/apostas/lotes/${KEY}`);
  await userEvent
    .setup()
    .click(screen.getByRole('button', { name: 'Fechar acompanhamento' }));
  expect(search().has('lote')).toBe(false);
});

it('parâmetros inválidos voltam ao padrão sem consultar nada', async () => {
  const { reads, lookups } = await open({
    entry: '/configuracoes?lote=x&lote_apagar=abc&lote_restaurar=1',
  });
  expect(
    await screen.findByRole('button', { name: 'Preparar exclusão' }),
  ).toBeVisible();
  expect(reads).toHaveLength(0);
  expect(lookups).toHaveLength(0);
});

it('restauração perdida após recarga consulta e reenvia a mesma chave do lote', async () => {
  let lose = true;
  const { posts, lookups, search, fixture } = await open({
    restaurar: async (req, value) => {
      const id = new URL(req.url).pathname.split('/').at(-2)!;
      if (lose) {
        lose = false;
        throw new TypeError('rede');
      }
      const r = value.restaurar(req.headers.get('Idempotency-Key')!, id);
      return json(r.data, r.status);
    },
  });
  const user = await preparar();
  await apagar(user, 'APAGAR 12 APOSTAS');
  await user.click(
    await screen.findByRole('button', { name: 'Restaurar apostas deste lote' }),
  );
  await user.click(
    await screen.findByRole('button', { name: 'Consultar resultado' }),
  );
  await user.click(
    await screen.findByRole('button', { name: 'Reenviar o mesmo pedido' }),
  );
  expect(
    await screen.findByText('Lote restaurado em', { exact: false }),
  ).toBeVisible();
  expect(posts.map((p) => p.key)).toEqual([
    posts[0]!.key,
    posts[1]!.key,
    posts[1]!.key,
  ]);
  expect(lookups).toEqual([posts[1]!.key]);
  expect(search().has('lote_restaurar')).toBe(false);
  expect(fixture.total).toBe(12);
});

it('lote já restaurado por outra aba é relido, sem repetir', async () => {
  const { posts } = await open({
    restaurar: async (_req, fixture) => {
      fixture.restaurar(crypto.randomUUID(), LOTE_FIXTURE_ID);
      return json({ detail: 'lote_restaurado' }, 409);
    },
  });
  const user = await preparar();
  await apagar(user, 'APAGAR 12 APOSTAS');
  await user.click(
    await screen.findByRole('button', { name: 'Restaurar apostas deste lote' }),
  );
  expect(
    await screen.findByText('Este lote já foi restaurado.', { exact: false }),
  ).toBeVisible();
  expect(
    await screen.findByText('Lote restaurado em', { exact: false }),
  ).toBeVisible();
  expect(posts).toHaveLength(2);
});

it('saída da sessão descarta a prévia em memória', async () => {
  const { session } = await open();
  await preparar();
  await screen.findByText('APAGAR 12 APOSTAS');
  await act(() => session.logout());
  await waitFor(() =>
    expect(screen.queryByText('APAGAR 12 APOSTAS')).toBeNull(),
  );
});

it('falha da prévia aparece estilizada e não abre a confirmação', async () => {
  const queries = await open({ ativas: 3 });
  queries.fixture.previa = () => {
    throw new TypeError('rede');
  };
  await preparar();
  expect(
    await screen.findByRole('heading', {
      name: 'Não foi possível concluir o pedido',
    }),
  ).toBeVisible();
  expect(
    screen.queryByLabelText('Para confirmar, digite', { exact: false }),
  ).toBeNull();
});

it('recibo fora do contrato deixa o resultado incerto, sem reenviar', async () => {
  const { posts, search } = await open({
    apagar: async () => json({ lote_id: 'x', escopo: 'apostas' }, 201),
  });
  const user = await preparar();
  await apagar(user, 'APAGAR 12 APOSTAS');
  expect(
    await screen.findByText('Não foi possível confirmar', { exact: false }),
  ).toBeVisible();
  expect(search().get('lote_apagar')).toBe(posts[0]!.key);
  expect(posts).toHaveLength(1);
});

it('402 do servidor libera a chave sem gravar e preserva a mensagem', async () => {
  const { posts, search } = await open({
    apagar: async () => json({ detail: 'account_read_only' }, 402),
  });
  const user = await preparar();
  await apagar(user, 'APAGAR 12 APOSTAS');
  await waitFor(() => expect(search().has('lote_apagar')).toBe(false));
  expect(posts).toHaveLength(1);
  expect(
    await screen.findByRole('button', { name: 'Preparar exclusão' }),
  ).toBeVisible();
});

it('prévia atravessa a renovação do acesso em vez de sumir em silêncio', async () => {
  const { reads } = await open({ expirePrevia: true });
  await preparar();
  expect(await screen.findByText('APAGAR 12 APOSTAS')).toBeVisible();
  expect(reads.filter((r) => r.endsWith('/previa-apagar'))).toHaveLength(2);
});
