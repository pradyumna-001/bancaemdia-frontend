import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { createSession } from '../../auth/session';
import { sessionContext } from '../../auth/protocol';
import { ProvedorAuth } from '../../auth/ProvedorAuth';
import { createApiClient } from '../../api/client';
import { parseConfig } from '../../lib/config';
import { createAccessController } from '../acesso/controller';
import { ProvedorAcesso } from '../acesso/ProvedorAcesso';
import { billingStatus } from '../../../tests/fixtures/acesso';
import { unidadeFixture, unidadePadrao } from '../../../tests/fixtures/unidade';
import { conferirRecibo, conferirUnidade } from './unidade';
import { UnidadePreferencia } from './UnidadePreferencia';

const cleanups: Array<() => void> = [];
beforeEach(() => {
  if (!HTMLDialogElement.prototype.showModal)
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute('open', '');
    };
  if (!HTMLDialogElement.prototype.close)
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute('open');
    };
  vi.spyOn(HTMLDialogElement.prototype, 'showModal').mockImplementation(
    function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    },
  );
  vi.spyOn(HTMLDialogElement.prototype, 'close').mockImplementation(function (
    this: HTMLDialogElement,
  ) {
    this.removeAttribute('open');
  });
});
afterEach(() => {
  cleanups.splice(0).forEach((fn) => fn());
  vi.restoreAllMocks();
});
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
const AGORA = '2026-11-04T15:00:00-03:00';

async function open({
  access = 'FULL_WRITE',
  post,
  lookup,
}: {
  access?: string;
  post?: (req: Request) => Promise<Response>;
  lookup?: () => Promise<Response>;
} = {}) {
  const queries = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const context = sessionContext({
    usuario_id: 1,
    nome: 'Sandbox',
    email: 'sandbox@example.org',
    session_version: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa:1',
    csrf_token: crypto.randomUUID(),
    refresh_required: false,
    access_expires_at: '2030-01-01T00:00:00Z',
    session_expires_at: '2030-01-02T00:00:00Z',
  });
  const session = createSession({
    baseUrl: 'http://127.0.0.1:8000',
    queryClient: queries,
    transport: {
      read: async () => context,
      renew: async () => context,
      logout: async () => {},
    },
    exclusive: async (_signal, work) => work(),
  });
  await session.resume();
  const controller = createAccessController(session, queries);
  const fixture = unidadeFixture();
  const posts: Request[] = [];
  const lookups: Request[] = [];
  const client = createApiClient(
    parseConfig({ VITE_API_URL: 'http://127.0.0.1:8000' }),
    {
      captureSession: session.capture,
      fetcher: async (req) => {
        const path = new URL(req.url).pathname;
        if (path === '/api/v1/billing/status')
          return json({ ...billingStatus, access });
        if (path === '/api/v1/unidade') return json(fixture.get());
        const key = req.headers.get('Idempotency-Key') ?? '';
        if (path === '/api/v1/unidade/vigencias/intencao') {
          lookups.push(req.clone());
          if (lookup) return lookup();
          const r = fixture.intencao(key);
          return json(r.data, r.status);
        }
        if (path === '/api/v1/unidade/vigencias' && req.method === 'POST') {
          posts.push(req.clone());
          if (post) return post(req);
          const r = fixture.post(key, await req.json(), AGORA);
          return json(r.data, r.status);
        }
        return json({}, 404);
      },
    },
  );
  const router = createMemoryRouter(
    [
      {
        path: '/configuracoes',
        element: <UnidadePreferencia client={client} />,
      },
    ],
    { initialEntries: ['/configuracoes'] },
  );
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
  await screen.findByText('Unidade agora:', { exact: false });
  return { fixture, posts, lookups, session };
}

async function salvar(valor: string) {
  const user = userEvent.setup();
  const input = screen.getByLabelText('Nova unidade (R$)');
  await waitFor(() => expect(input).toBeEnabled());
  await user.clear(input);
  await user.type(input, valor);
  await user.click(
    screen.getByRole('button', { name: 'Revisar nova unidade' }),
  );
  const dialog = screen.getByRole('dialog', { hidden: true });
  await user.click(
    within(dialog).getByRole('button', {
      name: 'Salvar unidade',
      hidden: true,
    }),
  );
  return user;
}

