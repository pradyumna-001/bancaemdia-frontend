import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { createMemoryRouter } from 'react-router-dom';
import { App } from '../../app/App';
import { createAppRoutes } from '../../app/routes';
import { createSession } from '../../auth/session';
import { ProvedorAuth } from '../../auth/ProvedorAuth';
import { sessionContext } from '../../auth/protocol';
import { ApiError } from '../../api/error';
import * as api from '../../api/client';
import { parseConfig } from '../../lib/config';
import { paginaExemplo } from '../../../tests/fixtures/apostas';
import { billingStatus } from '../../../tests/fixtures/acesso';

const disposers: Array<() => void> = [];
beforeEach(() => {
  vi.spyOn(api, 'getApiClient').mockReturnValue(
    api.createApiClient(parseConfig({ VITE_API_URL: 'https://site.example' }), {
      fetcher: async (request) =>
        new Response(
          JSON.stringify(
            new URL(request.url).pathname.endsWith('/billing/status')
              ? billingStatus
              : paginaExemplo(1, 50),
          ),
          { headers: { 'Content-Type': 'application/json' } },
        ),
    }),
  );
});
afterEach(() => {
  disposers.splice(0).forEach((dispose) => dispose());
  vi.restoreAllMocks();
});
function open(path: string, authenticated = false, withoutProvider = false) {
  const queryClient = new QueryClient();
  const context = sessionContext({
    usuario_id: 1,
    nome: 'Sandbox',
    email: 'sandbox@example.org',
    session_version: `${crypto.randomUUID()}:1`,
    csrf_token: crypto.randomUUID(),
    refresh_required: false,
    access_expires_at: '2030-01-01T00:00:00Z',
    session_expires_at: '2030-01-02T00:00:00Z',
  });
  const transport = {
    read: vi.fn(async () => {
      if (!authenticated) throw new ApiError('http', { status: 401 });
      return context;
    }),
    renew: vi.fn(async () => context),
    logout: vi.fn(async () => {}),
  };
  const navigate = vi.fn();
  const service = createSession({
    baseUrl: 'https://site.example',
    queryClient,
    transport,
    navigate,
    exclusive: async (_signal, work) => work(),
  });
  const router = createMemoryRouter(createAppRoutes(service.resume), {
    initialEntries: [path],
  });
  const app = <App router={router} queryClient={queryClient} />;
  render(
    withoutProvider ? (
      app
    ) : (
      <ProvedorAuth service={service}>{app}</ProvedorAuth>
    ),
  );
  disposers.push(() => {
    router.dispose();
    service.dispose();
    queryClient.clear();
  });
  return { service, transport, router, navigate, context };
}

