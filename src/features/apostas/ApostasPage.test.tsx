import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { createSession } from '../../auth/session';
import { sessionContext } from '../../auth/protocol';
import { ProvedorAuth } from '../../auth/ProvedorAuth';
import { RequireSession } from '../../auth/RequireSession';
import { createApiClient } from '../../api/client';
import { SITE_READ_CONTRACT } from '../../api/site-read.generated';
import { parseConfig } from '../../lib/config';
import { createAccessController } from '../acesso/controller';
import { ProvedorAcesso } from '../acesso/ProvedorAcesso';
import { billingStatus } from '../../../tests/fixtures/acesso';
import { FILTER_READ_CONTRACT } from '../../../tests/fixtures/apostas-contract.generated';
import { paginaExemplo, resumoExemplo } from '../../../tests/fixtures/apostas';
import type { ContratoLeitura } from '../../api/readContract';
import { ApostasPage } from './ApostasPage';

const cleanups: Array<() => void> = [];
beforeEach(() => {
  HTMLDialogElement.prototype.showModal ??= function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close ??= function () {
    this.removeAttribute('open');
  };
});
afterEach(() => {
  cleanups.splice(0).forEach((fn) => fn());
  vi.restoreAllMocks();
});
const json = (
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
const defaultResponse = async (request: Request) => {
  const url = new URL(request.url);
  if (url.pathname.includes('/filtros/')) {
    const page = Number(url.searchParams.get('page') ?? 1);
    const id = url.searchParams.get('id') ?? (page === 1 ? '7' : '8');
    return json({
      dimensao: url.pathname.split('/').at(-1),
      data:
        url.searchParams.get('q') === 'none'
          ? []
          : [
              {
                id,
                nome: page === 1 ? 'Opção histórica' : 'Próxima opção',
                ativa: false,
              },
            ],
      pagination: { page, page_size: 20, total: 21 },
    });
  }
  if (url.pathname.endsWith('/filtrado')) return json(resumoExemplo);
  return json(
    paginaExemplo(
      Number(url.searchParams.get('page') ?? 1),
      Number(url.searchParams.get('page_size') ?? 2),
    ),
  );
};
async function open({
  contract = FILTER_READ_CONTRACT,
  search = '?page_size=2&apagadas=todas',
  access = 'FULL_WRITE',
  respond,
}: {
  contract?: ContratoLeitura;
  search?: string;
  access?: string;
  respond?: (request: Request) => Promise<Response>;
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
  const reads: Request[] = [];
  let handler = respond ?? defaultResponse;
  const client = createApiClient(
    parseConfig({ VITE_API_URL: 'http://127.0.0.1:8000' }),
    {
      captureSession: session.capture,
      fetcher: async (request) => {
        if (new URL(request.url).pathname.endsWith('/billing/status'))
          return json({ ...billingStatus, access });
        reads.push(request.clone());
        return handler(request);
      },
    },
  );
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: (
          <RequireSession>
            <ApostasPage client={client} contrato={contract} />
          </RequireSession>
        ),
      },
      { path: '/login', element: <p>Entrar</p> },
    ],
    { initialEntries: ['/' + search] },
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
  return {
    reads,
    session,
    queries,
    router,
    respond: (next: typeof handler) => {
      handler = next;
    },
  };
}
const listRequests = (requests: Request[]) =>
  requests.filter((req) => new URL(req.url).pathname === '/api/v1/apostas');

