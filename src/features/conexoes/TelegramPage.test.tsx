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
  unlinkedTelegram,
  linkedTelegram,
  temporaryTelegramCode,
} from '../../../tests/fixtures/telegram';
import { TelegramPage } from './TelegramPage';
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
async function open(linked = false) {
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
  let status = linked ? linkedTelegram : unlinkedTelegram;
  let read: () => Promise<Response> = async () => json(status);
  let write: (req: Request) => Promise<Response> = async (req) => {
    if (req.method === 'DELETE') {
      status = unlinkedTelegram;
      return json({ revoked: true });
    }
    return json(temporaryTelegramCode(), 201);
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
        path: '/configuracoes/conexoes',
        element: (
          <RequireSession>
            <TelegramPage client={client} />
          </RequireSession>
        ),
      },
      { path: '/enviar', element: <p>Enviar</p> },
      { path: '/configuracoes', element: <p>Configurações</p> },
      { path: '/login', element: <p>Entrar</p> },
    ],
    { initialEntries: ['/configuracoes/conexoes?casa=7&apagadas=1'] },
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
  await screen.findByRole('heading', {
    name: linked ? 'Telegram conectado' : 'Telegram não conectado',
  });
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
  screen.getByRole('button', { name: 'Gerar código temporário' });
const consult = () => screen.getByRole('button', { name: 'Consultar vínculo' });
it('estado vazio orienta, preserva contexto e identifica o link fictício', async () => {
  const app = await open();
  expect(app.writes).toHaveLength(0);
  expect(
    screen.getByRole('link', {
      name: 'Abrir bot do bancaemdia (link fictício)',
    }),
  ).toHaveAttribute('href', '#telegram-bot-lancamento');
  expect(
    screen.getByRole('link', { name: 'Importar histórico em Enviar' }),
  ).toHaveAttribute('href', '/enviar?casa=7&apagadas=1');
  expect(
    screen.getByRole('link', { name: 'Voltar para Configurações' }),
  ).toHaveAttribute('href', '/configuracoes?casa=7&apagadas=1');
  await app.user.click(screen.getByText('Como funciona o envio de uma foto'));
  expect(screen.getByText(/Corrija o que for necessário/)).toBeVisible();
});
it('um POST com CSRF em READ_ONLY, comando só em memória e foco no resultado', async () => {
  const app = await open();
  const button = generate();
  fireEvent.click(button);
  fireEvent.click(button);
  await screen.findByText('/vincular ABCDEFGH');
  expect(app.writes).toHaveLength(1);
  expect(app.writes[0]!.headers.has('X-CSRF-Token')).toBe(true);
  expect(app.writes[0]!.method).toBe('POST');
  expect(await app.writes[0]!.text()).toBe('');
  expect(
    screen.getByRole('heading', { name: 'Seu comando de conexão' }),
  ).toHaveFocus();
  expect(generate()).toBeDisabled();
  expect(app.router.state.location.search).not.toContain('ABCDEFGH');
  expect(
    JSON.stringify(
      app.queries
        .getQueryCache()
        .getAll()
        .map((q) => q.state.data),
    ),
  ).not.toContain('ABCDEFGH');
  expect(JSON.stringify({ ...localStorage, ...sessionStorage })).not.toContain(
    'ABCDEFGH',
  );
});
it('copiar depende de gesto e falha orienta seleção sem guardar o comando', async () => {
  const app = await open();
  await app.user.click(generate());
  await screen.findByText('/vincular ABCDEFGH');
  const copy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
  expect(copy).not.toHaveBeenCalled();
  await app.user.click(screen.getByRole('button', { name: 'Copiar comando' }));
  expect(copy).toHaveBeenCalledWith('/vincular ABCDEFGH');
  expect(await screen.findByText('Comando copiado.')).toBeVisible();
  copy.mockRejectedValueOnce(Error('private clipboard error'));
  await app.user.click(screen.getByRole('button', { name: 'Copiar comando' }));
  expect(await screen.findByText(/Não foi possível copiar/)).toBeVisible();
  expect(screen.queryByText('private clipboard error')).not.toBeInTheDocument();
});
it('ocultar interrompe a observação e novo código requer confirmação explícita', async () => {
  const app = await open();
  await app.user.click(generate());
  await screen.findByText('/vincular ABCDEFGH');
  await app.user.click(
    screen.getByRole('button', { name: 'Ocultar código e parar consulta' }),
  );
  expect(screen.queryByText('/vincular ABCDEFGH')).not.toBeInTheDocument();
  await app.user.click(
    screen.getByRole('button', { name: 'Preparar novo código' }),
  );
  expect(
    screen.getByRole('heading', { name: 'Gerar um novo código?' }),
  ).toHaveFocus();
  await app.user.click(screen.getByRole('button', { name: 'Voltar' }));
  expect(
    screen.getByRole('button', { name: 'Preparar novo código' }),
  ).toHaveFocus();
  await app.user.click(
    screen.getByRole('button', { name: 'Preparar novo código' }),
  );
  await app.user.click(
    screen.getByRole('button', { name: 'Confirmar novo código' }),
  );
  await screen.findByText('/vincular ABCDEFGH');
  expect(app.writes).toHaveLength(2);
});
it('revogação tem confirmação, conserva apostas e consulta estado real', async () => {
  const app = await open(true);
  expect(screen.getByText('Não informado')).toBeVisible();
  await app.user.click(screen.getByRole('button', { name: 'Revogar vínculo' }));
  await app.user.click(screen.getByRole('button', { name: 'Voltar' }));
  expect(app.writes).toHaveLength(0);
  expect(screen.getByRole('button', { name: 'Revogar vínculo' })).toHaveFocus();
  await app.user.click(screen.getByRole('button', { name: 'Revogar vínculo' }));
  expect(screen.getByText(/apostas já registradas permanecem/)).toBeVisible();
  await app.user.click(
    screen.getByRole('button', { name: 'Confirmar revogação' }),
  );
  expect(
    await screen.findByText(
      'Vínculo revogado. Códigos anteriores foram invalidados.',
    ),
  ).toBeVisible();
  expect(app.writes).toHaveLength(1);
  expect(app.writes[0]!.method).toBe('DELETE');
  expect(app.writes[0]!.headers.has('X-CSRF-Token')).toBe(true);
  expect(
    screen.getByRole('heading', { name: 'Telegram não conectado' }),
  ).toBeVisible();
});
it('revoked false não afirma que um vínculo existia', async () => {
  const app = await open(true);
  app.respond(async () => {
    app.status(unlinkedTelegram);
    return json({ revoked: false });
  });
  await app.user.click(screen.getByRole('button', { name: 'Revogar vínculo' }));
  await app.user.click(
    screen.getByRole('button', { name: 'Confirmar revogação' }),
  );
  expect(
    await screen.findByText(
      'Não havia vínculo ativo. Códigos anteriores foram invalidados.',
    ),
  ).toBeVisible();
});
it('concorrência após revogação apresenta o estado conectado devolvido, sem sucesso falso', async () => {
  const app = await open(true);
  app.reply({ revoked: true });
  await app.user.click(screen.getByRole('button', { name: 'Revogar vínculo' }));
  await app.user.click(
    screen.getByRole('button', { name: 'Confirmar revogação' }),
  );
  expect(
    await screen.findByText(/estado atual ainda indica vínculo/),
  ).toBeVisible();
  expect(
    screen.queryByText(
      'Vínculo revogado. Códigos anteriores foram invalidados.',
    ),
  ).not.toBeInTheDocument();
});
it.each([422, 409, 429, 503])(
  'emissão %s não repete e oculta payload privado',
  async (status) => {
    const app = await open();
    app.reply(
      {
        detail: [
          {
            loc: ['body', 'PRIVATE_FIELD'],
            msg: 'PRIVATE_MESSAGE',
            input: 'PRIVATE_CODE',
          },
        ],
      },
      status,
      status === 429 ? { 'Retry-After': '61' } : {},
    );
    await app.user.click(generate());
    await screen.findByRole('alert');
    expect(app.writes).toHaveLength(1);
    expect(screen.queryByText(/PRIVATE_/)).not.toBeInTheDocument();
    if (status === 429) expect(generate()).toBeDisabled();
    if (status === 409)
      expect(
        screen.getByRole('button', { name: 'Preparar novo código' }),
      ).toBeDisabled();
  },
);
it('emissão desconhecida exige GET e confirmação de uma nova intenção', async () => {
  const app = await open();
  app.respond(async () => {
    throw Error('private network');
  });
  await app.user.click(generate());
  await screen.findByRole('alert');
  expect(generate()).toBeDisabled();
  expect(
    screen.getByRole('button', { name: 'Preparar novo código' }),
  ).toBeDisabled();
  app.reply(temporaryTelegramCode(), 201);
  await app.user.click(consult());
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Preparar novo código' }),
    ).toBeEnabled(),
  );
  await app.user.click(
    screen.getByRole('button', { name: 'Preparar novo código' }),
  );
  await app.user.click(
    screen.getByRole('button', { name: 'Confirmar novo código' }),
  );
  await screen.findByText('/vincular ABCDEFGH');
  expect(app.writes).toHaveLength(2);
});
it('revogação desconhecida não repete o DELETE nem declara desconexão', async () => {
  const app = await open(true);
  app.respond(async () => {
    throw Error('private network');
  });
  await app.user.click(screen.getByRole('button', { name: 'Revogar vínculo' }));
  await app.user.click(
    screen.getByRole('button', { name: 'Confirmar revogação' }),
  );
  await screen.findByRole('alert');
  expect(
    screen.getByRole('button', { name: 'Revogar vínculo' }),
  ).toBeDisabled();
  expect(
    screen.getByRole('heading', { name: 'Telegram conectado' }),
  ).toBeVisible();
  await app.user.click(consult());
  expect(app.writes).toHaveLength(1);
});
it('falha na consulta depois de DELETE confirmado preserva estado antigo e não repete escrita', async () => {
  const app = await open(true);
  app.respond(async () => {
    app.read(async () => json({ detail: 'PRIVATE' }, 500));
    return json({ revoked: true });
  });
  await app.user.click(screen.getByRole('button', { name: 'Revogar vínculo' }));
  await app.user.click(
    screen.getByRole('button', { name: 'Confirmar revogação' }),
  );
  await screen.findAllByRole('alert');
  expect(
    screen.getByRole('button', { name: 'Revogar vínculo' }),
  ).toBeDisabled();
  expect(
    screen.queryByText(
      'Vínculo revogado. Códigos anteriores foram invalidados.',
    ),
  ).not.toBeInTheDocument();
});
it.each([{}, { code: 'PRIVATE_PAYLOAD', expires_at: 'PRIVATE_DATE' }])(
  'resposta de emissão incompleta não aparece nem libera repetição',
  async (body) => {
    const app = await open();
    app.reply(body, 201);
    await app.user.click(generate());
    await screen.findByRole('alert');
    expect(screen.queryByText(/PRIVATE_/)).not.toBeInTheDocument();
    expect(generate()).toBeDisabled();
  },
);
it('código já expirado não é mostrado nem inicia polling', async () => {
  const app = await open();
  app.reply({ code: 'ABCDEFGH', expires_at: '2020-01-01T00:00:00Z' }, 201);
  await app.user.click(generate());
  await screen.findByRole('status');
  expect(screen.queryByText('/vincular ABCDEFGH')).not.toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'Preparar novo código' }),
  ).toBeVisible();
});
it('status fora do contrato não instala comando nem repete a emissão', async () => {
  const app = await open();
  app.reply(temporaryTelegramCode(), 200);
  await app.user.click(generate());
  await screen.findByRole('alert');
  expect(screen.queryByText('/vincular ABCDEFGH')).not.toBeInTheDocument();
  expect(generate()).toBeDisabled();
  expect(app.writes).toHaveLength(1);
});
it('vínculo confirmado com nova emissão aberta não gera código desnecessário', async () => {
  const app = await open();
  await app.user.click(generate());
  await screen.findByText('/vincular ABCDEFGH');
  await app.user.click(
    screen.getByRole('button', { name: 'Ocultar código e parar consulta' }),
  );
  await app.user.click(
    screen.getByRole('button', { name: 'Preparar novo código' }),
  );
  app.status(linkedTelegram);
  await app.user.click(consult());
  await screen.findByRole('heading', { name: 'Telegram conectado' });
  await app.user.click(
    screen.getByRole('button', { name: 'Confirmar novo código' }),
  );
  await screen.findByText(
    'O Telegram já está conectado. Confira o vínculo atual.',
  );
  expect(app.writes).toHaveLength(1);
  expect(screen.queryByText('/vincular ABCDEFGH')).not.toBeInTheDocument();
  expect(
    screen.queryByRole('heading', { name: 'Gerar um novo código?' }),
  ).not.toBeInTheDocument();
});
it('polling com backoff termina em dois minutos; expiração apaga o segredo', async () => {
  const app = await open();
  focusManager.setFocused(true);
  vi.useFakeTimers();
  fireEvent.click(generate());
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(screen.getByText('/vincular ABCDEFGH')).toBeVisible();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5000);
  });
  expect(app.reads.length).toBeGreaterThan(1);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(115000);
  });
  const reads = app.reads.length;
  await act(async () => {
    await vi.advanceTimersByTimeAsync(30000);
  });
  expect(app.reads).toHaveLength(reads);
  expect(reads).toBeLessThan(30);
  expect(screen.getByText(/consulta automática está pausada/)).toBeVisible();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(30 * 60 * 1000);
  });
  expect(screen.queryByText('/vincular ABCDEFGH')).not.toBeInTheDocument();
  expect(app.writes).toHaveLength(1);
});
it('vínculo confirmado durante polling remove o comando imediatamente', async () => {
  const app = await open();
  await app.user.click(generate());
  await screen.findByText('/vincular ABCDEFGH');
  app.status(linkedTelegram);
  await app.user.click(consult());
  await screen.findByRole('heading', { name: 'Telegram conectado' });
  expect(screen.queryByText('/vincular ABCDEFGH')).not.toBeInTheDocument();
});
it('GET recusado preserva dado válido; prazo bloqueia botões e nova consulta', async () => {
  const app = await open();
  app.read(async () =>
    json({ detail: 'PRIVATE' }, 429, { 'Retry-After': '61' }),
  );
  await app.user.click(consult());
  await screen.findByRole('alert');
  expect(generate()).toBeDisabled();
  expect(consult()).toBeDisabled();
  expect(screen.getByText(/última consulta confirmada/)).toBeVisible();
});
it('navegação remove comando e não guarda retorno secreto', async () => {
  const app = await open();
  await app.user.click(generate());
  await screen.findByText('/vincular ABCDEFGH');
  await app.user.click(
    screen.getByRole('link', { name: 'Importar histórico em Enviar' }),
  );
  expect(screen.queryByText('/vincular ABCDEFGH')).not.toBeInTheDocument();
  expect(app.router.state.location.pathname).toBe('/enviar');
  expect(app.router.state.location.search).toBe('?casa=7&apagadas=1');
});
it('logout desmonta tela e descarta resposta tardia inclusive após parsing', async () => {
  const app = await open();
  let deliver: (res: Response) => void = () => {};
  app.respond(
    () =>
      new Promise((resolve) => {
        deliver = resolve;
      }),
  );
  fireEvent.click(generate());
  await waitFor(() => expect(app.writes).toHaveLength(1));
  await act(() => app.session.logout());
  await act(async () => deliver(json(temporaryTelegramCode(), 201)));
  expect(
    screen.queryByRole('heading', { name: 'Telegram' }),
  ).not.toBeInTheDocument();
  expect(screen.queryByText('/vincular ABCDEFGH')).not.toBeInTheDocument();
});
it('clipboard tardio depois de ocultar não restaura anúncio nem código', async () => {
  const app = await open();
  await app.user.click(generate());
  await screen.findByText('/vincular ABCDEFGH');
  let done: () => void = () => {};
  vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(
    () =>
      new Promise((resolve) => {
        done = resolve;
      }),
  );
  await app.user.click(screen.getByRole('button', { name: 'Copiar comando' }));
  await app.user.click(
    screen.getByRole('button', { name: 'Ocultar código e parar consulta' }),
  );
  await act(async () => done());
  expect(screen.queryByText('Comando copiado.')).not.toBeInTheDocument();
  expect(screen.queryByText('/vincular ABCDEFGH')).not.toBeInTheDocument();
});
