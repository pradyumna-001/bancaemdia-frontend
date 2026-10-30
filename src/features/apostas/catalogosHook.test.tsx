import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { createApiClient } from '../../api/client';
import { ApiError } from '../../api/error';
import { SITE_READ_CONTRACT } from '../../api/site-read.generated';
import { lerFiltros } from '../../lib/params';
import { useCatalogos } from './catalogos';
const state = vi.hoisted(() => ({
  authenticated: true,
  read: async <T,>(work: () => Promise<T>) => work(),
}));
vi.mock('../../auth/ProvedorAuth', () => ({
  useAuth: () =>
    state.authenticated
      ? {
          state: { phase: 'authenticated', privateEpoch: 1, person: { id: 1 } },
          service: { read: state.read },
        }
      : null,
}));
afterEach(() => {
  state.authenticated = true;
  vi.useRealTimers();
});
function setup(
  search = '',
  failure?: () => unknown,
  contract = SITE_READ_CONTRACT,
) {
  const requests: URL[] = [];
  const GET = vi.fn(
    async (path: string, options: { querySerializer: () => string }) => {
      const url = new URL(
        path + '?' + options.querySerializer(),
        'http://example.test',
      );
      requests.push(url);
      const error = failure?.();
      if (error) throw error;
      const selected = url.searchParams.get('id');
      return {
        data: {
          dimensao: path.split('/').at(-1),
          data: [{ id: selected ?? '7', nome: 'Histórico', ativa: !selected }],
          pagination: {
            page: Number(url.searchParams.get('page') ?? 1),
            page_size: 20,
            total: selected ? 1 : 41,
          },
        },
      };
    },
  );
  const client = { GET } as unknown as ReturnType<typeof createApiClient>;
  const queries = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queries}>{children}</QueryClientProvider>
  );
  const result = renderHook(
    () =>
      useCatalogos(contract, client, lerFiltros(new URLSearchParams(search))),
    { wrapper },
  );
  return { ...result, requests, queries };
}
it('supports authenticated searches, both page directions and exact inactive selected identities', async () => {
  const h = setup('casa=9007199254740993');
  await waitFor(() => expect(h.result.current.casa?.fase).toBe('pronto'));
  await waitFor(() =>
    expect(h.result.current.casa?.selecionada?.label).toBe(
      'Histórico (inativa)',
    ),
  );
  await act(() => h.result.current.casa!.proxima!());
  await waitFor(() => expect(h.result.current.casa?.pagina).toBe(2));
  await act(() => h.result.current.casa!.anterior!());
  await waitFor(() => expect(h.result.current.casa?.pagina).toBe(1));
  await act(() => h.result.current.casa!.buscar!('futebol'));
  await waitFor(() =>
    expect(h.requests.some((u) => u.searchParams.get('q') === 'futebol')).toBe(
      true,
    ),
  );
  await act(() => h.result.current.casa!.tentar!());
  expect(
    h.requests.some((u) => u.searchParams.get('id') === '9007199254740993'),
  ).toBe(true);
  h.unmount();
  h.queries.clear();
});
it('reports and retries safe catalog/selected-name failures without dropping a valid filter', async () => {
  let error: unknown = new ApiError('http', { status: 500 });
  const h = setup('casa=7', () => error);
  await waitFor(() => expect(h.result.current.casa?.fase).toBe('erro'));
  await waitFor(() =>
    expect(h.result.current.casa?.selecionadaErro).toContain(
      'identificador foi preservado',
    ),
  );
  error = undefined;
  await act(() => h.result.current.casa!.tentarSelecionada!());
  await act(() => h.result.current.casa!.tentar!());
  await waitFor(() => expect(h.result.current.casa?.fase).toBe('pronto'));
  h.unmount();
  h.queries.clear();
});
it('keeps Retry-After through shared catalogs, refuses unsafe retries and handles unknown failures', async () => {
  const error = new ApiError('http', {
    status: 429,
    headers: new Headers({ 'Retry-After': '120' }),
  });
  const h = setup('casa=7', () => error);
  await waitFor(() => expect(h.result.current.casa?.fase).toBe('erro'));
  expect(h.result.current.casa?.buscar).toBeUndefined();
  expect(h.result.current.casa?.tentar).toBeUndefined();
  expect(h.result.current.casa?.tentarSelecionada).toBeUndefined();
  h.unmount();
  h.queries.clear();
  const unavailable = setup(
    'casa=7',
    () => new ApiError('http', { status: 404 }),
  );
  await waitFor(() =>
    expect(unavailable.result.current.casa?.fase).toBe('erro'),
  );
  expect(unavailable.result.current.casa?.tentar).toBeUndefined();
  unavailable.unmount();
  unavailable.queries.clear();
  const unknown = setup('', () => new Error('untrusted diagnostic'));
  await waitFor(() =>
    expect(unknown.result.current.casa?.erro).toContain(
      'Não foi possível carregar as opções',
    ),
  );
  expect(unknown.result.current.casa?.erro).not.toContain('untrusted');
  unknown.unmount();
  unknown.queries.clear();
});
it('does not load unsupported or unauthenticated catalogs', () => {
  state.authenticated = false;
  const h = setup();
  expect(h.result.current).toEqual({});
  expect(h.requests).toEqual([]);
  h.unmount();
  h.queries.clear();
  state.authenticated = true;
  const none = setup('', undefined, {} as typeof SITE_READ_CONTRACT);
  expect(none.result.current).toEqual({});
  none.unmount();
  none.queries.clear();
});
