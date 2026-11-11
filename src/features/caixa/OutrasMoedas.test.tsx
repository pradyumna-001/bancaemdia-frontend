import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it } from 'vitest';
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
import { nativoFixture, nativoVazio } from '../../../tests/fixtures/nativo';
import { casasManual, matrizManual } from '../../../tests/fixtures/manual';
import {
  conferirApostas,
  conferirContas,
  conferirCriada,
  conferirResumo,
} from './nativo';
import { OutrasMoedas } from './OutrasMoedas';

const cleanups: Array<() => void> = [];
beforeEach(() => {
  // jsdom has no modal dialog API; the casa picker opens a <dialog>.
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});
afterEach(() => cleanups.splice(0).forEach((fn) => fn()));
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
type Fixture = ReturnType<typeof nativoFixture>;

async function open(
  hooks: {
    access?: string;
    fixture?: Fixture;
    post?: (req: Request, fixture: Fixture) => Promise<Response>;
    resumo?: () => Promise<Response>;
  } = {},
) {
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
  const fixture = hooks.fixture ?? nativoFixture();
  const posts: Request[] = [];
  const reads: string[] = [];
  const client = createApiClient(
    parseConfig({ VITE_API_URL: 'http://127.0.0.1:8000' }),
    {
      captureSession: session.capture,
      fetcher: async (req) => {
        const url = new URL(req.url);
        if (url.pathname === '/api/v1/billing/status')
          return json({
            ...billingStatus,
            access: hooks.access ?? 'FULL_WRITE',
          });
        if (url.pathname.startsWith('/api/v1/titulares/casas/'))
          return json(matrizManual);
        if (url.pathname.startsWith('/api/v1/filtros/'))
          return json(casasManual);
        if (req.method === 'POST') {
          posts.push(req.clone());
          if (hooks.post) return hooks.post(req, fixture);
          const r = fixture.criar(await req.json());
          return json(r.data, r.status);
        }
        reads.push(url.pathname + url.search);
        if (url.pathname.endsWith('/resumo') && hooks.resumo)
          return hooks.resumo();
        const r = fixture.handle(req.method, url);
        return r ? json(r.data, r.status) : json({ detail: 'missing' }, 404);
      },
    },
  );
  const router = createMemoryRouter(
    [{ path: '/banca', element: <OutrasMoedas client={client} /> }],
    { initialEntries: ['/banca?casa=7'] },
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
  return { fixture, posts, reads, session };
}

it('protocolo recusa soma de moedas, valores inexatos e recibo diferente do pedido', () => {
  const f = nativoFixture();
  expect(conferirContas(f.contas())).toHaveLength(1);
  expect(() =>
    conferirContas([{ ...f.contas()[0]!, valid_to: '2026-09-01T00:00:00Z' }]),
  ).toThrow(ApiError);
  expect(() => conferirContas([f.contas()[0]!, f.contas()[0]!])).toThrow(
    ApiError,
  );
  expect(conferirApostas(f.apostas())).toHaveLength(2);
  for (const bad of [
    { ...f.apostas()[0]!, stake: '1e3' },
    { ...f.apostas()[0]!, profit: '10,5' },
    { ...f.apostas()[0]!, account_id: 0 },
  ])
    expect(() => conferirApostas([bad])).toThrow(ApiError);
  expect(() => conferirApostas(f.apostas(), 'BRL')).toThrow(ApiError);
  expect(conferirResumo(f.resumo())).toHaveLength(1);
  const total = f.resumo().totals_by_currency[0]!;
  for (const bad of [
    { ...f.resumo(), combined_monetary_total: '10' as unknown as null },
    { ...f.resumo(), totals_by_currency: [total, total] },
    { ...f.resumo(), totals_by_currency: [{ ...total, bets: -1 }] },
  ])
    expect(() => conferirResumo(bad)).toThrow(ApiError);
  const pedido = {
    casa_id: 7,
    currency: 'USDT' as const,
    label: 'Nova',
    valid_from: '2026-10-01T00:00:00-03:00',
  };
  const criada = {
    ...pedido,
    id: 9,
    active: true,
    valid_from: '2026-10-01T03:00:00Z',
    valid_to: null,
  };
  expect(conferirCriada(criada, pedido)).toBe(criada);
  try {
    conferirCriada({ ...criada, currency: 'BRL' }, pedido);
    expect.unreachable();
  } catch (error) {
    expect((error as ApiError).outcomeUnknown).toBe(true);
  }
});

it('mostra totais, contas e apostas na moeda de origem, sem converter nem somar', async () => {
  const { reads } = await open();
  const totais = await screen.findByRole('table');
  expect(totais).toHaveTextContent('USDT');
  expect(totais).toHaveTextContent('10,50 USDT');
  // Exact text is kept to the last significant decimal place.
  expect(totais).toHaveTextContent('+9,345000000000000000000000000001 USDT');
  expect(screen.queryByText(/R\$/)).toBeNull();
  expect(await screen.findByText('1win USDT')).toBeVisible();
  expect((await screen.findAllByText(/Betano/))[0]).toBeVisible();
  const em = screen.getByRole('article', { name: 'Aposta 502' });
  expect(em).toHaveTextContent('Sem conta atribuída');
  expect(em).toHaveTextContent('−4,00 USDT');
  expect(em).toHaveTextContent('fica fora dos totais');
  expect(
    within(screen.getByRole('article', { name: 'Aposta 501' })).getByText(
      /1win USDT/,
    ),
  ).toBeVisible();
  expect(
    screen.getByText('Esta lista não é o histórico completo', { exact: false }),
  ).toBeVisible();
  expect(reads).toContain('/api/v1/financeiro/nativo/apostas?limit=20');
});

it('vazio orienta a criar conta e erro do resumo é estilizado', async () => {
  await open({
    fixture: nativoVazio(),
    resumo: async () => json({ detail: 'interno' }, 500),
  });
  expect(
    await screen.findByText('Nenhuma conta em outra moeda', { exact: false }),
  ).toBeVisible();
  expect(
    await screen.findByText('Nenhuma aposta em outra moeda foi recebida.'),
  ).toBeVisible();
  expect(
    await screen.findByRole('button', { name: /Tentar|Consultar/ }),
  ).toBeVisible();
});

async function abrirFormulario() {
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole('button', { name: 'Conta em outra moeda' }),
  );
  return user;
}
async function escolherCasa(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /^Casa / }));
  await user.click(await screen.findByRole('button', { name: 'Betano' }));
}
const preencher = (rotulo: string, valor: string) =>
  fireEvent.change(screen.getByLabelText(rotulo), { target: { value: valor } });

