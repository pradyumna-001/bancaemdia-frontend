import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
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
import {
  createContasFixture,
  conta,
  financeiro,
} from '../../../tests/fixtures/contas';
import { ContasPage } from './ContasPage';
const clean: Array<() => void> = [];
const json = (value: unknown, status = 200, headers = {}) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
beforeEach(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
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
    this.dispatchEvent(new Event('close'));
  });
});
afterEach(() => {
  clean.splice(0).forEach((fn) => fn());
  vi.restoreAllMocks();
});
async function open(
  initial = '/contas',
  override?: (
    req: Request,
  ) => Response | Promise<Response | undefined> | undefined,
  readOnly = false,
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
    exclusive: async (_s, w) => w(),
  });
  await session.resume();
  const controller = createAccessController(session, queries);
  const api = createContasFixture();
  const requests: Request[] = [];
  const client = createApiClient(
    parseConfig({ VITE_API_URL: 'http://127.0.0.1:8000' }),
    {
      captureSession: session.capture,
      fetcher: async (req) => {
        requests.push(req.clone());
        const url = new URL(req.url);
        if (url.pathname === '/api/v1/billing/status')
          return json({
            ...billingStatus,
            access: readOnly ? 'READ_ONLY' : 'FULL_WRITE',
          });
        const custom = await override?.(req);
        if (custom) return custom;
        const value = api.handle(
          req.method,
          url,
          req.method === 'GET' ? {} : await req.json().catch(() => ({})),
        );
        return json(
          value ?? {},
          value === undefined
            ? 404
            : req.method === 'POST' && !url.pathname.endsWith('/ativar')
              ? 201
              : 200,
        );
      },
    },
  );
  const router = createMemoryRouter(
    [
      { path: '/contas', element: <ContasPage client={client} /> },
      { path: '/contas/:titularId', element: <ContasPage client={client} /> },
      { path: '/login', element: <p>Entrar</p> },
    ],
    { initialEntries: [initial] },
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
  clean.push(() => {
    view.unmount();
    router.dispose();
    controller.dispose();
    session.dispose();
    queries.clear();
  });
  await screen.findByRole('heading', { level: 1 });
  return { api, requests, router, session, view };
}
async function ready() {
  await screen.findByRole('heading', {
    name: 'Financeiro por titular e conta',
  });
  document.querySelectorAll('details').forEach((d) => {
    d.open = true;
  });
}
function writes(requests: Request[]) {
  return requests.filter((r) => r.method !== 'GET');
}
it('lists people and unknown saldo without losing unrelated URL filters', async () => {
  const { router } = await open('/contas?tipster=5&apagadas=1');
  await ready();
  expect(screen.getByRole('link', { name: 'Marina' })).toHaveAttribute(
    'href',
    '/contas/1?tipster=5&apagadas=1',
  );
  expect(screen.getByText('Marina · saldo Não informado')).toBeVisible();
  fireEvent.click(screen.getByRole('link', { name: 'Marina' }));
  await screen.findByRole('heading', { name: 'Marina' });
  expect(router.state.location.search).toContain('apagadas=1');
  expect(screen.getByText('Conta encerrada')).toBeVisible();
});
it('search, archived visibility and removal are explicit URL actions', async () => {
  const { router } = await open();
  await ready();
  fireEvent.change(screen.getByLabelText('Buscar titular'), {
    target: { value: 'Rafael' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
  await waitFor(() =>
    expect(router.state.location.search).toContain('buscar_titular=Rafael'),
  );
  await waitFor(() =>
    expect(
      screen.queryByRole('link', { name: 'Marina' }),
    ).not.toBeInTheDocument(),
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Remover busca: Rafael' }),
  );
  await screen.findByRole('link', { name: 'Marina' });
  fireEvent.click(
    screen.getByRole('button', { name: 'Incluir titulares arquivados' }),
  );
  await screen.findByRole('link', { name: 'Arquivo antigo' });
  fireEvent.click(
    screen.getByRole('button', { name: 'Ocultar titulares arquivados' }),
  );
  await waitFor(() =>
    expect(
      screen.queryByRole('link', { name: 'Arquivo antigo' }),
    ).not.toBeInTheDocument(),
  );
});
it('creates a person once and refreshes the server list', async () => {
  const { requests } = await open();
  await ready();
  fireEvent.change(screen.getByLabelText('Nome do titular'), {
    target: { value: ' Paula ' },
  });
  const submit = screen.getByRole('button', { name: 'Cadastrar titular' });
  fireEvent.click(submit);
  fireEvent.click(submit);
  await screen.findByRole('link', { name: 'Paula' });
  expect(writes(requests)).toHaveLength(1);
  expect(await writes(requests)[0]!.json()).toEqual({ nome: 'Paula' });
  expect(screen.getByLabelText('Nome do titular')).toHaveValue('');
});
it('renames a person, confirms archive, preserves account history', async () => {
  const { requests } = await open('/contas/1');
  await ready();
  fireEvent.change(screen.getByLabelText('Nome do titular'), {
    target: { value: 'Marina Silva' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar titular' }));
  await screen.findByRole('heading', { name: 'Marina Silva' });
  fireEvent.click(screen.getByRole('button', { name: 'Arquivar titular' }));
  fireEvent.click(screen.getByRole('button', { name: 'Agora não' }));
  expect(
    screen.getByRole('button', { name: 'Arquivar titular' }),
  ).toHaveFocus();
  expect(writes(requests)).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Arquivar titular' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar arquivo' }));
  await screen.findByText(
    'Este titular está arquivado. Suas contas e vigências permanecem no histórico.',
  );
  expect(screen.getByText('Conta principal')).toBeVisible();
  expect(screen.queryByLabelText('Nome do titular')).not.toBeInTheDocument();
});
it('creates an account using a canonical house with no automatic activation', async () => {
  const { requests } = await open('/contas/2');
  await ready();
  fireEvent.change(screen.getByLabelText('Apelido da conta'), {
    target: { value: 'Conta do Rafael' },
  });
  fireEvent.click(
    screen.getByRole('button', { name: 'Casa da nova conta Sem filtro' }),
  );
  fireEvent.click(await screen.findByRole('button', { name: 'Betano' }));
  fireEvent.click(screen.getByRole('button', { name: 'Cadastrar conta' }));
  await screen.findByText('Conta do Rafael');
  expect(writes(requests)).toHaveLength(1);
  expect(await writes(requests)[0]!.json()).toEqual({
    casa_id: 7,
    apelido: 'Conta do Rafael',
  });
  expect(writes(requests)[0]!.url).not.toContain('ativar');
});
it('activation uses only the advertised action and displays confirmed usage', async () => {
  const { requests } = await open('/contas/1');
  await ready();
  fireEvent.click(screen.getByRole('button', { name: 'Ativar conta' }));
  await screen.findByText('Em uso');
  expect(
    screen.queryByRole('button', { name: 'Ativar conta' }),
  ).not.toBeInTheDocument();
  expect(screen.getAllByText(/Atribuição explícita/).length).toBeGreaterThan(0);
  expect(writes(requests)).toHaveLength(1);
});
it('edits nickname and explicitly confirms closing, with cancel available', async () => {
  const { requests } = await open('/contas/1');
  await ready();
  fireEvent.click(screen.getByRole('button', { name: 'Editar conta' }));
  fireEvent.change(
    within(
      screen.getByRole('form', { name: 'Editar Conta principal' }),
    ).getByLabelText('Apelido da conta'),
    {
      target: { value: 'Conta reserva' },
    },
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Estado da conta Manter estado atual' }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Encerrada' }));
  fireEvent.click(
    screen.getByRole('button', { name: 'Confirmar encerramento e salvar' }),
  );
  await screen.findByRole('heading', { name: 'Conta reserva' });
  expect(await writes(requests)[0]!.json()).toEqual({
    apelido: 'Conta reserva',
    estado: 'ENCERRADA',
  });
  fireEvent.click(screen.getByRole('button', { name: 'Editar conta' }));
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(
    screen.queryByRole('form', { name: 'Editar Conta reserva' }),
  ).not.toBeInTheDocument();
});
it('house matrix includes people without an account and preserves filters', async () => {
  const { requests } = await open('/contas?casa=7&grupo=4');
  await ready();
  await screen.findByText('Rafael · cadastrar conta');
  expect(screen.getByText('Conta principal')).toBeVisible();
  expect(requests.some((r) => r.url.includes('/casas/7/matriz'))).toBe(true);
  expect(
    screen.getByRole('link', { name: 'Rafael · cadastrar conta' }),
  ).toHaveAttribute('href', '/contas/2?casa=7&grupo=4');
});
it('only supported dimensions enter the financial query and dates use end-exclusive Brasília', async () => {
  const { requests } = await open(
    '/contas/1?casa=7&conta=11&desde=2026-01-01&ate=2026-01-31&apagadas=1&tipster=8',
  );
  await ready();
  const req = requests.find((r) => r.url.includes('/titulares/financeiro'))!;
  const q = new URL(req.url).searchParams;
  expect(q.get('desde')).toBe('2026-01-01T03:00:00.000Z');
  expect(q.get('ate')).toBe('2026-02-01T03:00:00.000Z');
  expect(q.get('titular_id')).toBe('1');
  expect(q.get('conta_casa_id')).toBe('11');
  expect(q.has('tipster_id')).toBe(false);
  expect(q.has('incluir_apagadas')).toBe(false);
  expect(screen.getByText(/Esta matriz mostra todas as casas/)).toBeVisible();
});
it.each(['/contas?desde=2026-02-01&ate=2026-01-01', '/contas?ate=9999-12-31'])(
  'conflicting dates never trigger financial GET: %s',
  async (path) => {
    const { requests } = await open(path);
    await screen.findByText(/Corrija as datas/);
    expect(requests.some((r) => r.url.includes('/titulares/financeiro'))).toBe(
      false,
    );
  },
);
it.each(['abc', '9007199254740992', '0'])(
  'invalid path IDs never enter an API request: %s',
  async (id) => {
    const { requests } = await open('/contas/' + id);
    await screen.findByRole('heading', { name: 'Titular não encontrado' });
    expect(requests.some((r) => r.url.includes('/titulares'))).toBe(false);
  },
);
it('invalid query values fall back without breaking the screen', async () => {
  const { requests } = await open(
    '/contas?casa=abc&titulares_pagina=abc&buscar_titular=' + 'x'.repeat(161),
  );
  await ready();
  expect(
    screen.getByText(/Parâmetros inválidos foram ignorados/),
  ).toBeVisible();
  const req = requests.find(
    (r) => new URL(r.url).pathname === '/api/v1/titulares',
  )!;
  expect(new URL(req.url).searchParams.get('page')).toBe('1');
});
it.each([404, 405, 500, 503, 429])(
  'read error %s remains local and no dead page',
  async (status) => {
    await open('/contas', (req) =>
      new URL(req.url).pathname === '/api/v1/titulares'
        ? json({}, status)
        : undefined,
    );
    await ready();
    expect(
      screen.getByRole('region', { name: /Lista de titulares/ }),
    ).toBeVisible();
    expect(
      screen.getByRole('heading', { name: 'Financeiro por titular e conta' }),
    ).toBeVisible();
  },
);
it('READ_ONLY keeps the list, matrices and financial data; creates are disabled', async () => {
  const { requests } = await open('/contas/1', undefined, true);
  await ready();
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Salvar titular' }),
    ).toBeDisabled(),
  );
  expect(screen.getByRole('button', { name: 'Ativar conta' })).toBeDisabled();
  expect(
    screen.getByRole('button', { name: 'Cadastrar conta' }),
  ).toBeDisabled();
  expect(writes(requests)).toHaveLength(0);
});
it('422 preserves the form, never shows private backend payload', async () => {
  await open('/contas', (req) =>
    req.method === 'POST'
      ? json(
          {
            detail: [
              {
                loc: ['body', 'nome'],
                msg: 'SECRET_NAME',
                input: 'SECRET_VALUE',
                ctx: { secret: 'SECRET_CONTEXT' },
              },
            ],
          },
          422,
        )
      : undefined,
  );
  await ready();
  fireEvent.change(screen.getByLabelText('Nome do titular'), {
    target: { value: 'Ana' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Cadastrar titular' }));
  await screen.findByText('Confira os dados do pedido');
  expect(screen.getByLabelText('Nome do titular')).toHaveValue('Ana');
  expect(document.body.textContent).not.toContain('SECRET');
  fireEvent.click(
    screen.getByRole('button', { name: 'Confira Nome do titular' }),
  );
  expect(screen.getByLabelText('Nome do titular')).toHaveFocus();
});
it('unknown write is not replayed; explicit reconciliation performs only GETs', async () => {
  const { requests } = await open('/contas', (req) =>
    req.method === 'POST'
      ? Promise.reject(new TypeError('offline'))
      : undefined,
  );
  await ready();
  fireEvent.change(screen.getByLabelText('Nome do titular'), {
    target: { value: 'Ana' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Cadastrar titular' }));
  await screen.findByText('Confira se o pedido foi concluído');
  expect(
    screen.getByRole('button', { name: 'Cadastrar titular' }),
  ).toBeDisabled();
  fireEvent.click(
    screen.getByRole('button', { name: 'Consultar estado atual' }),
  );
  await screen.findByText(
    'Confira os dados consultados antes de uma nova alteração.',
  );
  expect(writes(requests)).toHaveLength(1);
});
it('logout clears sensitive forms and aborts pending writes', async () => {
  let finish!: (r: Response) => void;
  const { session, requests } = await open('/contas', (req) =>
    req.method === 'POST'
      ? new Promise((resolve) => {
          finish = resolve;
        })
      : undefined,
  );
  await ready();
  fireEvent.change(screen.getByLabelText('Nome do titular'), {
    target: { value: 'Privado' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Cadastrar titular' }));
  await waitFor(() => expect(finish).toBeDefined());
  await act(async () => {
    await session.logout();
  });
  finish(
    json(
      {
        id: 4,
        nome: 'Privado',
        arquivado: false,
        criado_em: '2026-01-01T12:00:00Z',
      },
      201,
    ),
  );
  await waitFor(() =>
    expect(document.body.textContent).not.toContain('Privado'),
  );
  expect(writes(requests)).toHaveLength(1);
});
it('rejects mismatched owner in matrix and malformed financial data', async () => {
  await open('/contas/1', (req) =>
    req.url.includes('/matriz')
      ? json({
          titular: {
            id: 2,
            nome: 'Alheio',
            arquivado: false,
            criado_em: '2026-01-01T12:00:00Z',
          },
          contas: [conta],
        })
      : req.url.includes('/financeiro')
        ? json({
            ...financeiro,
            saldo_atual_centavos: Number.MAX_SAFE_INTEGER + 1,
          })
        : undefined,
  );
  await screen.findByRole('region', { name: /Contas e vigências/ });
  await screen.findByRole('region', { name: /Financeiro por titular e conta/ });
  expect(document.body.textContent).not.toContain('Alheio');
});
it('all-time and no-data categories remain separate without local sums', async () => {
  await open('/contas', (req) =>
    req.url.includes('/financeiro')
      ? json({ ...financeiro, titulares: [], contas_sem_titular: [] })
      : undefined,
  );
  await ready();
  expect(screen.getByText(/Nenhum titular com dados/)).toBeVisible();
  expect(screen.getByText(/Nenhuma conta sem titular/)).toBeVisible();
  expect(
    within(
      screen.getByRole('region', { name: 'Financeiro por titular e conta' }),
    ).getByText('+R$ 42,00'),
  ).toBeVisible();
});
it('house selection and financial filter pills remove only the chosen dimension', async () => {
  const { router, requests } = await open('/contas?tipster=8');
  await ready();
  fireEvent.click(screen.getByRole('button', { name: 'Casa Sem filtro' }));
  fireEvent.click(screen.getByRole('button', { name: 'Betano' }));
  await screen.findByText('Rafael · cadastrar conta');
  expect(router.state.location.search).toContain('casa=7');
  fireEvent.click(screen.getByRole('button', { name: /Remover Casa:/ }));
  await waitFor(() =>
    expect(router.state.location.search).not.toContain('casa=7'),
  );
  expect(router.state.location.search).toContain('tipster=8');
  expect(requests.some((req) => req.url.includes('/casas/7/matriz'))).toBe(
    true,
  );
});
it('date pickers can explicitly clear both financial bounds', async () => {
  const { router } = await open('/contas?desde=2026-01-01&ate=2026-01-31');
  await ready();
  fireEvent.click(
    screen.getByRole('button', {
      name: /^Data inicial do financeiro /,
    }),
  );
  fireEvent.click(
    within(
      screen.getByRole('dialog', { name: 'Data inicial do financeiro' }),
    ).getByRole('button', { name: 'Remover limite' }),
  );
  await waitFor(() =>
    expect(router.state.location.search).not.toContain('desde='),
  );
  fireEvent.click(
    screen.getByRole('button', { name: /^Data final do financeiro / }),
  );
  fireEvent.click(
    within(
      screen.getByRole('dialog', { name: 'Data final do financeiro' }),
    ).getByRole('button', { name: 'Remover limite' }),
  );
  await waitFor(() =>
    expect(router.state.location.search).not.toContain('ate='),
  );
});
it('a failed list is retried with a safe GET and preserves the search', async () => {
  let fail = true;
  const { requests, router } = await open(
    '/contas?buscar_titular=Marina',
    (req) =>
      fail && new URL(req.url).pathname === '/api/v1/titulares'
        ? json({}, 500)
        : undefined,
  );
  await ready();
  const region = screen.getByRole('region', { name: /Lista de titulares/ });
  fail = false;
  fireEvent.click(
    within(region).getByRole('button', { name: 'Tentar novamente' }),
  );
  await screen.findByRole('link', { name: 'Marina' });
  expect(router.state.location.search).toContain('buscar_titular=Marina');
  expect(writes(requests)).toHaveLength(0);
});
it('uncertain writes stay blocked when explicit reconciliation fails', async () => {
  let failedRead = false;
  const { requests } = await open('/contas', (req) =>
    req.method === 'POST'
      ? Promise.reject(new TypeError('network'))
      : failedRead && new URL(req.url).pathname === '/api/v1/titulares'
        ? json({}, 500)
        : undefined,
  );
  await ready();
  fireEvent.change(screen.getByLabelText('Nome do titular'), {
    target: { value: 'Ana' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Cadastrar titular' }));
  await screen.findByText('Confira se o pedido foi concluído');
  failedRead = true;
  fireEvent.click(
    screen.getByRole('button', { name: 'Consultar estado atual' }),
  );
  await screen.findByText(
    'Não foi possível confirmar o estado. Consulte novamente antes de alterar.',
  );
  expect(
    screen.getByRole('button', { name: 'Cadastrar titular' }),
  ).toBeDisabled();
  expect(writes(requests)).toHaveLength(1);
});
it('programmatic submit in READ_ONLY is refused even if the disabled field is changed', async () => {
  const { requests } = await open('/contas', undefined, true);
  await ready();
  const field = screen.getByLabelText('Nome do titular');
  fireEvent.change(field, { target: { value: 'Tentativa' } });
  fireEvent.submit(field.closest('form')!);
  await act(async () => {
    await Promise.resolve();
  });
  expect(writes(requests)).toHaveLength(0);
});
it('Retry-After on a write blocks submit and manual check without replay', async () => {
  const { requests } = await open('/contas', (req) =>
    req.method === 'POST' ? json({}, 429, { 'Retry-After': '120' }) : undefined,
  );
  await ready();
  const field = screen.getByLabelText('Nome do titular');
  fireEvent.change(field, { target: { value: 'Ana' } });
  fireEvent.click(screen.getByRole('button', { name: 'Cadastrar titular' }));
  await screen.findByText('Aguarde para tentar novamente');
  fireEvent.submit(field.closest('form')!);
  expect(
    screen.getByRole('button', { name: 'Consultar estado atual' }),
  ).toBeDisabled();
  expect(writes(requests)).toHaveLength(1);
});
it('unsupported exact IDs do not silently broaden the financial population', async () => {
  const { requests, router } = await open('/contas?conta=9007199254740993');
  await screen.findByText(/Este identificador exige uma consulta/);
  expect(
    requests.some((req) => req.url.includes('/titulares/financeiro')),
  ).toBe(false);
  expect(router.state.location.search).toContain('9007199254740993');
});
it('malformed activation receipt is uncertain and never grants local use state', async () => {
  const { requests } = await open('/contas/1', (req) =>
    req.method === 'POST' && req.url.endsWith('/ativar')
      ? json({
          ...conta,
          estado: 'EM_USO',
          intervalo_ativo: {
            vigente_de: 'INVALID_TIME',
            vigente_ate: null,
            origem: 'EXPLICITA',
          },
        })
      : undefined,
  );
  await ready();
  fireEvent.click(screen.getByRole('button', { name: 'Ativar conta' }));
  await screen.findByText('Confira se o pedido foi concluído');
  expect(document.body.textContent).not.toContain('INVALID_TIME');
  expect(screen.getByRole('button', { name: 'Ativar conta' })).toBeDisabled();
  expect(writes(requests)).toHaveLength(1);
});
it.each(['/contas', '/contas/2'])(
  'empty house catalogs offer a search action: %s',
  async (path) => {
    await open(path, (req) =>
      new URL(req.url).pathname === '/api/v1/filtros/casas'
        ? json({
            dimensao: 'casas',
            data: [],
            pagination: { page: 1, page_size: 20, total: 0 },
          })
        : undefined,
    );
    await ready();
    const label =
      path === '/contas'
        ? /^Casa Sem filtro$/
        : /^Casa da nova conta Sem filtro$/;
    fireEvent.click(screen.getByRole('button', { name: label }));
    const dialog = screen.getByRole('dialog', {
      name: path === '/contas' ? 'Casa' : 'Casa da nova conta',
    });
    expect(
      within(dialog).getByText(
        'Nenhuma casa nesta busca. Tente outro nome ou busque sem texto.',
      ),
    ).toBeVisible();
    expect(
      within(dialog).getByRole('button', { name: 'Buscar' }),
    ).toBeEnabled();
  },
);
it('an exact catalog ID unsupported by the write contract is explained without rounding', async () => {
  const { requests } = await open('/contas/2', (req) =>
    new URL(req.url).pathname === '/api/v1/filtros/casas'
      ? json({
          dimensao: 'casas',
          data: [
            { id: '9007199254740993', nome: 'Casa com ID exato', ativa: true },
          ],
          pagination: { page: 1, page_size: 20, total: 1 },
        })
      : undefined,
  );
  await ready();
  fireEvent.change(screen.getByLabelText('Apelido da conta'), {
    target: { value: 'Conta' },
  });
  fireEvent.click(
    screen.getByRole('button', { name: 'Casa da nova conta Sem filtro' }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Casa com ID exato' }));
  await screen.findByText(/Esta casa exige uma versão do cadastro/);
  expect(
    screen.getByRole('button', { name: 'Cadastrar conta' }),
  ).toBeDisabled();
  expect(writes(requests)).toHaveLength(0);
});
