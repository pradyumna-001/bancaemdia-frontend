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
import { createApiClient } from '../../api/client';
import { parseConfig } from '../../lib/config';
import { ApiError } from '../../api/error';
import examples from '../../../tests/fixtures/hipotetica.json';
import { HipoteticaPage } from './HipoteticaPage';
import { ESTADOS, type Comparacao } from './protocol';

const identity = vi.hoisted(() => ({ authenticated: true }));
vi.mock('../../auth/ProvedorAuth', () => ({
  useAuth: () =>
    identity.authenticated
      ? {
          state: { phase: 'authenticated', privateEpoch: 1, person: { id: 1 } },
          service: { read: async <T,>(work: () => Promise<T>) => work() },
        }
      : undefined,
}));
const cleanups: Array<() => void> = [];
afterEach(() => {
  cleanups.splice(0).forEach((work) => work());
  identity.authenticated = true;
  vi.useRealTimers();
});

async function open(search = '', initial: unknown = examples.comparado) {
  const queries = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  let response: unknown = initial;
  const calls: Request[] = [];
  const client = createApiClient(
    parseConfig({ VITE_API_URL: 'http://127.0.0.1:8000' }),
    {
      fetcher: async (req) => {
        const url = new URL(req.url);
        if (url.pathname.startsWith('/api/v1/filtros/'))
          return new Response(
            JSON.stringify({
              dimensao: url.pathname.split('/').at(-1),
              data: [],
              pagination: { page: 1, page_size: 20, total: 0 },
            }),
            { headers: { 'Content-Type': 'application/json' } },
          );
        calls.push(req.clone());
        if (response instanceof Error) throw response;
        if (response instanceof Response) return response.clone();
        return new Response(JSON.stringify(response), {
          headers: { 'Content-Type': 'application/json' },
        });
      },
    },
  );
  const router = createMemoryRouter(
    [{ path: '/e-se', element: <HipoteticaPage client={client} /> }],
    { initialEntries: ['/e-se' + search] },
  );
  const view = render(
    <QueryClientProvider client={queries}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  cleanups.push(() => {
    view.unmount();
    router.dispose();
    queries.clear();
  });
  return {
    calls,
    router,
    queries,
    respond: (value: unknown) => {
      response = value;
    },
  };
}
it('mostra os valores e deltas assinados da mesma resposta, metadados e composição sem cálculo local', async () => {
  const h = await open();
  await screen.findByRole('heading', { name: 'Comparação disponível' });
  expect(
    screen.getByRole('region', { name: 'O que aconteceu' }),
  ).toHaveTextContent('+R$ 160,00');
  expect(
    screen.getByRole('region', { name: 'Seguindo a stake do tipster' }),
  ).toHaveTextContent('+R$ 20,00');
  expect(
    screen.getByRole('region', { name: 'O que mudaria' }),
  ).toHaveTextContent('−R$ 140,00');
  expect(
    screen.getByRole('link', { name: '← Voltar às Apostas' }),
  ).toHaveAttribute('href', '/');
  fireEvent.click(screen.getByRole('button', { name: 'Atualizar comparação' }));
  await waitFor(() => expect(h.calls).toHaveLength(2));
});
for (const estado of Object.keys(ESTADOS) as Comparacao['estado'][]) {
  it(`apresenta o estado publicado ${estado} e limitações sem substituir ausência por zero`, async () => {
    const data = {
      ...examples.indisponivel,
      estado,
      filtros: { ...examples.indisponivel.filtros, visibilidade: 'ativas' },
    };
    await open('', data);
    await screen.findByRole('heading', { name: ESTADOS[estado][0] });
    expect(
      screen.getByRole('region', { name: 'Seguindo a stake do tipster' }),
    ).toHaveTextContent('Não informado');
    expect(
      screen.getByRole('heading', { name: 'Limitações deste recorte' }),
    ).toBeVisible();
  });
}
it('renderiza auditoria, limites civis e nulos, preserva filtros ao voltar e recusa resposta de outro recorte', async () => {
  const data = structuredClone(examples.comparado);
  const filters = data.filtros as Comparacao['filtros'];
  filters.visibilidade = 'apagadas';
  filters.casa_id = '7';
  filters.desde = '2026-10-01T03:00:00Z';
  filters.ate = '2026-10-03T03:00:00Z';
  const h = await open(
    '?casa=7&apagadas=1&desde=2026-10-01&ate=2026-10-02',
    data,
  );
  await screen.findByRole('heading', { name: 'Comparação disponível' });
  expect(screen.getByText(/somente apostas apagadas/)).toBeVisible();
  expect(screen.getByText(/Até.*exclusivo/)).toBeVisible();
  expect(
    screen.getByRole('link', { name: '← Voltar às Apostas' }),
  ).toHaveAttribute(
    'href',
    '/?casa=7&apagadas=1&desde=2026-10-01&ate=2026-10-02',
  );
  h.respond(examples.comparado);
  fireEvent.click(screen.getByRole('button', { name: 'Atualizar comparação' }));
  await screen.findByRole('alert');
  expect(screen.getByText(/última consulta disponível/)).toBeVisible();
  await act(() => h.router.navigate('/e-se?apagadas=todas'));
  const other = {
    ...examples.comparado,
    filtros: { ...examples.comparado.filtros, visibilidade: 'todas' },
  };
  h.respond(other);
  fireEvent.click(
    await screen.findByRole('button', { name: 'Tentar novamente' }),
  );
  await screen.findByText(/ativas e apagadas \(auditoria\)/);
});
it('não consulta período conflitante, evita cache de outro filtro e aceita URL inválida pelo padrão', async () => {
  const h = await open('?periodo=7d&desde=2026-10-01');
  expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
  expect(h.calls).toHaveLength(0);
  await act(() => h.router.navigate('/e-se?casa=invalida'));
  await screen.findByRole('heading', { name: 'Comparação disponível' });
  expect(screen.getByText(/Filtros inválidos usam o padrão/)).toBeVisible();
});
for (const status of [404, 405, 422, 429, 500, 503]) {
  it(`trata HTTP ${status} com recorte preservado e retry seguro`, async () => {
    const h = await open(
      '?tipster=7',
      new Response(JSON.stringify({ detail: 'private diagnostic' }), {
        status,
        headers: {
          'Content-Type': 'application/json',
          ...(status === 429 || status === 503 ? { 'Retry-After': '120' } : {}),
        },
      }),
    );
    await screen.findByRole('alert');
    expect(screen.queryByText('private diagnostic')).not.toBeInTheDocument();
    expect(h.router.state.location.search).toBe('?tipster=7');
    if (status === 404 || status === 405 || status === 422)
      expect(
        screen.queryByRole('button', { name: 'Atualizar comparação' }),
      ).not.toBeInTheDocument();
    else if (status === 429 || status === 503)
      expect(
        screen.getByRole('button', { name: 'Atualizar comparação' }),
      ).toBeDisabled();
    else {
      const data = {
        ...examples.comparado,
        filtros: { ...examples.comparado.filtros, tipster_id: '7' },
      };
      h.respond(data);
      fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
      await screen.findByRole('heading', { name: 'Comparação disponível' });
    }
  });
}
it('mantém embargo entre filtros e não faz novas consultas antes do Retry-After', async () => {
  const h = await open(
    '',
    new Response('{}', {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '120' },
    }),
  );
  await screen.findByRole('alert');
  await act(() => h.router.navigate('/e-se?tipster=7'));
  await screen.findByRole('alert');
  expect(h.calls).toHaveLength(1);
  expect(
    screen.getByRole('button', { name: 'Atualizar comparação' }),
  ).toBeDisabled();
});
it('não lança leitura privada sem sessão; erro de rede tem recuperação própria', async () => {
  identity.authenticated = false;
  const h = await open();
  expect(h.calls).toHaveLength(0);
  identity.authenticated = true;
  await act(() => h.router.navigate('/e-se?origem=casa'));
  h.respond(new ApiError('network'));
  await screen.findByRole('alert');
  expect(
    screen.getByRole('button', { name: 'Tentar novamente' }),
  ).toBeVisible();
});
