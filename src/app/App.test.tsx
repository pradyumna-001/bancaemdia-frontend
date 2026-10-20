import { useQueryClient } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, type RouteObject } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import * as api from '../api/client';
import { parseConfig } from '../lib/config';
import { unlinkedTelegram } from '../../tests/fixtures/telegram';
import { billingStatus } from '../../tests/fixtures/acesso';
import { routeSession } from '../../tests/fixtures/route-session';
import { ProvedorAuth } from '../auth/ProvedorAuth';
import { App } from './App';
import { RouteError } from './RouteError';
import { createAppQueryClient } from './queryClient';
import { createAppRoutes } from './routes';

// Compile actual page modules before the unit cases, as eager routes previously
// did. Guards/rendering keep their original assertion deadlines. Cold downloads
// and parsing are measured against the public build by the performance proof.
await Promise.all(
  Object.values(import.meta.glob('../features/**/*Page.tsx')).map((load) =>
    load(),
  ),
);

const disposers: Array<() => void> = [];
beforeEach(() => {
  // jsdom does not implement native dialog methods. Real-browser coverage keeps
  // exercising their focus, Escape and modal behavior independently.
  HTMLDialogElement.prototype.showModal ??= function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close ??= function () {
    if (!this.hasAttribute('open')) return;
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
  vi.spyOn(api, 'getApiClient').mockReturnValue(
    api.createApiClient(
      parseConfig({ VITE_API_URL: 'http://127.0.0.1:8000' }),
      {
        fetcher: async (request) =>
          new Response(
            JSON.stringify(
              new URL(request.url).pathname === '/api/v1/billing/status'
                ? billingStatus
                : unlinkedTelegram,
            ),
            {
              headers: { 'Content-Type': 'application/json' },
            },
          ),
      },
    ),
  );
});
afterEach(() => {
  disposers.splice(0).forEach((dispose) => dispose());
  vi.restoreAllMocks();
});

async function open(
  path: string,
  session = true,
  routes = createAppRoutes(() => session),
) {
  const router = createMemoryRouter(
    routes.map((route) => ({
      hydrateFallbackElement: <p role="status">Abrindo página…</p>,
      element: <p>Página de teste</p>,
      ...route,
    })),
    { initialEntries: [path] },
  );
  const queryClient = createAppQueryClient();
  const identity = session ? await routeSession(queryClient) : undefined;
  let unmount = () => {};
  disposers.push(() => {
    unmount();
    router.dispose();
    identity?.dispose();
    queryClient.clear();
  });
  // Flush the real asynchronous router/lazy mount before page assertions.
  // The case and assertion deadlines stay unchanged.
  await act(async () => {
    const app = (
      <App
        router={router}
        queryClient={queryClient}
        access={identity?.access}
      />
    );
    unmount = render(
      identity ? (
        <ProvedorAuth service={identity.service}>{app}</ProvedorAuth>
      ) : (
        app
      ),
    ).unmount;
  });
  return { router, queryClient };
}

it.each([
  ['/', 'Apostas'],
  ['/painel', 'Painel'],
  ['/enviar', 'Enviar'],
  ['/coleta', 'Coleta'],
  ['/banca', 'Caixa'],
  ['/resultados', 'Resultados'],
  ['/revisao', 'Revisão'],
  ['/aposta/abc-123', 'Aposta'],
  ['/configuracoes', 'Configurações'],
  ['/configuracoes/conexoes', 'Telegram'],
  ['/configuracoes/privacidade', 'Privacidade'],
  ['/contas', 'Contas e titulares'],
  ['/contas/42', 'Contas do titular'],
  ['/assinatura', 'Assinatura'],
  ['/calculadoras', 'Calculadoras'],
  ['/e-se', 'E se eu seguisse a stake do tipster?'],
  ['/painel/analises', 'Análises'],
  ['/painel/metas', 'Metas'],
  ['/inicio', 'Primeiro uso'],
  ['/sistema', 'Sistema'],
  ['/tutorial', 'Tutorial'],
  ['/extensao', 'Extensão'],
  ['/login', 'Entrar'],
  ['/criar-conta', 'Criar conta'],
  ['/esqueci-senha', 'Esqueci minha senha'],
  ['/redefinir-senha', 'Redefinir senha'],
  ['/confirmar-email', 'Confirmar e-mail'],
  ['/senha', 'Alterar senha'],
  ['/sair', 'Sair'],
])('renderiza %s com sessão disponível', async (path, title) => {
  await open(path);
  await waitFor(() => {
    expect(screen.getByRole('heading', { name: title })).toBeVisible();
    expect(document.querySelector('.rota-carregando')).not.toBeInTheDocument();
    expect(
      screen.queryByText(/^Abrindo (privacidade|revisão|formulário)…$/),
    ).not.toBeInTheDocument();
  });
});

it('protege o destino inteiro sem permitir sessão via URL ou storage', async () => {
  localStorage.setItem('session', 'true');
  const original = '/aposta/abc?apagadas=1&casa=teste&session=true#foto';
  const { router } = await open(original, false);
  expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeVisible();
  expect(router.state.location.pathname).toBe('/login');
  expect(new URLSearchParams(router.state.location.search).get('destino')).toBe(
    original,
  );
  expect(router.state.historyAction).toBe('REPLACE');
  localStorage.clear();
});

it('mantém query e fragmento ao abrir uma rota protegida com sessão', async () => {
  const { router } = await open('/?apagadas=1&estado=GREEN#lista');
  await screen.findByRole('heading', { name: 'Apostas' });
  expect(router.state.location.search).toBe('?apagadas=1&estado=GREEN');
  expect(router.state.location.hash).toBe('#lista');
});

it('seletores da lista mantêm o guard atual; abrir outra área revalida a sessão', async () => {
  const consult = vi.fn(async () => true);
  const { router } = await open(
    '/?page_size=2',
    true,
    createAppRoutes(consult),
  );
  await screen.findByRole('heading', { name: 'Apostas' });
  expect(consult).toHaveBeenCalledTimes(1);
  await act(() => router.navigate('/?page_size=2&estado=PENDENTE'));
  expect(consult).toHaveBeenCalledTimes(1);
  await act(() => router.revalidate());
  await waitFor(() => expect(consult).toHaveBeenCalledTimes(2));
  await act(() => router.navigate('/painel?estado=PENDENTE'));
  await screen.findByRole('heading', { name: 'Painel' });
  expect(consult).toHaveBeenCalledTimes(3);
});

it.each([
  '/login?destino=https://fora.example',
  '/login?destino=%2F%2Ffora.example',
  '/login?destino=%2Flogin',
])('sanitiza o destino recebido no login: %s', async (path) => {
  const { router } = await open(path, false);
  await screen.findByRole('heading', { name: 'Entrar' });
  expect(Object.values(router.state.loaderData)).toContainEqual({
    destino: '/',
  });
});

it('mostra 404 sem sessão e permite sair da página por navegação interna', async () => {
  const user = userEvent.setup();
  await open('/nao-existe?apagadas=1', false);
  expect(
    await screen.findByRole('heading', { name: 'Não achei esta página' }),
  ).toBeVisible();
  await user.click(screen.getByRole('link', { name: 'Abrir tutorial' }));
  expect(
    await screen.findByRole('heading', { name: 'Tutorial' }),
  ).toBeVisible();
});

it.each(['loader', 'componente'])(
  'contém falha de %s e recupera por tentativa explícita',
  async (source) => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    let failing = true;
    function Broken() {
      if (source === 'componente' && failing)
        throw new Error('segredo interno e stack');
      return <h1>Recuperado</h1>;
    }
    const route: RouteObject = {
      path: '/falha',
      element: <Broken />,
      errorElement: <RouteError />,
      loader: () => {
        if (source === 'loader' && failing)
          throw new Error('segredo interno e stack');
        return null;
      },
    };
    await open('/falha?apagadas=1', true, [route]);
    expect(
      await screen.findByRole('heading', {
        name: 'Não foi possível abrir esta página',
      }),
    ).toBeVisible();
    expect(screen.queryByText(/segredo interno/)).not.toBeInTheDocument();
    failing = false;
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(
      await screen.findByRole('heading', { name: 'Recuperado' }),
    ).toBeVisible();
  },
);