it('valida unidade e recibo publicados, sem aceitar valor alterado ou apostas reescritas', () => {
  expect(conferirUnidade(structuredClone(unidadePadrao)).vigente.origem).toBe(
    'padrao',
  );
  expect(() =>
    conferirUnidade({
      ...unidadePadrao,
      vigente: { ...unidadePadrao.vigente, valor_centavos: 0 },
    }),
  ).toThrow();
  expect(() =>
    conferirUnidade({
      ...unidadePadrao,
      vigente: { ...unidadePadrao.vigente, vigente_ate: AGORA },
    }),
  ).toThrow();
  const recibo = unidadeFixture().post('k', { valor_centavos: 2500 }, AGORA)
    .data as Parameters<typeof conferirRecibo>[0];
  expect(conferirRecibo(recibo, 'POST', { valor_centavos: 2500 })).toBe(recibo);
  expect(() =>
    conferirRecibo(recibo, 'POST', { valor_centavos: 2600 }),
  ).toThrow();
  expect(() =>
    conferirRecibo(
      { ...recibo!, apostas_existentes_alteradas: 3 as 0 },
      'POST',
    ),
  ).toThrow();
});

it('mostra a unidade vigente e salva nova vigência com chave e confirmação explícita', async () => {
  const { posts } = await open();
  expect(
    screen.getByText('valor padrão do serviço', { exact: false }),
  ).toBeVisible();
  await salvar('25,00');
  expect(
    await screen.findByText('nenhuma aposta existente foi alterada', {
      exact: false,
    }),
  ).toBeVisible();
  expect(posts).toHaveLength(1);
  expect(posts[0]!.headers.get('Idempotency-Key')).toMatch(/^[0-9a-f-]{36}$/);
  expect(await posts[0]!.json()).toEqual({ valor_centavos: 2500 });
  // The history becomes visible without hover and the new unit is in force.
  expect(
    await screen.findByRole('table', { name: 'Histórico de unidades' }),
  ).toBeVisible();
  expect(screen.getAllByText('Em vigor').length).toBeGreaterThan(0);
});

it('valor fora do limite não envia nada e explica o intervalo aceito', async () => {
  const { posts } = await open();
  const user = userEvent.setup();
  const input = screen.getByLabelText('Nova unidade (R$)');
  await waitFor(() => expect(input).toBeEnabled());
  await user.type(input, '200000,00');
  await user.click(
    screen.getByRole('button', { name: 'Revisar nova unidade' }),
  );
  expect(screen.getByRole('alert')).toHaveTextContent('maior que zero e até');
  expect(posts).toHaveLength(0);
});

it('resposta perdida não reenvia: consulta a mesma chave e recupera o recibo', async () => {
  let lost = true;
  const { posts, lookups, fixture } = await open({
    post: async (req) => {
      const key = req.headers.get('Idempotency-Key')!;
      fixture.post(key, await req.json(), AGORA);
      if (lost) {
        lost = false;
        throw new TypeError('rede');
      }
      return json({}, 500);
    },
  });
  const user = await salvar('30');
  await screen.findByText(
    'Não foi possível confirmar se a nova unidade foi salva',
    {
      exact: false,
    },
  );
  expect(posts).toHaveLength(1);
  await user.click(screen.getByRole('button', { name: 'Consultar resultado' }));
  expect(
    await screen.findByText('nenhuma aposta existente foi alterada', {
      exact: false,
    }),
  ).toBeVisible();
  expect(posts).toHaveLength(1);
  expect(lookups).toHaveLength(1);
  expect(lookups[0]!.headers.get('Idempotency-Key')).toBe(
    posts[0]!.headers.get('Idempotency-Key'),
  );
});

