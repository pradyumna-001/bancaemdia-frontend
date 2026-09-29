import { useQueryClient } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, type RouteObject } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { App } from './App';
import { RouteError } from './RouteError';
import { createAppQueryClient } from './queryClient';
import { createAppRoutes } from './routes';

const disposers: Array<() => void> = [];
afterEach(() => {
  disposers.splice(0).forEach((dispose) => dispose());
  vi.restoreAllMocks();
});

function open(
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
  disposers.push(() => {
    router.dispose();
    queryClient.clear();
  });
  render(<App router={router} queryClient={queryClient} />);
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
  ['/configuracoes/conexoes', 'Conexões'],
  ['/configuracoes/privacidade', 'Privacidade'],
  ['/contas', 'Contas e titulares'],
  ['/contas/42', 'Contas do titular'],
  ['/assinatura', 'Assinatura'],
  ['/calculadoras', 'Calculadoras'],
  ['/painel/analises', 'Análises'],
  ['/painel/metas', 'Metas'],
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
  open(path);
  expect(await screen.findByRole('heading', { name: title })).toBeVisible();
});

it('protege o destino inteiro sem permitir sessão via URL ou storage', async () => {
  localStorage.setItem('session', 'true');
  const original = '/aposta/abc?apagadas=1&casa=teste&session=true#foto';
  const { router } = open(original, false);
  expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeVisible();
  expect(router.state.location.pathname).toBe('/login');
  expect(new URLSearchParams(router.state.location.search).get('destino')).toBe(
    original,
  );
  expect(router.state.historyAction).toBe('REPLACE');
  localStorage.clear();
});

it('mantém query e fragmento ao abrir uma rota protegida com sessão', async () => {
  const { router } = open('/?apagadas=1&estado=GREEN#lista');
  await screen.findByRole('heading', { name: 'Apostas' });
  expect(router.state.location.search).toBe('?apagadas=1&estado=GREEN');
  expect(router.state.location.hash).toBe('#lista');
});

it.each([
  '/login?destino=https://fora.example',
  '/login?destino=%2F%2Ffora.example',
  '/login?destino=%2Flogin',
])('sanitiza o destino recebido no login: %s', async (path) => {
  const { router } = open(path, false);
  await screen.findByRole('heading', { name: 'Entrar' });
  expect(Object.values(router.state.loaderData)).toContainEqual({
    destino: '/',
  });
});

it('mostra 404 sem sessão e permite sair da página por navegação interna', async () => {
  const user = userEvent.setup();
  open('/nao-existe?apagadas=1', false);
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
    open('/falha?apagadas=1', true, [route]);
    expect(
      await screen.findByRole('heading', { name: 'Deu errado' }),
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
    open('/falha', true, [
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
        name: status === 404 ? 'Não achei esta página' : 'Deu errado',
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
  const { router, queryClient } = open('/a', true, [
    { path: '/a', element: <Probe /> },
    { path: '/b', element: <Probe /> },
  ]);
  await screen.findByRole('heading', { name: 'Pronto' });
  await act(() => router.navigate('/b'));
  await waitFor(() => expect(clients.length).toBeGreaterThan(1));
  expect(clients.every((client) => client === queryClient)).toBe(true);
});