it('valida casa, moeda, apelido e vigência com fuso antes de enviar', async () => {
  const { posts } = await open();
  const user = await abrirFormulario();
  const criar = () =>
    user.click(screen.getByRole('button', { name: 'Criar conta' }));
  await criar();
  expect(screen.getByText('Escolha a casa.')).toBeVisible();
  await escolherCasa(user);
  await criar();
  expect(screen.getByText('Escolha a moeda da conta.')).toBeVisible();
  await user.click(screen.getByLabelText('USDT'));
  await criar();
  expect(
    screen.getByText('Informe um apelido', { exact: false }),
  ).toBeVisible();
  preencher('Apelido', 'Segunda 1win');
  preencher('Início da vigência (com fuso)', '15/10/2026 00:00');
  await criar();
  expect(
    screen.getByText('Informe o início da vigência', { exact: false }),
  ).toBeVisible();
  preencher('Início da vigência (com fuso)', '15/10/2026 00:00-03:00');
  preencher('Fim da vigência (opcional)', '01/10/2026');
  await criar();
  expect(
    screen.getByText('Informe o fim da vigência', { exact: false }),
  ).toBeVisible();
  preencher('Fim da vigência (opcional)', '01/10/2026 00:00-03:00');
  await criar();
  expect(
    screen.getByText('O fim da vigência precisa ser depois do início.'),
  ).toBeVisible();
  expect(posts).toHaveLength(0);
});

it('cria a conta com o pedido exato e a mostra na lista', async () => {
  const { posts } = await open();
  const user = await abrirFormulario();
  await escolherCasa(user);
  await user.click(screen.getByLabelText('USDT'));
  preencher('Apelido', 'Segunda 1win');
  preencher('Início da vigência (com fuso)', '15/10/2026 00:00-03:00');
  preencher('Fim da vigência (opcional)', '31/12/2026 23:59-03:00');
  await user.click(screen.getByRole('button', { name: 'Criar conta' }));
  expect(
    await screen.findByText('Conta Segunda 1win em USDT criada.'),
  ).toBeVisible();
  expect(posts).toHaveLength(1);
  expect(await posts[0]!.json()).toEqual({
    casa_id: 7,
    currency: 'USDT',
    label: 'Segunda 1win',
    valid_from: '2026-10-15T00:00:00-03:00',
    valid_to: '2026-12-31T23:59:00-03:00',
  });
  expect(await screen.findByText('Segunda 1win')).toBeVisible();
  expect(screen.queryByLabelText('Apelido')).toBeNull();
});

