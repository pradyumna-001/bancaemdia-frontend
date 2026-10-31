import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
} from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { createSession } from '../../auth/session';
import { sessionContext } from '../../auth/protocol';
import { ProvedorAuth } from '../../auth/ProvedorAuth';
import { RequireSession } from '../../auth/RequireSession';
import { createApiClient } from '../../api/client';
import { parseConfig } from '../../lib/config';
import { createAccessController } from '../acesso/controller';
import { ProvedorAcesso } from '../acesso/ProvedorAcesso';
import { billingStatus } from '../../../tests/fixtures/acesso';
import {
  devices,
  temporaryCode,
  temporaryToken,
} from '../../../tests/fixtures/coleta';
import { ColetaPage } from './ColetaPage';
const cleanups: Array<() => void> = [];
afterEach(() => {
  cleanups.splice(0).forEach((fn) => fn());
  vi.restoreAllMocks();
  vi.useRealTimers();
  focusManager.setFocused(undefined);
});
const json = (
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
async function open(empty = false) {
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
  const controller = createAccessController(session, queries);
  let status = empty ? [] : structuredClone(devices);
  let read: () => Promise<Response> = async () => json(status);
  let write: (req: Request) => Promise<Response> = async (req) => {
    if (req.method === 'DELETE') {
      status[0]!.revogado_em = new Date().toISOString();
      return new Response(null, { status: 204 });
    }
    return req.url.endsWith('/rotate')
      ? json({ instalacao_id: 1, token: temporaryToken })
      : json(temporaryCode(), 201);
  };
  const writes: Request[] = [];
  const reads: Request[] = [];
  const client = createApiClient(
    parseConfig({ VITE_API_URL: 'http://127.0.0.1:8000' }),
    {
      captureSession: session.capture,
      fetcher: async (req) => {
        if (new URL(req.url).pathname === '/api/v1/billing/status')
          return json({ ...billingStatus, access: 'READ_ONLY' });
        if (req.method === 'GET') {
          reads.push(req.clone());
          return read();
        }
        writes.push(req.clone());
        return write(req);
      },
    },
  );
  const router = createMemoryRouter(
    [
      {
        path: '/coleta',
        element: (
          <RequireSession>
            <ColetaPage client={client} />
          </RequireSession>
        ),
      },
      { path: '/', element: <p>Apostas</p> },
      { path: '/enviar', element: <p>Enviar</p> },
      { path: '/configuracoes', element: <p>Configurações</p> },
      { path: '/login', element: <p>Entrar</p> },
    ],
    { initialEntries: ['/coleta?casa=7&apagadas=1'] },
  );
  const view = render(
    <ProvedorAuth service={session}>
      <QueryClientProvider client={queries}>
        <ProvedorAcesso controller={controller} client={client}>
          <RouterProvider router={router} />
        </ProvedorAcesso>
      </QueryClientProvider>
    </ProvedorAuth>,
  );
  await screen.findByRole('button', { name: 'Gerar código de conexão' });
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Consultar dispositivos' }),
    ).toBeEnabled(),
  );
  cleanups.push(() => {
    router.dispose();
    session.dispose();
    controller.dispose();
    queries.clear();
  });
  return {
    ...view,
    user: userEvent.setup(),
    writes,
    reads,
    session,
    router,
    queries,
    status: (value: typeof status) => {
      status = value;
    },
    reply: (
      value: unknown,
      statusCode = 200,
      headers: Record<string, string> = {},
    ) => {
      write = async () => json(value, statusCode, headers);
    },
    respond: (handler: typeof write) => {
      write = handler;
    },
    read: (handler: typeof read) => {
      read = handler;
    },
  };
}
const generate = () =>
  screen.getByRole('button', { name: 'Gerar código de conexão' });
const consult = () =>
  screen.getByRole('button', { name: 'Consultar dispositivos' });