it('mostra textos, contextos atuais e nulidade, sem GET por linha e sem somar lucro', async () => {
  const app = await open();
  await screen.findByRole('heading', { name: 'Flamengo × Palmeiras' });
  expect(screen.getByText('R$ 923,45')).toBeVisible();
  expect(screen.getAllByText('Não informado').length).toBeGreaterThan(0);
  fireEvent.click(
    within(
      screen.getByRole('article', { name: 'Flamengo × Palmeiras' }),
    ).getByText('Informações da aposta'),
  );
  expect(screen.getByText('Conta principal (inativa)')).toBeInTheDocument();
  expect(screen.getByText('Ana (arquivado)')).toBeInTheDocument();
  expect(screen.getByText('9007199254740995')).toBeInTheDocument();
  expect(listRequests(app.reads)).toHaveLength(1);
  expect(
    app.reads.every(
      (req) => req.method === 'GET' && !req.headers.has('Authorization'),
    ),
  ).toBe(true);
});
it('mostrar mais preserva posição e filtros e substitui duplicata sem consultar detalhes', async () => {
  const app = await open({
    search: '?page_size=2&apagadas=todas&grupo=9007199254740993&casa=7',
  });
  await screen.findByRole('heading', { name: 'Flamengo × Palmeiras' });
  await userEvent.click(screen.getByRole('button', { name: 'Mostrar mais' }));
  await screen.findByRole('heading', { name: 'Grêmio × Internacional' });
  expect(screen.getAllByRole('article')).toHaveLength(3);
  expect(screen.getByText('Descrição corrigida')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Mostrar mais' })).toBeDisabled();
  expect(
    listRequests(app.reads).map((req) =>
      new URL(req.url).searchParams.get('page'),
    ),
  ).toEqual(['1', '2']);
  for (const req of listRequests(app.reads))
    expect(new URL(req.url).searchParams.get('grupo_id')).toBe(
      '9007199254740993',
    );
  expect(app.router.state.location.search).toContain('casa=7');
});
it('contrato candidato preserva filtros não publicados e não reutiliza a lista anterior', async () => {
  const app = await open({
    contract: SITE_READ_CONTRACT,
    search: '?page_size=2',
  });
  await screen.findByRole('heading', { name: 'Flamengo × Palmeiras' });
  expect(
    screen.getByText('O resumo ainda não está disponível para esta visão.', {
      exact: false,
    }),
  ).toBeVisible();
  await act(() => app.router.navigate('/?page_size=2&grupo=4&apagadas=1'));
  expect(
    await screen.findByText('Esta visão precisa de ajuste antes da consulta.', {
      exact: false,
    }),
  ).toBeVisible();
  expect(screen.queryByRole('article')).not.toBeInTheDocument();
  expect(listRequests(app.reads)).toHaveLength(1);
  expect(app.router.state.location.search).toContain('apagadas=1');
});
it('erro de atualização mantém dados, permite nova leitura explícita e não repete escrita', async () => {
  const app = await open();
  await screen.findByRole('heading', { name: 'Flamengo × Palmeiras' });
  app.respond(async (req) =>
    new URL(req.url).pathname.endsWith('/filtrado')
      ? json(resumoExemplo)
      : json({ detail: 'secret stack' }, 500),
  );
  await userEvent.click(
    screen.getByRole('button', { name: 'Atualizar visão' }),
  );
  await screen.findByText('As apostas já carregadas foram mantidas.', {
    exact: false,
  });
  expect(
    screen.getByRole('heading', { name: 'Flamengo × Palmeiras' }),
  ).toBeVisible();
  expect(screen.queryByText('secret stack')).not.toBeInTheDocument();
  app.respond(async () => json(paginaExemplo()));
  await userEvent.click(
    screen.getByRole('button', { name: 'Tentar novamente' }),
  );
  await waitFor(() =>
    expect(
      screen.queryByText('As apostas já carregadas foram mantidas.', {
        exact: false,
      }),
    ).not.toBeInTheDocument(),
  );
  expect(app.reads.every((req) => req.method === 'GET')).toBe(true);
});
it('erro ao mostrar mais conserva a primeira página e repete somente a página que falhou', async () => {
  const app = await open();
  await screen.findByRole('heading', { name: 'Flamengo × Palmeiras' });
  app.respond(async () => json({}, 503));
  await userEvent.click(screen.getByRole('button', { name: 'Mostrar mais' }));
  await screen.findByText('As apostas já carregadas foram mantidas.', {
    exact: false,
  });
  app.respond(async () => json(paginaExemplo(2)));
  await userEvent.click(
    screen.getByRole('button', { name: 'Tentar novamente' }),
  );
  await screen.findByRole('heading', { name: 'Grêmio × Internacional' });
  expect(
    listRequests(app.reads).map((req) =>
      new URL(req.url).searchParams.get('page'),
    ),
  ).toEqual(['1', '2', '2']);
});
it.each([
  ['', 'Você ainda não tem apostas'],
  ['&estado=PENDENTE', 'Nenhuma aposta nesta visão'],
  ['&page=3', 'Esta página não tem apostas'],
])(
  'distingue vazio inicial/filtrado/página posterior: %s',
  async (search, title) => {
    const app = await open({
      contract: SITE_READ_CONTRACT,
      search: '?page_size=2' + search,
      respond: async (req) =>
        json({
          data: [],
          pagination: {
            page: Number(new URL(req.url).searchParams.get('page') ?? 1),
            page_size: 2,
            total: 0,
          },
        }),
    });
    await screen.findByRole('heading', { name: title });
    for (const link of screen.getAllByRole('link', { name: 'Enviar apostas' }))
      expect(link).toHaveAttribute('href', '/enviar?page_size=2' + search);
    if (search.includes('page=3'))
      expect(
        screen.getByRole('link', { name: 'Voltar à primeira página' }),
      ).toHaveAttribute('href', '/?page_size=2');
    expect(listRequests(app.reads)).toHaveLength(1);
  },
);
it('modo de leitura conserva lista/resumo e oferece entrada autorizada pelo Telegram', async () => {
  const app = await open({ access: 'READ_ONLY' });
  await screen.findByRole('heading', { name: 'Flamengo × Palmeiras' });
  expect(
    screen.getByRole('link', { name: 'Conectar Telegram' }),
  ).toHaveAttribute(
    'href',
    '/configuracoes/conexoes?page_size=2&apagadas=todas',
  );
  expect(app.reads.every((req) => req.method === 'GET')).toBe(true);
});
it('catálogos buscam e paginam opções reais da consulta, resolvem seleção histórica e preservam ID', async () => {
  const app = await open({ search: '?casa=7&page_size=2&apagadas=todas' });
  await screen.findByRole('heading', { name: 'Flamengo × Palmeiras' });
  await screen.findByRole('button', { name: 'Casa Opção histórica (inativa)' });
  fireEvent.click(screen.getByText('Filtrar apostas — há filtros ativos'));
  await userEvent.click(
    screen.getByRole('button', { name: 'Casa Opção histórica (inativa)' }),
  );
  const dialog = screen.getByRole('dialog', { name: 'Casa' });
  await userEvent.click(
    within(dialog).getByRole('button', { name: 'Próximas opções' }),
  );
  await within(dialog).findByRole('button', {
    name: 'Próxima opção (inativa)',
  });
  await userEvent.click(
    within(dialog).getByRole('button', { name: 'Opções anteriores' }),
  );
  await within(dialog).findByRole('button', {
    name: 'Opção histórica (inativa)',
  });
  await userEvent.type(within(dialog).getByRole('textbox'), 'none');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Buscar' }));
  await within(dialog).findByText('Nenhuma opção corresponde à busca.');
  expect(app.router.state.location.search).toContain('casa=7');
});
it('logout desmonta dados e descarta leitura pendente inclusive após parsing', async () => {
  let finish: ((response: Response) => void) | undefined;
  const app = await open({
    contract: SITE_READ_CONTRACT,
    search: '?page_size=2',
    respond: () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  });
  await waitFor(() => expect(finish).toBeDefined());
  await act(() => app.session.logout());
  await act(async () => {
    finish!(json(paginaExemplo()));
    await Promise.resolve();
  });
  expect(
    screen.queryByRole('heading', { name: 'Flamengo × Palmeiras' }),
  ).not.toBeInTheDocument();
  expect(
    JSON.stringify(
      app.queries
        .getQueryCache()
        .getAll()
        .map((query) => query.state.data),
    ),
  ).not.toContain('Flamengo');
});

it('falha apenas do resumo preserva a lista e repete somente o GET do resumo', async () => {
  const app = await open({
    respond: (req) =>
      new URL(req.url).pathname.endsWith('/filtrado')
        ? Promise.resolve(json({}, 503))
        : defaultResponse(req),
  });
  await screen.findByRole('heading', { name: 'Flamengo × Palmeiras' });
  const summary = screen.getByRole('region', { name: 'Resumo desta visão' });
  await within(summary).findByRole('alert');
  expect(within(summary).queryByText('R$ 923,45')).not.toBeInTheDocument();
  app.respond(defaultResponse);
  await userEvent.click(
    within(summary).getByRole('button', { name: 'Tentar novamente' }),
  );
  await within(summary).findByText('R$ 923,45');
  expect(listRequests(app.reads)).toHaveLength(1);
});

it('404 não repete a lista e oferece orientação preservando todos os filtros', async () => {
  const app = await open({
    contract: SITE_READ_CONTRACT,
    search: '?page_size=2&estado=PENDENTE',
    respond: async () => json({}, 404),
  });
  await screen.findByRole('alert');
  expect(
    screen.queryByRole('button', { name: 'Tentar novamente' }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'Atualizar visão' }),
  ).toBeDisabled();
  expect(app.router.state.location.search).toContain('estado=PENDENTE');
  expect(listRequests(app.reads)).toHaveLength(1);
});

