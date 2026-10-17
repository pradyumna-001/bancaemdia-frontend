import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { createSession } from '../../../auth/session';
import { sessionContext } from '../../../auth/protocol';
import { ProvedorAuth } from '../../../auth/ProvedorAuth';
import { createApiClient } from '../../../api/client';
import { parseConfig } from '../../../lib/config';
import {
  analises,
  caixaAnalises,
  bucket,
} from '../../../../tests/fixtures/analises';
import { AnalisesPage } from './AnalisesPage';
import { EvolucaoCaixa } from './EvolucaoCaixa';
import { ComparacaoAnalise } from './ComparacaoAnalise';
import { MapaHorarios } from './MapaHorarios';
const cleanup: Array<() => void> = [];
const json = (body: unknown, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
type Handler = (req: Request) => Response | Promise<Response>;
afterEach(() => {
  cleanup.splice(0).forEach((f) => f());
  vi.restoreAllMocks();
  vi.useRealTimers();
});
async function open(
  initial = '/painel/analises',
  custom: Record<string, Handler> = {},
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
  const requests: Request[] = [];
  const handlers = { ...custom };
  const client = createApiClient(
    parseConfig({ VITE_API_URL: 'http://127.0.0.1:8000' }),
    {
      captureSession: session.capture,
      fetcher: async (req) => {
        requests.push(req.clone());
        const u = new URL(req.url);
        if (handlers[u.pathname]) return handlers[u.pathname]!(req);
        if (u.pathname === '/api/v1/painel/analises') return json(analises);
        if (u.pathname.startsWith('/api/v1/filtros/'))
          return json({
            dimensao: u.pathname.split('/').at(-1),
            data: [{ id: '7', nome: 'Opção teste', ativa: true }],
            pagination: { page: 1, page_size: 20, total: 1 },
          });
        return json(caixaAnalises);
      },
    },
  );
  const router = createMemoryRouter(
    [
      { path: '/painel/analises', element: <AnalisesPage client={client} /> },
      { path: '/painel', element: <p>Painel de volta</p> },
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
  return { requests, handlers, router, session, queries };
}
async function ready() {
  await screen.findAllByText('Futebol');
  await screen.findByRole('heading', { name: 'Banca principal' });
}
it('shows the approved comparisons, exact values, unknown sport, all partitions and separate cash', async () => {
  const h = await open(
    '/painel/analises?casa=7&tipster=8&mercado=9&apagadas=1&grupo=3&periodo=all',
  );
  await ready();
  expect(screen.getAllByText('+R$ 528,00').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Esporte não informado')[0]!).toBeVisible();
  expect(screen.getByText(/Filtros preservados no endereço/)).toHaveTextContent(
    'apagadas',
  );
  const query = new URL(
    h.requests.find((r) => r.url.includes('/painel/analises'))!.url,
  ).searchParams;
  expect(Object.fromEntries(query)).toEqual({
    periodo: 'all',
    casa_id: '7',
    tipster_id: '8',
    mercado_id: '9',
  });
  const cash = new URL(
    h.requests.find((r) => new URL(r.url).pathname === '/api/v1/painel')!.url,
  );
  expect(Object.fromEntries(cash.searchParams)).toEqual({
    periodo: 'all',
    casa_id: '7',
  });
  for (const summary of document.querySelectorAll('details > summary'))
    fireEvent.click(summary);
  expect(
    screen.getByRole('table', {
      name: /Lucro liquidado conhecido e quantidade/,
    }),
  ).toBeVisible();
  for (const label of ['Depósitos acumulados', 'Saques acumulados', 'Saldo'])
    fireEvent.click(screen.getByRole('radio', { name: label }));
  expect(
    screen.getAllByText('Saldo não informado para esta série.').length,
  ).toBeGreaterThan(0);
  expect(h.requests.every((r) => r.method === 'GET')).toBe(true);
  fireEvent.click(screen.getByRole('link', { name: 'Voltar ao Painel' }));
  await screen.findByText('Painel de volta');
  expect(h.router.state.location.search).toContain('apagadas=1');
});
it('uses defaults for invalid params, changes/removes explicit filters and preserves the rest', async () => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
  const h = await open('/painel/analises?casa=7&apagadas=1&periodo=invalid');
  await ready();
  expect(screen.getByText(/Parâmetros inválidos/)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Remover filtro Casa' }));
  await waitFor(() =>
    expect(h.router.state.location.search).not.toContain('casa='),
  );
  expect(h.router.state.location.search).toContain('apagadas=1');
  fireEvent.click(screen.getByText('Filtros e período'));
  fireEvent.click(screen.getByRole('button', { name: /Período das análises/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Últimos 7 dias' }));
  await waitFor(() =>
    expect(h.router.state.location.search).toContain('periodo=7d'),
  );
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: /Casa Sem filtro/ }),
    ).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole('button', { name: /Casa Sem filtro/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Opção teste' }));
  await waitFor(() =>
    expect(h.router.state.location.search).toContain('casa=7'),
  );
});
it('keeps good sections and old data visible after independent errors, then recovers by gesture', async () => {
  const h = await open();
  await ready();
  h.handlers['/api/v1/painel/analises'] = () => json({}, 500);
  fireEvent.click(screen.getByRole('button', { name: 'Atualizar análises' }));
  await screen.findByText(
    'O serviço encontrou um problema. Tente novamente mais tarde.',
  );
  expect(screen.getAllByText('Futebol')[0]!).toBeVisible();
  expect(
    screen.getByRole('heading', { name: 'Banca principal' }),
  ).toBeVisible();
  h.handlers['/api/v1/painel/analises'] = () => json(analises);
  fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  await waitFor(() =>
    expect(
      screen.queryByText(
        'O serviço encontrou um problema. Tente novamente mais tarde.',
      ),
    ).toBeNull(),
  );
});
it('has actionable empty and null states and keeps a failed cash section independent', async () => {
  const empty = {
    ...structuredClone(analises),
    total_filtrado: { ...analises.total_filtrado, total_apostas: 0 },
    odd_media: null,
    profit_factor: null,
  };
  await open('/painel/analises', {
    '/api/v1/painel/analises': () => json(empty),
    '/api/v1/painel': () => json({}, 503, { 'Retry-After': '70' }),
  });
  await screen.findByRole('heading', { name: 'Sem apostas neste recorte' });
  expect(screen.getByRole('link', { name: 'Enviar apostas' })).toBeVisible();
  expect(
    await screen.findByText(
      'O serviço está temporariamente indisponível. Aguarde para tentar novamente.',
    ),
  ).toBeVisible();
  expect(
    screen.getByRole('button', { name: 'Atualizar análises' }),
  ).toBeDisabled();
});
it('keeps the deadline after leaving and returning to a cached query error', async () => {
  const h = await open('/painel/analises', {
    '/api/v1/painel/analises': () => json({}, 503, { 'Retry-After': '70' }),
  });
  await screen.findByText(
    'O serviço está temporariamente indisponível. Aguarde para tentar novamente.',
  );
  await act(() => h.router.navigate('/painel'));
  await screen.findByText('Painel de volta');
  await act(() => h.router.navigate('/painel/analises'));
  await waitFor(() => expect(h.queries.isFetching()).toBe(0));
  expect(
    screen.getByRole('button', { name: 'Atualizar análises' }),
  ).toBeDisabled();
  expect(
    h.requests.filter(
      (r) => new URL(r.url).pathname === '/api/v1/painel/analises',
    ),
  ).toHaveLength(1);
});
it('never shortens a longer Retry-After when the other section fails later', async () => {
  let finish!: (r: Response) => void;
  const pending = new Promise<Response>((resolve) => {
    finish = resolve;
  });
  const h = await open('/painel/analises', {
    '/api/v1/painel/analises': () => json({}, 503, { 'Retry-After': '70' }),
    '/api/v1/painel': () => pending,
  });
  await screen.findByText(
    'O serviço está temporariamente indisponível. Aguarde para tentar novamente.',
  );
  vi.useFakeTimers();
  await act(async () => {
    finish(json({}, 429, { 'Retry-After': '1' }));
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(
    screen.getByText('Muitas tentativas. Aguarde para tentar novamente.'),
  ).toBeVisible();
  const before = h.requests.length;
  await act(async () => vi.advanceTimersByTimeAsync(2000));
  expect(
    screen.getByRole('button', { name: 'Atualizar análises' }),
  ).toBeDisabled();
  expect(h.requests).toHaveLength(before);
});
it('drops an old response after logout and does not expose private data again', async () => {
  let finish!: (r: Response) => void;
  const pending = new Promise<Response>((r) => {
    finish = r;
  });
  const h = await open('/painel/analises', {
    '/api/v1/painel/analises': () => pending,
  });
  await waitFor(() =>
    expect(h.requests.some((r) => r.url.includes('/analises'))).toBe(true),
  );
  await act(() => h.session.logout());
  await act(async () => finish(json(analises)));
  expect(screen.queryByText('Futebol')).toBeNull();
});
it('renders missing categories, missing map cells, unknown bank capital and empty cash safely', () => {
  const view = render(
    <>
      <ComparacaoAnalise itens={[]} tipo="por_esporte" />
      <ComparacaoAnalise
        itens={[
          {
            ...bucket,
            chave: '1',
            nome: null,
            motivo_progressao: 'capital_ausente_ou_zero',
            capital_banca_centavos: undefined,
          },
        ]}
        tipo="por_banca_progressao"
      />
      <MapaHorarios itens={[bucket]} />
      <EvolucaoCaixa pontos={[]} />
    </>,
  );
  expect(screen.getByText(/Sem categorias/)).toBeVisible();
  expect(screen.getAllByText('Não informado').length).toBeGreaterThan(0);
  expect(screen.getByText(/Sem evolução consolidada/)).toBeVisible();
  view.unmount();
});
