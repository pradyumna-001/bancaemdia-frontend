import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
import { ConfiguracoesPage } from './ConfiguracoesPage';

const cleanups: Array<() => void> = [];
beforeEach(() => {
  if (!HTMLDialogElement.prototype.showModal)
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute('open', '');
    };
  if (!HTMLDialogElement.prototype.close)
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute('open');
    };
  vi.spyOn(HTMLDialogElement.prototype, 'showModal').mockImplementation(
    function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    },
  );
  vi.spyOn(HTMLDialogElement.prototype, 'close').mockImplementation(function (
    this: HTMLDialogElement,
  ) {
    this.removeAttribute('open');
  });
});
afterEach(() => {
  cleanups.splice(0).forEach((fn) => fn());
  vi.restoreAllMocks();
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

async function open(
  access = 'FULL_WRITE',
  initialRead?: () => Promise<Response>,
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
  const controller = createAccessController(session, queries);
  let saved = 'America/Sao_Paulo';
  let read = initialRead ?? (async () => json({ fuso_horario: saved }));
  let write = async (req: Request) => {
    saved = ((await req.json()) as { fuso_horario: string }).fuso_horario;
    return json({ fuso_horario: saved });
  };
  const writes: Request[] = [];
  const reads: Request[] = [];
  const client = createApiClient(
    parseConfig({ VITE_API_URL: 'http://127.0.0.1:8000' }),
    {
      captureSession: session.capture,
      fetcher: async (req) => {
        if (new URL(req.url).pathname === '/api/v1/billing/status')
          return json({ ...billingStatus, access });
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
        path: '/configuracoes',
        element: (
          <RequireSession>
            <ConfiguracoesPage client={client} />
          </RequireSession>
        ),
      },
      { path: '/login', element: <p>Entrar</p> },
    ],
    { initialEntries: ['/configuracoes?casa=7&apagadas=1'] },
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
  cleanups.push(() => {
    view.unmount();
    router.dispose();
    controller.dispose();
    session.dispose();
    queries.clear();
  });
  if (!initialRead) {
    await screen.findByText('Salvo na conta:', { exact: false });
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Consultar fuso salvo' }),
      ).toBeEnabled(),
    );
  }
  return {
    session,
    writes,
    reads,
    router,
    setRead: (fn: typeof read) => {
      read = fn;
    },
    setWrite: (fn: typeof write) => {
      write = fn;
    },
  };
}
async function choose(zone = 'UTC') {
  await userEvent.click(screen.getByLabelText('Fuso das análises'));
  await userEvent.type(screen.getByLabelText('Buscar cidade ou região'), zone);
  await userEvent.click(screen.getByRole('button', { name: zone }));
}

it('salva o fuso real, preserva filtros e encaminha senha ao retorno interno', async () => {
  const app = await open();
  expect(screen.getByRole('link', { name: 'Conexões' })).toHaveAttribute(
    'href',
    '/configuracoes/conexoes?casa=7&apagadas=1',
  );
  expect(screen.getByRole('link', { name: 'Assinatura' })).toHaveAttribute(
    'href',
    '/assinatura?casa=7&apagadas=1',
  );
  expect(
    new URL(
      screen.getByRole('link', { name: 'Alterar senha' }).getAttribute('href')!,
      'http://localhost',
    ).searchParams.get('destino'),
  ).toBe('/configuracoes?casa=7&apagadas=1');
  await choose();
  await userEvent.click(screen.getByRole('button', { name: 'Salvar fuso' }));
  await screen.findByText(
    'Fuso salvo: UTC. As análises usarão essa divisão dos dias.',
  );
  expect(app.writes).toHaveLength(1);
  expect(await app.writes[0]!.json()).toEqual({ fuso_horario: 'UTC' });
  expect(app.writes[0]!.headers.get('X-CSRF-Token')).toBeTruthy();
  expect(app.writes[0]!.headers.has('Idempotency-Key')).toBe(false);
  await userEvent.click(
    screen.getByRole('button', { name: 'Consultar fuso salvo' }),
  );
  await screen.findByText('Fuso atual confirmado: UTC.');
  expect(screen.getByRole('button', { name: 'Salvar fuso' })).toBeDisabled();
});

it('seletor tem busca vazia, cancelamento e retorno ao botão, sem enviar alteração', async () => {
  const app = await open();
  const picker = screen.getByLabelText('Fuso das análises');
  await userEvent.click(picker);
  await userEvent.type(
    screen.getByLabelText('Buscar cidade ou região'),
    'cidade inventada',
  );
  expect(screen.getByRole('status')).toHaveTextContent(
    'Nenhum fuso encontrado',
  );
  fireEvent(screen.getByRole('dialog'), new Event('cancel'));
  await waitFor(() => expect(picker).toHaveFocus());
  await userEvent.click(picker);
  fireEvent.keyDown(screen.getByLabelText('Buscar cidade ou região'), {
    key: 'a',
  });
  fireEvent.keyDown(screen.getByLabelText('Buscar cidade ou região'), {
    key: 'Escape',
  });
  await waitFor(() => expect(picker).toHaveFocus());
  await userEvent.click(picker);
  await userEvent.click(screen.getByRole('button', { name: 'Voltar' }));
  expect(app.writes).toHaveLength(0);
});

it('em leitura mantém consulta, aparência e links, sem formulário de escrita funcional', async () => {
  const app = await open('READ_ONLY');
  expect(screen.getByLabelText('Fuso das análises')).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Salvar fuso' })).toBeDisabled();
  expect(
    screen.getByText(
      'Você pode consultar o fuso salvo. A alteração fica disponível com acesso para editar.',
    ),
  ).toBeVisible();
  await userEvent.click(
    screen.getByRole('button', { name: 'Consultar fuso salvo' }),
  );
  await screen.findByText('Fuso atual confirmado:', { exact: false });
  expect(app.writes).toHaveLength(0);
});

it.each([402, 422, 429])(
  'recusa %s preserva escolha e nunca repete PATCH',
  async (status) => {
    const app = await open();
    app.setWrite(async () =>
      json(
        {
          detail: [
            {
              loc: ['body', 'fuso_horario'],
              input: 'SEGREDO',
              msg: 'SEGREDO',
              ctx: { secret: 'SEGREDO' },
            },
          ],
        },
        status,
        status === 429 ? { 'Retry-After': '121' } : {},
      ),
    );
    await choose();
    await userEvent.click(screen.getByRole('button', { name: 'Salvar fuso' }));
    await screen.findByRole('alert');
    expect(screen.getByLabelText('Fuso das análises')).toHaveTextContent('UTC');
    expect(app.writes).toHaveLength(1);
    expect(document.body).not.toHaveTextContent('SEGREDO');
    if (status === 422) {
      await userEvent.click(
        screen.getByRole('button', { name: 'Confira Fuso das análises' }),
      );
      expect(screen.getByLabelText('Fuso das análises')).toHaveFocus();
    }
    if (status === 429)
      expect(
        screen.getByRole('button', { name: 'Consultar fuso salvo' }),
      ).toBeDisabled();
  },
);

it.each(['network', 'invalid', 'conflict'])(
  'resultado %s exige GET explícito antes de nova intenção',
  async (scenario) => {
    const app = await open();
    app.setWrite(async () => {
      if (scenario === 'network') throw new Error('SEGREDO');
      return json({}, scenario === 'conflict' ? 409 : 200);
    });
    await choose();
    await userEvent.click(screen.getByRole('button', { name: 'Salvar fuso' }));
    await screen.findByText(
      'Confira o fuso salvo antes de fazer uma nova alteração.',
    );
    expect(screen.getByRole('button', { name: 'Salvar fuso' })).toBeDisabled();
    await userEvent.click(
      screen.getByRole('button', { name: 'Consultar fuso salvo' }),
    );
    await screen.findByText('Fuso atual confirmado:', { exact: false });
    expect(screen.getByRole('button', { name: 'Salvar fuso' })).toBeEnabled();
    expect(app.writes).toHaveLength(1);
  },
);

it('falha de atualização conserva o último valor e não transforma fuso desconhecido em padrão', async () => {
  const app = await open();
  app.setRead(async () => json({ fuso_horario: 'invalido' }));
  await userEvent.click(
    screen.getByRole('button', { name: 'Consultar fuso salvo' }),
  );
  await screen.findByRole('alert');
  expect(
    screen.getByText('Salvo na conta:', { exact: false }),
  ).toHaveTextContent('America / Sao Paulo');
  expect(screen.getByRole('button', { name: 'Salvar fuso' })).toBeDisabled();
  app.setRead(async () => json({ fuso_horario: 'UTC' }));
  await userEvent.click(
    screen.getByRole('button', { name: 'Tentar novamente' }),
  );
  await screen.findByText('Fuso atual confirmado: UTC.');
});

it('503 respeita prazo também na consulta manual', async () => {
  const app = await open();
  app.setRead(async () => json({}, 503, { 'Retry-After': '121' }));
  await userEvent.click(
    screen.getByRole('button', { name: 'Consultar fuso salvo' }),
  );
  await screen.findByRole('alert');
  expect(
    screen.getByRole('button', { name: 'Consultar fuso salvo' }),
  ).toBeDisabled();
});

it('404 retira gatilhos de repetição e mantém os destinos da conta', async () => {
  const app = await open();
  app.setRead(async () => json({}, 404));
  await userEvent.click(
    screen.getByRole('button', { name: 'Consultar fuso salvo' }),
  );
  await screen.findByRole('alert');
  expect(
    screen.queryByRole('button', { name: 'Consultar fuso salvo' }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Tentar novamente' }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Conexões' })).toBeVisible();
});

