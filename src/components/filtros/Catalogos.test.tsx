import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createApiClient } from '../../api/client';
import { parseConfig } from '../../lib/config';
import { createSession } from '../../auth/session';
import { sessionContext } from '../../auth/protocol';
import { ProvedorAuth } from '../../auth/ProvedorAuth';
import { FiltrosDaApi } from './FiltrosDaApi';

const currentClient = vi.hoisted(() => ({ value: undefined as unknown }));
vi.mock('../../api/client', async (original) => ({
  ...(await original<typeof import('../../api/client')>()),
  getApiClient: () => currentClient.value,
}));
const disposers: (() => void)[] = [];
const dialogMethods = Object.fromEntries(
  ['showModal', 'close'].map((name) => [
    name,
    Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, name),
  ]),
);
beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    },
  });
});
afterEach(() => {
  disposers.splice(0).forEach((dispose) => dispose());
  for (const name of ['showModal', 'close']) {
    const descriptor = dialogMethods[name];
    if (descriptor)
      Object.defineProperty(HTMLDialogElement.prototype, name, descriptor);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, name);
  }
  vi.restoreAllMocks();
  vi.useRealTimers();
});
function identity(id = 1) {
  return sessionContext({
    usuario_id: id,
    nome: 'Teste',
    email: 'test@example.org',
    csrf_token: crypto.randomUUID(),
    session_version: crypto.randomUUID() + ':1',
    refresh_required: false,
    access_expires_at: '2030-01-01T00:00:00Z',
    session_expires_at: '2030-01-02T00:00:00Z',
  });
}
async function open(
  query = '',
  respond: (url: URL, signal: AbortSignal) => Promise<Response> = async (url) =>
    Response.json({
      dimensao: url.pathname.split('/').at(-1),
      data: [],
      pagination: { page: 1, page_size: 50, total: 0 },
    }),
) {
  let person = identity();
  const cache = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const service = createSession({
    baseUrl: 'https://site.example.org',
    queryClient: cache,
    exclusive: async (_signal, work) => work(),
    transport: {
      read: async () => person,
      renew: async () => person,
      logout: async () => {},
    },
  });
  const requests: URL[] = [];
  currentClient.value = createApiClient(
    parseConfig({ VITE_API_URL: 'https://site.example.org' }),
    {
      captureSession: service.capture,
      onUnauthorized: service.unauthorized,
      fetcher: async (request) => {
        const url = new URL(request.url);
        requests.push(url);
        expect(request.credentials).toBe('include');
        expect(request.headers.has('Authorization')).toBe(false);
        return respond(url, request.signal);
      },
    },
  );
  await service.resume();
  render(
    <QueryClientProvider client={cache}>
      <ProvedorAuth service={service}>
        <MemoryRouter initialEntries={['/?' + query]}>
          <FiltrosDaApi recurso="apostas" />
        </MemoryRouter>
      </ProvedorAuth>
    </QueryClientProvider>,
  );
  disposers.push(() => {
    service.dispose();
    cache.clear();
  });
  return {
    requests,
    service,
    cache,
    change: async () => {
      person = identity(2);
      await act(() => service.resume());
    },
  };
}
it('resolve BIGINT e opção histórica fora da página sem substituir filtro salvo, pagina e busca literal', async () => {
  const { requests } = await open('casa=9007199254740993', async (url) => {
    const dimension = url.pathname.split('/').at(-1)!;
    const id = url.searchParams.get('id');
    const page = Number(url.searchParams.get('page') ?? 1);
    return Response.json({
      dimensao: dimension,
      data:
        dimension === 'casas'
          ? [
              {
                id: id ?? String(page),
                nome: id ? 'Casa histórica' : 'Casa página ' + page,
                ativa: !id,
              },
            ]
          : [],
      pagination: {
        page,
        page_size: 50,
        total: dimension === 'casas' ? 101 : 0,
      },
    });
  });
  await screen.findByRole('button', { name: 'Casa Casa histórica (inativa)' });
  expect(
    screen.getByRole('button', { name: 'Remover filtro Casa' }),
  ).toHaveTextContent('Casa histórica (inativa)');
  expect(
    requests.find((url) => url.searchParams.has('id'))?.searchParams.get('id'),
  ).toBe('9007199254740993');
  expect(new Set(requests.map((url) => url.pathname)).size).toBe(9);
  fireEvent.click(
    screen.getByRole('button', { name: 'Casa Casa histórica (inativa)' }),
  );
  const dialog = screen.getByRole('dialog', { name: 'Casa' });
  fireEvent.click(
    within(dialog).getByRole('button', { name: 'Próximas opções' }),
  );
  await within(dialog).findByRole('button', { name: 'Casa página 2' });
  fireEvent.click(
    within(dialog).getByRole('button', { name: 'Opções anteriores' }),
  );
  await within(dialog).findByRole('button', { name: 'Casa página 1' });
  fireEvent.change(
    within(dialog).getByRole('textbox', { name: 'Buscar casa' }),
    { target: { value: '%_São' } },
  );
  fireEvent.click(within(dialog).getByRole('button', { name: 'Buscar' }));
  await waitFor(() =>
    expect(
      requests.some(
        (url) =>
          url.searchParams.get('q') === '%_São' &&
          url.searchParams.get('page') === '1',
      ),
    ).toBe(true),
  );
});
it('503 e falha do nome não viram catálogo vazio nem removem seleção; repetição é leitura', async () => {
  let available = false;
  const { requests } = await open('grupo=77', async (url) =>
    available
      ? Response.json({
          dimensao: url.pathname.split('/').at(-1),
          data: [],
          pagination: { page: 1, page_size: 50, total: 0 },
        })
      : Response.json({ erro: 'PRIVATE INTERNAL' }, { status: 503 }),
  );
  await screen.findByRole('button', { name: 'Consultar nome de grupo' });
  expect(
    screen.getByRole('button', { name: 'Remover filtro Grupo' }),
  ).toHaveTextContent('77');
  expect(document.body).not.toHaveTextContent('PRIVATE INTERNAL');
  expect(
    screen.queryByText('Nenhuma opção disponível para sua conta.'),
  ).toBeNull();
  available = true;
  fireEvent.click(
    screen.getByRole('button', { name: 'Tentar carregar grupo' }),
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Consultar nome de grupo' }),
  );
  await waitFor(() =>
    expect(
      screen.queryByRole('button', { name: 'Tentar carregar grupo' }),
    ).toBeNull(),
  );
  expect(
    requests.filter((url) => url.pathname.endsWith('/grupos')).length,
  ).toBe(4);
});
it('logout descarta resposta tardia e troca não mantém nomes/cache/busca de outro usuário', async () => {
  let release: ((response: Response) => void) | undefined;
  const { service, cache, change } = await open('', async (url) =>
    url.pathname.endsWith('/casas')
      ? new Promise((resolve) => {
          release = resolve;
        })
      : Response.json({
          dimensao: url.pathname.split('/').at(-1),
          data: [],
          pagination: { page: 1, page_size: 50, total: 0 },
        }),
  );
  await waitFor(() => expect(release).toBeDefined());
  await act(async () => {
    await service.logout();
    release!(
      Response.json({
        dimensao: 'casas',
        data: [{ id: '8', nome: 'Nome antigo privado', ativa: true }],
        pagination: { page: 1, page_size: 50, total: 1 },
      }),
    );
  });
  expect(screen.queryByRole('heading', { name: 'Filtros' })).toBeNull();
  expect(cache.getQueryCache().findAll().length).toBe(0);
  await change();
  expect(document.body).not.toHaveTextContent('Nome antigo privado');
});
it('Retry-After maior que 60s só libera repetição manual depois do prazo, sem reiniciar GET automaticamente', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  let available = false;
  const { requests, service } = await open('', async (url) =>
    available
      ? Response.json({
          dimensao: url.pathname.split('/').at(-1),
          data: [],
          pagination: { page: 1, page_size: 50, total: 0 },
        })
      : Response.json({}, { status: 429, headers: { 'Retry-After': '61' } }),
  );
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Casa Sem filtro' }),
    ).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Casa Sem filtro' }));
  const dialog = screen.getByRole('dialog', { name: 'Casa' });
  await waitFor(() =>
    expect(
      within(dialog).getByRole('button', { name: 'Buscar' }),
    ).toBeDisabled(),
  );
  expect(
    within(dialog).queryByRole('button', { name: 'Tentar carregar casa' }),
  ).toBeNull();
  const count = requests.length;
  available = true;
  vi.setSystemTime(Date.now() + 62000);
  const retry = await within(dialog).findByRole(
    'button',
    { name: 'Tentar carregar casa' },
    { timeout: 2500 },
  );
  expect(requests).toHaveLength(count);
  await act(() => service.resume());
  expect(requests).toHaveLength(count);
  fireEvent.click(retry);
  await waitFor(() => expect(requests).toHaveLength(count + 1));
});