it.each([
  ['/login', 'Entrar com minha conta', 'login'],
  ['/criar-conta', 'Continuar para criar conta', 'signup'],
  ['/esqueci-senha', 'Continuar para recuperar senha', 'recover'],
  ['/redefinir-senha', 'Recomeçar recuperação', 'recover'],
  ['/confirmar-email', 'Continuar confirmação', 'login'],
  ['/senha', 'Continuar para alterar senha', 'recover'],
])(
  'encaminha %s com intent suportado e retorno validado',
  async (path, action, intent) => {
    const { navigate } = open(
      `${path}?destino=%2Fpainel%3Fapagadas%3D1%23serie`,
      path === '/senha',
    );
    const button = await screen.findByRole('button', { name: action });
    await waitFor(() => expect(button).toBeEnabled());
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByText(/trial ativo/i)).toBeNull();
    await userEvent.click(button);
    const url = new URL(navigate.mock.calls[0]![0]);
    expect(url.pathname).toBe('/auth/start');
    expect(url.searchParams.get('intent')).toBe(intent);
    expect(url.searchParams.get('return_to')).toBe('/painel?apagadas=1');
    expect(url.hash).toBe('');
  },
);
it('trocar entre jornadas preserva filtros/fragmento e não expõe destino externo', async () => {
  const { router } = open('/login?destino=%2Fpainel%3Fapagadas%3D1%23serie');
  await userEvent.click(
    await screen.findByRole('link', { name: 'Criar conta' }),
  );
  expect(router.state.location.pathname).toBe('/criar-conta');
  expect(new URLSearchParams(router.state.location.search).get('destino')).toBe(
    '/painel?apagadas=1#serie',
  );
  await userEvent.click(
    screen.getByRole('link', { name: 'Voltar para entrar' }),
  );
  await userEvent.click(
    await screen.findByRole('link', { name: 'Esqueci minha senha' }),
  );
  await screen.findByRole('heading', { name: 'Esqueci minha senha' });
  expect(router.state.location.pathname).toBe('/esqueci-senha');
  await act(() => router.navigate('/login?destino=https://foreign.example'));
  expect(screen.getByRole('link', { name: 'Criar conta' })).toHaveAttribute(
    'href',
    '/criar-conta?destino=%2F',
  );
});
it('conta confirmada permite continuar; sair permanece uma ação explícita cancelável', async () => {
  const { router, transport } = open('/login?destino=%2Fpainel', true);
  await screen.findByRole('link', { name: 'Continuar na conta' });
  await act(() => router.navigate('/sair'));
  expect(await screen.findByRole('heading', { name: 'Sair' })).toBeVisible();
  expect(transport.logout).not.toHaveBeenCalled();
  await userEvent.click(
    screen.getByRole('link', { name: 'Continuar na conta' }),
  );
  expect(await screen.findByRole('heading', { name: 'Apostas' })).toBeVisible();
  expect(transport.logout).not.toHaveBeenCalled();
});
it('sem provedor real não oferece autenticação artificial', async () => {
  open('/login', false, true);
  expect(
    await screen.findByRole('button', { name: 'Entrar com minha conta' }),
  ).toBeDisabled();
});
it('429/503 não iniciam fluxo nem repetem automaticamente; retry é explícito', async () => {
  const { service, transport, navigate } = open('/esqueci-senha');
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Continuar para recuperar senha' }),
    ).toBeEnabled(),
  );
  transport.read.mockRejectedValue(
    new ApiError('http', {
      status: 429,
      headers: new Headers({ 'Retry-After': '1' }),
    }),
  );
  await act(async () => {
    await service.resume();
  });
  expect(screen.getByRole('alert')).toHaveTextContent(/Muitas tentativas/i);
  expect(
    screen.getByRole('button', { name: 'Tentar novamente' }),
  ).toBeDisabled();
  expect(
    screen.getByRole('button', { name: 'Continuar para recuperar senha' }),
  ).toBeDisabled();
  const calls = transport.read.mock.calls.length;
  await waitFor(
    () =>
      expect(
        screen.getByRole('button', { name: 'Tentar novamente' }),
      ).toBeEnabled(),
    { timeout: 2000 },
  );
  expect(transport.read).toHaveBeenCalledTimes(calls);
  transport.read.mockRejectedValue(new ApiError('http', { status: 503 }));
  await userEvent.click(
    screen.getByRole('button', { name: 'Tentar novamente' }),
  );
  expect(screen.getByRole('alert')).toHaveTextContent(/indisponível/i);
  expect(navigate).not.toHaveBeenCalled();
});
it('link expirado/repetido e recuperação interrompida têm orientação e recomeço genéricos', async () => {
  const { router } = open('/redefinir-senha?token=discard');
  await userEvent.click(await screen.findByText('Não conseguiu continuar?'));
  expect(screen.getByText(/link expirou ou já foi utilizado/)).toBeVisible();
  expect(screen.getByText(/interrompeu a recuperação/)).toBeVisible();
  expect(
    screen.getByRole('button', { name: 'Recomeçar recuperação' }),
  ).toBeInTheDocument();
  await act(() => router.navigate('/confirmar-email'));
  expect(
    screen.getByRole('link', { name: 'Recomeçar cadastro' }),
  ).toBeVisible();
  expect(screen.getByText(/opção de reenvio/)).toBeVisible();
});
it('saída não confirmada impede novo fluxo e permite conferir sem identidade fabricada', async () => {
  const { service, transport, router, navigate } = open('/sair', true);
  await screen.findByRole('button', { name: 'Confirmar saída' });
  transport.logout.mockRejectedValue(
    new ApiError('network', { mutation: true }),
  );
  await act(async () => {
    await service.logout();
  });
  await act(() => router.navigate('/login'));
  expect(
    screen.getByRole('button', { name: 'Entrar com minha conta' }),
  ).toBeDisabled();
  expect(
    screen.getByRole('heading', { name: 'A saída ainda não foi confirmada' }),
  ).toBeVisible();
  transport.read.mockRejectedValue(new ApiError('http', { status: 401 }));
  await userEvent.click(screen.getByRole('button', { name: 'Conferir saída' }));
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Entrar com minha conta' }),
    ).toBeEnabled(),
  );
  expect(navigate).not.toHaveBeenCalled();
});