it('consulta sem registro permite reenviar só a mesma chave e o mesmo corpo, por gesto', async () => {
  let first = true;
  const { posts, fixture } = await open({
    post: async (req) => {
      if (first) {
        first = false;
        throw new TypeError('rede');
      }
      const r = fixture.post(
        req.headers.get('Idempotency-Key')!,
        await req.json(),
        AGORA,
      );
      return json(r.data, r.status);
    },
  });
  const user = await salvar('40');
  await user.click(
    await screen.findByRole('button', { name: 'Consultar resultado' }),
  );
  await user.click(
    await screen.findByRole('button', { name: 'Reenviar a mesma unidade' }),
  );
  await screen.findByText('nenhuma aposta existente foi alterada', {
    exact: false,
  });
  expect(posts).toHaveLength(2);
  expect(posts[1]!.headers.get('Idempotency-Key')).toBe(
    posts[0]!.headers.get('Idempotency-Key'),
  );
  expect(await posts[1]!.json()).toEqual({ valor_centavos: 4000 });
});

it('modo de leitura consulta a unidade mas não oferece gravação', async () => {
  const { posts } = await open({ access: 'READ_ONLY' });
  await screen.findByText('pode ser consultada, mas não alterada', {
    exact: false,
  });
  expect(screen.getByLabelText('Nova unidade (R$)')).toBeDisabled();
  expect(posts).toHaveLength(0);
});

it('recusa conhecida libera nova tentativa sem consultar nem repetir', async () => {
  const { posts, lookups } = await open({
    post: async () =>
      json(
        {
          detail: 'unidade_invalida',
          campos: [{ campo: 'valor_centavos', codigo: 'acima_do_limite' }],
        },
        422,
      ),
  });
  await salvar('50');
  await waitFor(() =>
    expect(screen.getByLabelText('Nova unidade (R$)')).toBeEnabled(),
  );
  expect(
    screen.queryByRole('button', { name: 'Consultar resultado' }),
  ).toBeNull();
  expect(posts).toHaveLength(1);
  expect(lookups).toHaveLength(0);
});

it('falha na consulta mantém a incerteza e não libera gravação', async () => {
  const { posts, lookups } = await open({
    post: async () => {
      throw new TypeError('rede');
    },
    lookup: async () => json({ detail: 'erro_interno' }, 500),
  });
  const user = await salvar('60');
  const consultar = await screen.findByRole('button', {
    name: 'Consultar resultado',
  });
  // A lookup that fails with something other than 404 decides nothing.
  await user.click(consultar);
  await waitFor(() => expect(lookups).toHaveLength(1));
  expect(
    await screen.findByRole('button', { name: 'Consultar resultado' }),
  ).toBeVisible();
  expect(
    screen.queryByRole('button', { name: 'Reenviar a mesma unidade' }),
  ).toBeNull();
  expect(screen.getByLabelText('Nova unidade (R$)')).toBeDisabled();
  expect(posts).toHaveLength(1);
});

it('descartar depois de "nada gravado" limpa a tentativa e reabre o formulário', async () => {
  const { posts } = await open({
    post: async () => {
      throw new TypeError('rede');
    },
  });
  const user = await salvar('70');
  await user.click(
    await screen.findByRole('button', { name: 'Consultar resultado' }),
  );
  await user.click(await screen.findByRole('button', { name: 'Descartar' }));
  await waitFor(() =>
    expect(screen.getByLabelText('Nova unidade (R$)')).toBeEnabled(),
  );
  expect(
    screen.queryByRole('button', { name: 'Reenviar a mesma unidade' }),
  ).toBeNull();
  expect(posts).toHaveLength(1);
});

it('"Agora não" fecha a confirmação sem gravar', async () => {
  const { posts } = await open();
  const user = userEvent.setup();
  const input = screen.getByLabelText('Nova unidade (R$)');
  await waitFor(() => expect(input).toBeEnabled());
  await user.type(input, '15');
  await user.click(
    screen.getByRole('button', { name: 'Revisar nova unidade' }),
  );
  const dialog = screen.getByRole('dialog', { hidden: true });
  expect(dialog).toHaveTextContent('R$ 100,00');
  expect(dialog).toHaveTextContent('R$ 15,00');
  await user.click(
    within(dialog).getByRole('button', { name: 'Agora não', hidden: true }),
  );
  expect(dialog).not.toHaveAttribute('open');
  expect(posts).toHaveLength(0);
});