it('resposta inicial inválida não fabrica um fuso e permite consulta explícita segura', async () => {
  const app = await open('FULL_WRITE', async () =>
    json({ fuso_horario: 'America/Inventada' }),
  );
  await screen.findByRole('alert');
  expect(screen.queryByLabelText('Fuso das análises')).not.toBeInTheDocument();
  expect(
    screen.queryByText('Salvo na conta:', { exact: false }),
  ).not.toBeInTheDocument();
  app.setRead(async () => json({ fuso_horario: 'UTC' }));
  await userEvent.click(
    screen.getByRole('button', { name: 'Tentar novamente' }),
  );
  await screen.findByText('Fuso atual confirmado: UTC.');
});

it('descarta resposta de gravação recebida após logout e evita envio duplicado', async () => {
  const app = await open();
  let finish!: (response: Response) => void;
  app.setWrite(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await choose();
  fireEvent.click(screen.getByRole('button', { name: 'Salvar fuso' }));
  await waitFor(() => expect(app.writes).toHaveLength(1));
  expect(screen.getByRole('button', { name: 'Salvando…' })).toBeDisabled();
  await act(() => app.session.logout());
  await act(async () => finish(json({ fuso_horario: 'UTC' })));
  expect(
    screen.queryByText('Fuso salvo:', { exact: false }),
  ).not.toBeInTheDocument();
  expect(app.writes).toHaveLength(1);
});
