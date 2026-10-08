import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, matchPath } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { App } from './App';
import { createAppRoutes } from './routes';
import { createAppQueryClient } from './queryClient';
import { ApiError } from '../api/error';
import { RouteError } from './RouteError';

const dispose: Array<() => void> = [];
afterEach(() => {
  dispose.splice(0).forEach((fn) => fn());
  vi.restoreAllMocks();
  vi.useRealTimers();
});
function open(path: string, error: unknown, session = true) {
  let failing = true;
  const routes = createAppRoutes(() => session);
  const route = routes.find(
    (route) => route.path && matchPath({ path: route.path, end: true }, path),
  )!;
  route.children![0]!.loader = () => {
    if (failing) throw error;
    return null;
  };
  const router = createMemoryRouter(routes, {
    initialEntries: [`${path}?apagadas=1&estado=GREEN#serie`],
  });
  const client = createAppQueryClient();
  dispose.push(() => {
    router.dispose();
    client.clear();
  });
  render(<App router={router} queryClient={client} />);
  return {
    router,
    recover: () => {
      failing = false;
    },
  };
}
const titles = {
  404: 'Este recurso não está disponível',
  405: 'Esta ação não está disponível',
  500: 'Não foi possível abrir esta página',
} as const;

it.each([
  '/painel/analises',
  '/contas/42',
  '/coleta',
  '/configuracoes/privacidade',
  '/calculadoras',
  '/senha',
])(
  '404/405/500 em %s mantêm navegação guardada e ocultam dados internos',
  async (path) => {
    for (const status of [404, 405, 500] as const) {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      open(path, new Response('TRACE_PRIVADA {"email":"privado"}', { status }));
      const heading = await screen.findByRole('heading', {
        name: titles[status],
      });
      await waitFor(() => expect(heading).toHaveFocus());
      expect(
        screen.getAllByRole('navigation', { name: 'Navegação principal' })
          .length,
      ).toBeGreaterThan(0);
      expect(
        screen.queryByText(/TRACE_PRIVADA|privado|stack/),
      ).not.toBeInTheDocument();
      const main = heading.closest('main')!;
      expect(
        within(main).getByRole('link', { name: 'Abrir tutorial' }),
      ).toHaveAttribute('href', '/tutorial?apagadas=1&estado=GREEN#serie');
      expect(
        within(main).queryByRole('button', { name: 'Tentar novamente' }) !==
          null,
      ).toBe(status === 500);
      // Each render belongs to a separate router, as in an independent document.
      dispose.splice(0).forEach((fn) => fn());
      cleanup();
    }
  },
);

it('erro de recurso sem sessão não mostra shell privado nem dados', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  open('/painel', new Response('PRIVATE', { status: 404 }), false);
  expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeVisible();
  expect(
    screen.queryByRole('navigation', { name: 'Navegação principal' }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole('heading', { name: titles[404] }),
  ).not.toBeInTheDocument();
});

it('tentativa é explícita, abre via GET uma vez e preserva URL/cache', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const { router, recover } = open(
    '/painel/analises',
    new Error('PRIVATE_STACK'),
  );
  await screen.findByRole('heading', { name: titles[500] });
  expect(router.state.location.search).toBe('?apagadas=1&estado=GREEN');
  recover();
  await userEvent.click(
    screen.getByRole('button', { name: 'Tentar novamente' }),
  );
  expect(
    await screen.findByRole('heading', { name: 'Análises' }),
  ).toBeVisible();
  expect(router.state.location.search).toBe('?apagadas=1&estado=GREEN');
  expect(router.state.location.hash).toBe('#serie');
  await waitFor(() =>
    expect(document.getElementById('conteudo')).toHaveFocus(),
  );
});

it('Retry-After não dispara navegação automática e foco não muda quando o prazo termina', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const { router } = open(
    '/coleta',
    new ApiError('http', {
      status: 429,
      headers: new Headers({ 'Retry-After': '1' }),
    }),
  );
  await screen.findByRole('heading', { name: 'Aguarde para tentar novamente' });
  await waitFor(() =>
    expect(
      screen.getByRole('heading', { name: 'Aguarde para tentar novamente' }),
    ).toHaveFocus(),
  );
  const key = router.state.location.key;
  const retry = screen.getByRole('button', { name: 'Tentar novamente' });
  expect(retry).toBeDisabled();
  screen.getByRole('link', { name: 'Abrir tutorial' }).focus();
  await waitFor(() => expect(retry).toBeEnabled(), { timeout: 2000 });
  expect(screen.getByRole('link', { name: 'Abrir tutorial' })).toHaveFocus();
  expect(router.state.location.key).toBe(key);
});

it('escrita incerta não oferece repetir nem muda o pedido', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  open('/enviar', new ApiError('http', { status: 500, mutation: true }));
  await screen.findByRole('heading', {
    name: 'Confira se o pedido foi concluído',
  });
  expect(
    screen.queryByRole('button', { name: 'Tentar novamente' }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: 'Voltar para Enviar' }),
  ).toHaveAttribute('href', '/enviar?apagadas=1&estado=GREEN#serie');
});

it('falha do próprio guard fica fora do shell e não consulta a fila', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const review = vi.fn();
  const client = createAppQueryClient();
  const router = createMemoryRouter(
    createAppRoutes(() => {
      throw new Error('PRIVATE');
    }, review),
    { initialEntries: ['/painel'] },
  );
  dispose.push(() => {
    router.dispose();
    client.clear();
  });
  render(<App router={router} queryClient={client} />);
  await screen.findByRole('heading', { name: titles[500] });
  expect(
    screen.queryByRole('navigation', { name: 'Navegação principal' }),
  ).not.toBeInTheDocument();
  expect(review).not.toHaveBeenCalled();
});

it('recuperação depois de action falha executa loaders GET sem replay do POST', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  let writes = 0;
  const methods: string[] = [];
  const client = createAppQueryClient();
  const router = createMemoryRouter(
    [
      {
        path: '/enviar',
        loader: ({ request }) => {
          methods.push(request.method);
          return null;
        },
        action: () => {
          writes++;
          throw new Response('PRIVATE_WRITE', { status: 500 });
        },
        element: <h1>Página recuperada</h1>,
        errorElement: <RouteError />,
        hydrateFallbackElement: <p role="status">Abrindo página…</p>,
      },
    ],
    { initialEntries: ['/enviar?apagadas=1#secao'] },
  );
  dispose.push(() => {
    router.dispose();
    client.clear();
  });
  render(<App router={router} queryClient={client} />);
  await screen.findByRole('heading', { name: 'Página recuperada' });
  await act(async () => {
    await router.navigate('/enviar?apagadas=1#secao', {
      formMethod: 'post',
      formEncType: 'application/json',
      body: { intencao: 'teste' },
    });
  });
  await screen.findByRole('heading', { name: titles[500] });
  expect(writes).toBe(1);
  const before = methods.length;
  await userEvent.click(
    screen.getByRole('button', { name: 'Tentar novamente' }),
  );
  await screen.findByRole('heading', { name: 'Página recuperada' });
  expect(writes).toBe(1);
  expect(methods.length).toBe(before + 1);
  expect(methods.every((method) => method === 'GET')).toBe(true);
  expect(router.state.location.hash).toBe('#secao');
  expect(router.state.location.search).toBe('?apagadas=1');
});