it('falha de catálogos e nome histórico conserva ID, permite recuperação explícita e não consulta detalhes', async () => {
  const app = await open({
    search: '?page_size=2&casa=7',
    respond: (req) =>
      new URL(req.url).pathname.includes('/filtros/')
        ? Promise.resolve(json({}, 500))
        : defaultResponse(req),
  });
  await screen.findByRole('heading', { name: 'Flamengo × Palmeiras' });
  fireEvent.click(screen.getByText('Filtrar apostas — há filtros ativos'));
  await screen.findByText(
    'Não foi possível consultar o nome. O identificador foi preservado.',
  );
  expect(
    screen.getByRole('button', { name: 'Remover filtro Casa' }),
  ).toHaveTextContent('Casa: Identificador 7');
  app.respond(defaultResponse);
  await userEvent.click(
    screen.getByRole('button', { name: 'Consultar nome de casa' }),
  );
  await screen.findByRole('button', { name: 'Casa Opção histórica (inativa)' });
  await userEvent.click(
    screen.getByRole('button', { name: 'Tentar carregar casa' }),
  );
  await waitFor(() =>
    expect(
      screen.queryByRole('button', { name: 'Tentar carregar casa' }),
    ).not.toBeInTheDocument(),
  );
  expect(app.router.state.location.search).toContain('casa=7');
});