it.each([404, 405, 500])(
  'sanitiza corpo cru de erro de rota HTTP %s',
  async (status) => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await open('/falha', true, [
      {
        path: '/falha',
        loader: () => {
          throw new Response('{"secret":"raw"}', { status });
        },
        errorElement: <RouteError />,
      },
    ]);
    expect(
      await screen.findByRole('heading', {
        name:
          status === 404
            ? 'Este recurso não está disponível'
            : status === 405
              ? 'Esta ação não está disponível'
              : 'Não foi possível abrir esta página',
      }),
    ).toBeVisible();
    expect(screen.queryByText(/secret|raw/)).not.toBeInTheDocument();
  },
);

it('mantém o mesmo QueryClient ao trocar de rota', async () => {
  const clients: unknown[] = [];
  function Probe() {
    clients.push(useQueryClient());
    return <h1>Pronto</h1>;
  }
  const { router, queryClient } = await open('/a', true, [
    { path: '/a', element: <Probe /> },
    { path: '/b', element: <Probe /> },
  ]);
  await screen.findByRole('heading', { name: 'Pronto' });
  await act(() => router.navigate('/b'));
  await waitFor(() => expect(clients.length).toBeGreaterThan(1));
  expect(clients.every((client) => client === queryClient)).toBe(true);
});
