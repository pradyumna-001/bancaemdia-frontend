import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { createMemoryRouter } from 'react-router-dom';
import { QueryClient } from '@tanstack/react-query';
import { createSession } from './session';
import { ProvedorAuth } from './ProvedorAuth';
import { RequireSession } from './RequireSession';
import { App } from '../app/App';
import { createAppRoutes } from '../app/routes';
import { sessionContext } from './protocol';
import { ApiError } from '../api/error';

const disposers: Array<() => void> = [];
afterEach(() => {
  disposers.splice(0).forEach((dispose) => dispose());
  vi.restoreAllMocks();
});
function context(id: number) {
  return sessionContext({
    usuario_id: id,
    nome: 'Teste',
    email: 'sandbox@example.org',
    session_version: `${crypto.randomUUID()}:1`,
    csrf_token: crypto.randomUUID(),
    refresh_required: false,
    access_expires_at: '2030-01-01T00:00:00Z',
    session_expires_at: '2030-01-02T00:00:00Z',
  });
}
function open(path = '/painel', denied = false) {
  const queryClient = new QueryClient();
  const current = context(1);
  const transport = {
    read: vi.fn(async () => {
      if (denied) throw new ApiError('http', { status: 401 });
      return current;
    }),
    renew: vi.fn(async () => current),
    logout: vi.fn(async () => {}),
  };
  const navigate = vi.fn();
  let notify: ((event: MessageEvent) => void) | undefined;
  const service = createSession({
    queryClient,
    baseUrl: 'https://site.example.org',
    transport,
    navigate,
    exclusive: async (_signal, work) => work(),
    channel: {
      postMessage: vi.fn(),
      addEventListener: (_type, listener) => {
        notify = listener;
      },
      removeEventListener: vi.fn(),
      close: vi.fn(),
    },
  });
  const routes = createAppRoutes(service.resume);
  routes.unshift({
    path: '/painel',
    hydrateFallbackElement: <p role="status">Conferindo sessão…</p>,
    loader: service.resume,
    element: (
      <RequireSession>
        <label>
          Entrada privada
          <input />
        </label>
      </RequireSession>
    ),
  });
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <ProvedorAuth service={service}>
      <App router={router} queryClient={queryClient} />
    </ProvedorAuth>,
  );
  disposers.push(() => {
    router.dispose();
    service.dispose();
    queryClient.clear();
  });
  return {
    service,
    transport,
    router,
    navigate,
    notify: (data: string) => notify?.(new MessageEvent('message', { data })),
  };
}
it('saída iniciada em outra aba pode ser conferida se a aba fechar sem resposta', async () => {
  const { notify, transport } = open();
  await screen.findByRole('textbox');
  act(() => notify('ending'));
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Encerrando sessão');
  transport.read.mockRejectedValue(new ApiError('http', { status: 401 }));
  await userEvent.click(screen.getByRole('button', { name: 'Conferir saída' }));
  expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeVisible();
  expect(transport.logout).not.toHaveBeenCalled();
});
it('boot real não libera sessão por URL/storage; entrada inicia fluxo hospedado com destino seguro', async () => {
  const { navigate, router } = open(
    '/painel?session=true&apagadas=1#serie',
    true,
  );
  expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeVisible();
  expect(router.state.location.pathname).toBe('/login');
  await userEvent.click(
    screen.getByRole('button', { name: 'Entrar com minha conta' }),
  );
  const url = new URL(navigate.mock.calls[0]![0]);
  expect(url.searchParams.get('return_to')).toBe(
    '/painel?session=true&apagadas=1',
  );
  expect(url.hash).toBe('');
});
it('troca de usuário desmonta formulário privado; verificação do mesmo contexto preserva entrada', async () => {
  const { service, transport } = open();
  const input = await screen.findByRole('textbox', { name: 'Entrada privada' });
  await userEvent.type(input, 'entrada de A');
  await act(async () => {
    await service.resume();
  });
  expect(screen.getByRole('textbox')).toHaveValue('entrada de A');
  transport.read.mockResolvedValue(context(2));
  await act(async () => {
    await service.resume();
  });
  expect(screen.getByRole('textbox')).toHaveValue('');
  expect(input).not.toBeInTheDocument();
});
it('expiração durante a navegação retira dados privados e volta a entrar', async () => {
  const { service, transport, router } = open();
  await screen.findByRole('textbox');
  transport.read.mockRejectedValue(
    new ApiError('http', { status: 401, code: 'session_expired' }),
  );
  await act(async () => {
    await service.resume();
  });
  expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeVisible();
  expect(screen.queryByRole('textbox')).toBeNull();
  expect(router.state.location.pathname).toBe('/login');
});
it('saída é uma confirmação explícita e somente resposta válida permite retornar ao login', async () => {
  const { transport } = open('/sair');
  await userEvent.click(
    await screen.findByRole('button', { name: 'Confirmar saída' }),
  );
  expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeVisible();
  expect(transport.logout).toHaveBeenCalledOnce();
});
it('503 tem saída acessível e foco/visibilidade não disparam laço de renovação', async () => {
  const { service, transport } = open();
  await screen.findByRole('textbox');
  transport.read.mockRejectedValue(new ApiError('http', { status: 503 }));
  await act(async () => {
    await service.resume();
  });
  expect(
    screen.getByRole('heading', {
      name: 'Não foi possível conferir sua sessão',
    }),
  ).toBeVisible();
  expect(
    screen.getByRole('link', { name: 'Entrar novamente (em outra aba)' }),
  ).toHaveAttribute('target', '_blank');
  transport.read.mockResolvedValue(context(1));
  await userEvent.click(
    screen.getByRole('button', { name: 'Conferir sessão' }),
  );
  await screen.findByRole('textbox');
  await act(async () => {
    window.dispatchEvent(new Event('focus'));
  });
  await waitFor(() => expect(screen.getByRole('textbox')).toBeVisible());
  expect(transport.renew).not.toHaveBeenCalled();
});
it('falha de logout nunca apresenta saída confirmada; reconciliar 401 não repete o POST', async () => {
  const { transport } = open('/sair');
  transport.logout.mockRejectedValue(
    new ApiError('network', { mutation: true }),
  );
  await userEvent.click(
    await screen.findByRole('button', { name: 'Confirmar saída' }),
  );
  expect(
    await screen.findByRole('heading', {
      name: 'A saída ainda não foi confirmada',
    }),
  ).toBeVisible();
  transport.read.mockRejectedValue(new ApiError('http', { status: 401 }));
  await userEvent.click(screen.getByRole('button', { name: 'Conferir saída' }));
  expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeVisible();
  expect(transport.logout).toHaveBeenCalledOnce();
});
it('consulta indisponível no login tem tentativa explícita sem fabricar identidade', async () => {
  const { service, transport } = open('/login', true);
  await screen.findByRole('button', { name: 'Entrar com minha conta' });
  transport.read.mockRejectedValue(new ApiError('http', { status: 503 }));
  await act(async () => {
    await service.resume();
  });
  expect(
    await screen.findByRole('heading', {
      name: 'O serviço está temporariamente indisponível',
    }),
  ).toBeVisible();
  transport.read.mockRejectedValue(new ApiError('http', { status: 401 }));
  await userEvent.click(
    screen.getByRole('button', { name: 'Tentar novamente' }),
  );
  await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  expect(service.getSnapshot().phase).toBe('anonymous');
});