it('voltar à primeira página conserva parâmetros repetidos sem afirmar que a conta está vazia', async () => {
  await open({
    contract: SITE_READ_CONTRACT,
    search: '?page_size=2&page=3&x=1&x=2',
  });
  await screen.findByRole('heading', { name: 'Esta página não tem apostas' });
  expect(
    screen.getByRole('link', { name: 'Voltar à primeira página' }),
  ).toHaveAttribute('href', '/?page_size=2&x=1&x=2');
});

it('Retry-After dos catálogos bloqueia busca e novas consultas de nomes, preservando a seleção', async () => {
  const app = await open({ search: '?page_size=2&casa=7' });
  await screen.findByRole(
    'heading',
    { name: 'Flamengo × Palmeiras' },
    { timeout: 5000 },
  );
  fireEvent.click(screen.getByText('Filtrar apostas — há filtros ativos'));
  await screen.findByRole(
    'button',
    { name: 'Casa Opção histórica (inativa)' },
    { timeout: 5000 },
  );
  await userEvent.click(
    screen.getByRole('button', { name: 'Casa Opção histórica (inativa)' }),
  );
  const dialog = screen.getByRole('dialog', { name: 'Casa' });
  app.respond((req) =>
    new URL(req.url).pathname.includes('/filtros/')
      ? Promise.resolve(json({}, 429, { 'Retry-After': '70' }))
      : defaultResponse(req),
  );
  await userEvent.type(within(dialog).getByRole('textbox'), 'limit');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Buscar' }));
  expect(await within(dialog).findByRole('alert')).toHaveTextContent(
    'Muitas tentativas. Aguarde para tentar novamente. Seu filtro foi preservado.',
  );
  expect(
    within(dialog).queryByRole('button', { name: 'Buscar' }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Tentar carregar casa' }),
  ).not.toBeInTheDocument();
  const catalogReads = app.reads.filter((req) =>
    new URL(req.url).pathname.includes('/filtros/'),
  ).length;
  await act(() => app.router.navigate('/?page_size=2&casa=8'));
  await screen.findByText(
    'Não foi possível consultar o nome. O identificador foi preservado.',
  );
  expect(
    app.reads.filter((req) => new URL(req.url).pathname.includes('/filtros/')),
  ).toHaveLength(catalogReads);
  expect(app.router.state.location.search).toContain('casa=8');
});