it('lista sessões independentes e preserva filtros sem declarar online', async () => {
  const app = await open();
  expect(
    screen.getByRole('article', { name: 'Notebook pessoal' }),
  ).toHaveTextContent('Aberta');
  expect(
    screen.getByRole('article', { name: 'Computador de casa' }),
  ).toHaveTextContent('Última encerrada');
  expect(
    screen.getByRole('article', { name: 'Notebook anterior' }),
  ).toHaveTextContent('Sem sessão registrada');
  expect(screen.getByRole('link', { name: 'Ver Apostas' })).toHaveAttribute(
    'href',
    '/?casa=7&apagadas=1',
  );
  expect(app.writes).toHaveLength(0);
  await app.user.click(screen.getAllByText('Datas e identificação')[0]!);
  expect(screen.getAllByText('Criado em')[0]).toBeVisible();
});
it('pareamento em READ_ONLY usa um POST com CSRF e mantém segredo fora do cache/storage/URL', async () => {
  const app = await open(true);
  const button = generate();
  fireEvent.click(button);
  fireEvent.click(button);
  await screen.findByText(temporaryCode().codigo);
  expect(app.writes).toHaveLength(1);
  expect(app.writes[0]!.headers.has('X-CSRF-Token')).toBe(true);
  expect(
    screen.getByRole('heading', { name: 'Seu código de conexão' }),
  ).toHaveFocus();
  expect(
    JSON.stringify(
      app.queries
        .getQueryCache()
        .getAll()
        .map((q) => q.state.data),
    ),
  ).not.toContain('cpc_');
  expect(JSON.stringify({ ...localStorage, ...sessionStorage })).not.toContain(
    'cpc_',
  );
  expect(app.router.state.location.search).toBe('?casa=7&apagadas=1');
  await app.user.click(screen.getByRole('button', { name: 'Copiar código' }));
  expect(await navigator.clipboard.readText()).toBe(temporaryCode().codigo);
  await screen.findByText('Copiado. Cole somente na sua extensão.');
  await app.user.click(
    screen.getByRole('button', { name: 'Ocultar e concluir' }),
  );
  expect(screen.queryByText(temporaryCode().codigo)).not.toBeInTheDocument();
});
it('rotação confirmada de um dispositivo não altera o outro; cancelamento e Escape devolvem foco', async () => {
  const app = await open();
  const first = screen.getAllByRole('button', {
    name: 'Trocar credencial',
  })[0]!;
  await app.user.click(first);
  await screen.findByRole('heading', { name: /Trocar credencial:/ });
  await app.user.click(screen.getByRole('button', { name: 'Voltar' }));
  expect(first).toHaveFocus();
  expect(app.writes).toHaveLength(0);
  await app.user.click(first);
  const title = await screen.findByRole('heading', {
    name: /Trocar credencial:/,
  });
  fireEvent.keyDown(title, { key: 'Escape' });
  expect(first).toHaveFocus();
  await app.user.click(first);
  await screen.findByRole('heading', { name: /Trocar credencial:/ });
  await app.user.click(screen.getByRole('button', { name: 'Confirmar troca' }));
  await screen.findByText(temporaryToken);
  expect(app.writes).toHaveLength(1);
  expect(app.writes[0]!.url).toMatch(/installations\/1\/rotate$/);
  expect(
    screen.getByRole('article', { name: 'Computador de casa' }),
  ).toHaveTextContent('Última encerrada');
  await app.user.click(
    screen.getByRole('button', { name: 'Copiar credencial' }),
  );
  expect(await navigator.clipboard.readText()).toBe(temporaryToken);
  await app.user.click(screen.getByRole('link', { name: 'Ver Apostas' }));
  expect(screen.queryByText(temporaryToken)).not.toBeInTheDocument();
});
it('revogação exige confirmação e consulta atual antes dela, sem encerrar sessão', async () => {
  const app = await open();
  const before = app.reads.length;
  await app.user.click(
    screen.getAllByRole('button', { name: 'Revogar acesso' })[0]!,
  );
  await screen.findByRole('heading', { name: /Revogar acesso:/ });
  expect(app.reads.length).toBeGreaterThan(before);
  await app.user.click(
    screen.getByRole('button', { name: 'Confirmar revogação' }),
  );
  await screen.findByText(/Revogação confirmada para este dispositivo/);
  expect(app.writes).toHaveLength(1);
  expect(app.writes[0]!.method).toBe('DELETE');
  expect(
    screen.getByRole('article', { name: 'Notebook pessoal' }),
  ).toHaveTextContent('Aberta');
});
it('estado mudou antes de confirmar: não escreve numa instalação já revogada', async () => {
  const app = await open();
  app.status(
    devices.map((d) => ({ ...d, revogado_em: new Date().toISOString() })),
  );
  await app.user.click(
    screen.getAllByRole('button', { name: 'Revogar acesso' })[0]!,
  );
  await screen.findByText(
    'O dispositivo já foi revogado ou não está mais disponível.',
  );
  expect(app.writes).toHaveLength(0);
});
it('resposta perdida não é repetida e consulta não recupera o segredo', async () => {
  const app = await open();
  app.respond(async () => {
    throw new TypeError('falha');
  });
  await app.user.click(generate());
  await screen.findByText(
    /A ação terminou sem confirmação e não será repetida/,
  );
  expect(app.writes).toHaveLength(1);
  expect(generate()).toBeDisabled();
  await app.user.click(consult());
  await waitFor(() => expect(generate()).toBeEnabled());
  expect(app.writes).toHaveLength(1);
  expect(screen.queryByText(temporaryCode().codigo)).not.toBeInTheDocument();
});
it('429 respeita Retry-After, segredo inválido é incerto, código expirado não aparece', async () => {
  const app = await open();
  app.reply({}, 429, { 'Retry-After': '120' });
  await app.user.click(generate());
  await waitFor(() => expect(generate()).toBeDisabled());
  expect(app.writes).toHaveLength(1);
});
it('resposta inválida não mostra credencial; emissão expirada orienta nova ação', async () => {
  const app = await open();
  app.reply({ codigo: 'vazamento', expira_em: 'amanhã' }, 201);
  await app.user.click(generate());
  await screen.findByText(/A ação terminou sem confirmação/);
  expect(screen.queryByText('vazamento')).not.toBeInTheDocument();
  await app.user.click(consult());
  await waitFor(() => expect(generate()).toBeEnabled());
  app.reply({ ...temporaryCode(), expira_em: '2020-01-01T00:00:00Z' }, 201);
  await app.user.click(generate());
  await screen.findByText(
    'O código recebido já expirou. Gere outro quando precisar.',
  );
});
it('expiração remove código e mensagem de cópia; copiar recusado orienta seleção', async () => {
  const app = await open();
  app.reply(
    {
      ...temporaryCode(),
      expira_em: new Date(Date.now() + 1500).toISOString(),
    },
    201,
  );
  vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error());
  await app.user.click(generate());
  await screen.findByText(temporaryCode().codigo);
  await app.user.click(screen.getByRole('button', { name: 'Copiar código' }));
  await screen.findByText(/Não foi possível copiar/);
  await screen.findByText(
    /O código expirou e foi removido/,
    {},
    { timeout: 3000 },
  );
  expect(screen.queryByText(temporaryCode().codigo)).not.toBeInTheDocument();
});
it('saída, logout e resposta tardia não reintroduzem segredo', async () => {
  const app = await open();
  let finish!: (value: Response) => void;
  app.respond(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await app.user.click(generate());
  await waitFor(() => expect(app.writes).toHaveLength(1));
  await act(async () => app.session.logout());
  finish(json(temporaryCode(), 201));
  await act(async () => Promise.resolve());
  expect(screen.queryByText(temporaryCode().codigo)).not.toBeInTheDocument();
});
it('erro de GET bloqueia alterações e mantém recorte até consulta explícita', async () => {
  const app = await open();
  app.read(async () => json({}, 503, { 'Retry-After': '120' }));
  await app.user.click(consult());
  await waitFor(() => expect(generate()).toBeDisabled());
  expect(app.writes).toHaveLength(0);
  expect(app.router.state.location.search).toBe('?casa=7&apagadas=1');
});
