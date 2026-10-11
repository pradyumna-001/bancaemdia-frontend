import { Blob as NativeBlob } from 'node:buffer';
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
import {
  diario,
  diarioDemo,
  grupos,
  gruposDemo,
  legado,
  filtrado,
} from '../../../tests/fixtures/painel';
import { PainelPage } from './PainelPage';
import { DIARIO, GRUPOS, EXPORT, type Hierarquia } from './protocol';

const cleanup: Array<() => void> = [];
const json = (body: unknown, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
beforeEach(() => {
  vi.stubGlobal('Blob', NativeBlob);
  HTMLDialogElement.prototype.showModal ??= function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close ??= function () {
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
  vi.stubGlobal('URL', URL);
  URL.createObjectURL = vi.fn(() => 'blob:private-download');
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
afterEach(() => {
  cleanup.splice(0).forEach((f) => f());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
type Handler = (req: Request) => Response | Promise<Response>;
async function open(initial = '/painel', custom: Record<string, Handler> = {}) {
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
  const requests: Request[] = [];
  const handlers = { ...custom };
  const client = createApiClient(
    parseConfig({ VITE_API_URL: 'http://127.0.0.1:8000' }),
    {
      captureSession: session.capture,
      fetcher: async (req) => {
        requests.push(req.clone());
        const url = new URL(req.url);
        const groupResponse = async (response: Response) => {
          if (!response.ok) return response;
          const body = (await response.json()) as Hierarquia;
          body.filtros = Object.fromEntries(
            [...url.searchParams].filter(
              ([k]) => !['page_size', 'cursor', 'fresh'].includes(k),
            ),
          );
          return json(body);
        };
        if (handlers[url.pathname]) {
          const response = await handlers[url.pathname]!(req);
          return url.pathname === GRUPOS ? groupResponse(response) : response;
        }
        if (url.pathname.startsWith('/api/v1/filtros/'))
          return json({
            dimensao: url.pathname.split('/').at(-1),
            data: [],
            pagination: { page: 1, page_size: 20, total: 0 },
          });
        if (url.pathname === DIARIO) {
          const d = diarioDemo(
            url.searchParams.get('inicio_dia') ?? undefined,
            url.searchParams.get('dias_por_pagina') === '90' ? 90 : 14,
          );
          d.filtros = {
            ...d.filtros,
            ...Object.fromEntries(
              [...url.searchParams].filter(
                ([k]) =>
                  !['dias_por_pagina', 'inicio_dia', 'fresh'].includes(k),
              ),
            ),
          };
          return json(d);
        }
        if (url.pathname === GRUPOS) return groupResponse(json(gruposDemo()));
        if (url.pathname === '/api/v1/painel/filtrado') return json(filtrado);
        if (url.pathname === EXPORT)
          return new Response(
            new Blob(['Excel'], {
              type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            }),
          );
        return json(legado);
      },
    },
  );
  const router = createMemoryRouter(
    [
      { path: '/painel', element: <PainelPage client={client} /> },
      { path: '/enviar', element: <p>Enviar</p> },
    ],
    { initialEntries: [initial] },
  );
  const view = render(
    <ProvedorAuth service={session}>
      <QueryClientProvider client={queries}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ProvedorAuth>,
  );
  cleanup.push(() => {
    view.unmount();
    router.dispose();
    session.dispose();
    queries.clear();
  });
  return { requests, handlers, router, session, queries, view };
}
async function ready() {
  await screen.findByText('Seleções de futebol');
  await screen.findByText(
    'Sem evolução consolidada. Escolha outro período ou envie apostas.',
  );
}
it('renders signed daily values/states, fixed total, group children and separate unknown global saldo', async () => {
  await open();
  await ready();
  expect(
    screen.getAllByText('Resultado pendente · 12 apostas').length,
  ).toBeGreaterThan(0);
  expect(screen.getByText('Saldo total ainda não confirmado')).toBeVisible();
  const group = screen.getByText('Seleções de futebol').closest('details')!;
  fireEvent.click(group.querySelector('summary')!);
  expect(within(group).getByText('Linha da Marina')).toBeVisible();
  expect(within(group).getByText(/2 de 2 tipsters carregados/)).toBeVisible();
  expect(screen.getByRole('link', { name: 'Enviar apostas' })).toHaveAttribute(
    'href',
    '/enviar',
  );
});
it('navigates all daily intervals through shareable dates, preserves filters and refreshes all sections', async () => {
  const h = await open('/painel?casa=7&periodo=90d');
  await ready();
  fireEvent.click(screen.getByRole('button', { name: 'Próximos dias' }));
  await waitFor(() =>
    expect(h.router.state.location.search).toContain(
      'diario_inicio=2026-01-15',
    ),
  );
  await screen.findAllByText('15/01/2026');
  fireEvent.click(screen.getByRole('button', { name: 'Dias anteriores' }));
  await waitFor(() =>
    expect(h.router.state.location.search).toContain(
      'diario_inicio=2026-01-01',
    ),
  );
  await waitFor(() =>
    expect(screen.getByRole('button', { name: '90 dias' })).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole('button', { name: '90 dias' }));
  await screen.findAllByText('31/03/2026');
  expect(h.router.state.location.search).toContain('casa=7');
  expect(h.router.state.location.search).not.toContain('cursor');
  fireEvent.click(
    screen.getByRole('button', { name: 'Atualizar todo o Painel' }),
  );
  await waitFor(() =>
    expect(
      h.requests.some(
        (r) => new URL(r.url).searchParams.get('fresh') === 'true',
      ),
    ).toBe(true),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Remover filtro Casa' }));
  await waitFor(() =>
    expect(h.router.state.location.search).not.toContain('casa='),
  );
}, 15_000);
it('exports the full canonical selection once and revokes the private Blob', async () => {
  const h = await open('/painel?grupo=9007199254740993&apagadas=1');
  await screen.findByText('Seleções de futebol');
  fireEvent.click(
    screen.getByRole('button', { name: 'Exportar Painel em Excel' }),
  );
  await screen.findByText(/Excel pronto para baixar/);
  const url = new URL(
    h.requests.find((r) => new URL(r.url).pathname === EXPORT)!.url,
  );
  expect(url.searchParams.get('grupo_id')).toBe('9007199254740993');
  expect(url.searchParams.get('visibilidade')).toBe('apagadas');
  expect(url.searchParams.has('cursor')).toBe(false);
  expect(url.searchParams.has('dias_por_pagina')).toBe(false);
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:private-download');
  expect(
    screen.getByText(/A evolução acumulada não está disponível/),
  ).toBeVisible();
});
it('keeps the server deadline across refresh, new filters and export retries', async () => {
  const h = await open('/painel?grupo=7', {
    [DIARIO]: () => json({}, 429, { 'Retry-After': '120' }),
  });
  await screen.findByText('Muitas tentativas. Aguarde para tentar novamente.');
  expect(
    screen.getByRole('button', { name: 'Atualizar todo o Painel' }),
  ).toBeDisabled();
  const count = h.requests.filter(
    (r) => new URL(r.url).pathname === DIARIO,
  ).length;
  await act(() => h.router.navigate('/painel?grupo=8'));
  await new Promise((resolve) => setTimeout(resolve, 30));
  expect(
    h.requests.filter((r) => new URL(r.url).pathname === DIARIO),
  ).toHaveLength(count);
});
it('handles invalid date defaults, empty sections and no silent global fallback', async () => {
  const d = structuredClone(diario);
  d.dias = [];
  d.intervalo_devolvido = { inicio: null, fim_exclusivo: null, dias: 0 };
  d.total_periodo = d.sem_data;
  const h = await open('/painel?diario_inicio=bad&estado=RED', {
    [DIARIO]: () => json(d),
    [GRUPOS]: () =>
      json({ ...grupos, grupos: [], total_grupos: 0, total_filhos: 0 }),
  });
  await screen.findByText(
    'Não há grupos neste recorte. Escolha outros filtros ou envie apostas.',
  );
  expect(screen.getByText(/Intervalo diário inválido/)).toBeVisible();
  expect(screen.getByText(/Não há datas para comparar/)).toBeVisible();
  expect(
    h.requests.filter((r) => new URL(r.url).pathname === '/api/v1/painel'),
  ).toHaveLength(1);
});
it('merges paginated children keeping the parent total and detects changed metrics', async () => {
  const first = structuredClone(grupos);
  first.grupos[0]!.total_filhos = 2;
  first.total_filhos = 2;
  first.proximo_cursor = 'private-cursor';
  const second = structuredClone(first);
  second.proximo_cursor = null;
  second.grupos[0]!.tipsters[0]!.id = '3';
  second.grupos[0]!.tipsters[0]!.nome = 'Segunda análise';
  const h = await open('/painel', {
    [GRUPOS]: (req) =>
      json(new URL(req.url).searchParams.has('cursor') ? second : first),
  });
  await screen.findByText('Grupo exemplo');
  fireEvent.click(
    screen.getByRole('button', { name: 'Carregar mais grupos e tipsters' }),
  );
  await screen.findByText('Segunda análise');
  expect(screen.getByText('2 de 2 tipsters carregados')).toBeVisible();
  h.handlers[GRUPOS] = () =>
    json({ ...first, proximo_cursor: 'private-cursor' });
  fireEvent.click(
    screen.getByRole('button', { name: 'Atualizar todo o Painel' }),
  );
  await screen.findByRole(
    'button',
    {
      name: 'Carregar mais grupos e tipsters',
    },
    { timeout: 5000 },
  );
  second.grupos[0]!.metricas.lucro_centavos = '777';
  h.handlers[GRUPOS] = () => json(second);
  fireEvent.click(
    screen.getByRole('button', { name: 'Carregar mais grupos e tipsters' }),
  );
  await screen.findByText(/Se os dados mudaram entre páginas/);
  expect(screen.queryByText('Segunda análise')).not.toBeInTheDocument();
}, 15_000);
it('keeps previous groups on next-page network failure and supports safe recovery', async () => {
  const first = { ...structuredClone(grupos), proximo_cursor: 'next' };
  let fail = true;
  await open('/painel', {
    [GRUPOS]: (req) =>
      new URL(req.url).searchParams.has('cursor') && fail
        ? json({}, 500)
        : json(first),
  });
  await screen.findByText('Grupo exemplo');
  fireEvent.click(
    screen.getByRole('button', { name: 'Carregar mais grupos e tipsters' }),
  );
  await screen.findByText(
    'O serviço encontrou um problema. Tente novamente mais tarde.',
  );
  expect(screen.getByText('Grupo exemplo')).toBeVisible();
  fail = false;
  fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  await waitFor(() =>
    expect(
      screen.queryByText(
        'O serviço encontrou um problema. Tente novamente mais tarde.',
      ),
    ).not.toBeInTheDocument(),
  );
});
it('isolates failed saldo/compared sections and retries only explicit safe reads', async () => {
  const h = await open('/painel', {
    '/api/v1/painel': () => json({}, 500),
    '/api/v1/painel/filtrado': () => json({}, 503),
  });
  await screen.findByText('Seleções de futebol');
  expect(
    screen.getAllByText(
      'O serviço encontrou um problema. Tente novamente mais tarde.',
    ),
  ).toHaveLength(2);
  h.handlers['/api/v1/painel'] = () => json(legado);
  h.handlers['/api/v1/painel/filtrado'] = () => json(filtrado);
  for (const b of screen.getAllByRole('button', { name: 'Tentar novamente' }))
    fireEvent.click(b);
  await screen.findByText('Saldo total ainda não confirmado');
  await screen.findByText(
    'Sem evolução consolidada. Escolha outro período ou envie apostas.',
  );
});
it('rejects malformed export and supports explicit corrected download', async () => {
  const h = await open('/painel', {
    [EXPORT]: () => new Response(new Blob(['bad'], { type: 'text/html' })),
  });
  await ready();
  fireEvent.click(
    screen.getByRole('button', { name: 'Exportar Painel em Excel' }),
  );
  await screen.findByText(
    'Não foi possível ler a resposta do serviço. Tente novamente.',
  );
  h.handlers[EXPORT] = () =>
    new Response(
      new Blob(['Excel'], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
    );
  fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  await screen.findByText(/Excel pronto para baixar/);
});
it('aborts late export and clears private data on logout', async () => {
  let resolve!: (r: Response) => void;
  const h = await open('/painel', {
    [EXPORT]: () =>
      new Promise<Response>((r) => {
        resolve = r;
      }),
  });
  await ready();
  fireEvent.click(
    screen.getByRole('button', { name: 'Exportar Painel em Excel' }),
  );
  await waitFor(() => expect(resolve).toBeDefined());
  await act(() => h.session.logout());
  await act(async () =>
    resolve(
      new Response(
        new Blob(['Excel'], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
      ),
    ),
  );
  expect(URL.createObjectURL).not.toHaveBeenCalled();
  expect(
    h.queries
      .getQueryCache()
      .getAll()
      .every((q) => q.state.data === undefined),
  ).toBe(true);
});

it('renders published accumulated rows, known saldo, dimension rows and undated facts without computing totals', async () => {
  const historic = {
    ...legado,
    saldo: { ...legado.saldo, saldo_total_centavos: 12345 },
    evolucao: [
      {
        periodo_inicio: '2026-01-01',
        banca_id: null,
        banca_nome: null,
        lucro_periodo_centavos: 100,
        lucro_acumulado_centavos: 100,
        saldo_centavos: null,
      },
      {
        periodo_inicio: '2026-01-02',
        banca_id: 1,
        banca_nome: 'Banca contratada',
        lucro_periodo_centavos: -10,
        lucro_acumulado_centavos: 90,
        saldo_centavos: 90,
      },
    ],
  };
  const d = structuredClone(diario);
  d.sem_data = {
    ...d.total_periodo,
    lucro_centavos: null,
    retorno_centavos: null,
    roi: null,
    estado_dado: 'desconhecido',
  };
  const comparisons = {
    ...filtrado,
    por_casa: [
      {
        id: '7',
        nome: 'Casa contratada',
        metricas: { ...filtrado.resumo, lucro_centavos: 100 },
      },
    ],
    por_tipster: [{ id: null, nome: null, metricas: filtrado.resumo }],
  };
  await open('/painel', {
    [DIARIO]: () => json(d),
    '/api/v1/painel': () => json(historic),
    '/api/v1/painel/filtrado': () => json(comparisons),
  });
  await screen.findByText('Banca contratada');
  expect(screen.getByText('Sem banca atribuída')).toBeVisible();
  expect(await screen.findByText('Casa contratada')).toBeVisible();
  expect(screen.getByText('Sem identificação')).toBeVisible();
  expect(
    screen.getByText('Apostas sem data · fora do desenho diário'),
  ).toBeVisible();
  expect(screen.getByText('R$ 123,45')).toBeVisible();
});
it('recovers daily failures explicitly and rejects a looping group cursor', async () => {
  const first = { ...structuredClone(grupos), proximo_cursor: 'loop' };
  const h = await open('/painel?grupo=7', {
    [DIARIO]: () => json({}, 500),
    [GRUPOS]: () => json(first),
  });
  await screen.findByText(
    'O serviço encontrou um problema. Tente novamente mais tarde.',
  );
  h.handlers[DIARIO] = () => json(diario);
  fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  await screen.findByText('Grupo exemplo');
  fireEvent.click(
    screen.getByRole('button', { name: 'Carregar mais grupos e tipsters' }),
  );
  await screen.findByText(
    'Não foi possível ler a resposta do serviço. Tente novamente.',
  );
  expect(screen.getByText('Grupo exemplo')).toBeVisible();
});