it('resultado desconhecido não reenvia nem reconcilia pela lista', async () => {
  const { posts } = await open({
    post: async (req, fixture) => {
      fixture.criar(await req.json());
      throw new TypeError('rede');
    },
  });
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole('button', { name: 'Conta em outra moeda' }),
  );
  await escolherCasa(user);
  await user.click(screen.getByLabelText('USDT'));
  preencher('Apelido', 'Perdida');
  preencher('Início da vigência (com fuso)', '15/10/2026 00:00-03:00');
  await user.click(screen.getByRole('button', { name: 'Criar conta' }));
  expect(
    await screen.findByText(
      'Não foi possível confirmar se a conta foi criada',
      {
        exact: false,
      },
    ),
  ).toBeVisible();
  expect(screen.getByRole('button', { name: 'Criar conta' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Consultar contas' }));
  expect(
    await screen.findByText(
      'Lista consultada. Ela não confirma o resultado daquele pedido.',
    ),
  ).toBeVisible();
  expect(posts).toHaveLength(1);
  await user.click(
    screen.getByRole('button', { name: 'Encerrar este acompanhamento' }),
  );
  await user.click(
    screen.getByRole('button', { name: 'Conta em outra moeda' }),
  );
  expect(screen.getByLabelText('Apelido')).toHaveValue('');
  expect(posts).toHaveLength(1);
});

it('422 aponta o campo pelo rótulo local e libera nova tentativa', async () => {
  const { posts } = await open({
    post: async () =>
      json(
        {
          detail: [
            { loc: ['body', 'label'], msg: 'segredo', type: 'string_too_long' },
          ],
        },
        422,
      ),
  });
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole('button', { name: 'Conta em outra moeda' }),
  );
  await escolherCasa(user);
  await user.click(screen.getByLabelText('USDT'));
  preencher('Apelido', 'X');
  preencher('Início da vigência (com fuso)', '15/10/2026 00:00-03:00');
  await user.click(screen.getByRole('button', { name: 'Criar conta' }));
  await user.click(
    await screen.findByRole('button', { name: 'Confira Apelido' }),
  );
  expect(screen.getByLabelText('Apelido')).toHaveFocus();
  expect(screen.queryByText(/segredo/)).toBeNull();
  expect(screen.getByRole('button', { name: 'Criar conta' })).toBeEnabled();
  expect(posts).toHaveLength(1);
});

it('modo de leitura consulta tudo e não oferece criar conta', async () => {
  const { posts } = await open({ access: 'READ_ONLY' });
  expect(await screen.findByText('1win USDT')).toBeVisible();
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Conta em outra moeda' }),
    ).toBeDisabled(),
  );
  expect(
    screen.getByText('podem ser consultadas, mas não criadas', {
      exact: false,
    }),
  ).toBeVisible();
  expect(posts).toHaveLength(0);
});

it('mostrar mais amplia o limite publicado, sem passar de 100', async () => {
  const apostas = Array.from({ length: 25 }, (_, i) => ({
    ...nativoFixture().apostas()[0]!,
    id: 900 + i,
  }));
  const { reads } = await open({ fixture: nativoFixture({ apostas }) });
  await screen.findByRole('article', { name: 'Aposta 900' });
  expect(screen.getAllByRole('article')).toHaveLength(20);
  await userEvent
    .setup()
    .click(screen.getByRole('button', { name: 'Mostrar mais' }));
  await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(25));
  expect(reads).toContain('/api/v1/financeiro/nativo/apostas?limit=40');
  expect(screen.queryByRole('button', { name: 'Mostrar mais' })).toBeNull();
});

it('saída da sessão limpa o formulário em memória', async () => {
  const { session } = await open();
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole('button', { name: 'Conta em outra moeda' }),
  );
  await user.type(screen.getByLabelText('Apelido'), 'Rascunho');
  await act(() => session.logout());
  await waitFor(() => expect(screen.queryByLabelText('Apelido')).toBeNull());
});
