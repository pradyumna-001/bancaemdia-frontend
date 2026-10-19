import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Blob as NodeBlob } from 'node:buffer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryRouter,
  MemoryRouter,
  RouterProvider,
} from 'react-router-dom';
import { createSession } from '../../../auth/session';
import { sessionContext } from '../../../auth/protocol';
import { ProvedorAuth } from '../../../auth/ProvedorAuth';
import { RequireSession } from '../../../auth/RequireSession';
import { createApiClient } from '../../../api/client';
import { parseConfig } from '../../../lib/config';
import { createAccessController } from '../../acesso/controller';
import { ProvedorAcesso } from '../../acesso/ProvedorAcesso';
import { AccountPage } from '../../conta/AccountPage';
import { billingStatus } from '../../../../tests/fixtures/acesso';
import { PrivacidadePage } from './PrivacidadePage';

const cleanups: Array<() => void> = [];
const clicked: HTMLAnchorElement[] = [];
const json = (body: unknown, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
const file = (mime: string, content = 'arquivo') =>
  new Response(new Blob([content], { type: mime }), {
    headers: { 'Content-Type': mime },
  });
beforeEach(() => {
  vi.stubGlobal('Blob', NodeBlob);
  URL.createObjectURL = vi.fn(() => 'blob:privacidade');
  URL.revokeObjectURL = vi.fn();
  clicked.length = 0;
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    clicked.push(this);
  });
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});
afterEach(() => {
  cleanups.splice(0).forEach((fn) => fn());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
async function open(access: 'FULL_WRITE' | 'READ_ONLY' = 'READ_ONLY') {
  const queries = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const context = sessionContext({
    usuario_id: 1,
    nome: 'Teste',
    email: 'test@example.org',
    session_version: `${crypto.randomUUID()}:1`,
    csrf_token: crypto.randomUUID(),
    refresh_required: false,
    access_expires_at: '2030-01-01T00:00:00Z',
    session_expires_at: '2030-01-02T00:00:00Z',
  });
  const transport = {
    read: vi.fn(async () => context),
    renew: vi.fn(async () => context),
    logout: vi.fn(async () => {}),
  };
  const session = createSession({
    baseUrl: 'http://127.0.0.1:8000',
    queryClient: queries,
    transport,
    exclusive: async (_signal, work) => work(),
  });
  await session.resume();
  const controller = createAccessController(session, queries);
  const requests: Request[] = [];
  let read = async (req: Request): Promise<Response> =>
    file(
      new URL(req.url).searchParams.get('formato') === 'json'
        ? 'application/json'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
  let write = async (): Promise<Response> => json({ status: 'anonymized' });
  const api = createApiClient(
    parseConfig({ VITE_API_URL: 'http://127.0.0.1:8000' }),
    {
      captureSession: session.capture,
      onUnauthorized: session.unauthorized,
      onAccessDenied: controller.denied,
      fetcher: async (req) => {
        if (new URL(req.url).pathname === '/api/v1/billing/status')
          return json({ ...billingStatus, access });
        requests.push(req.clone());
        return req.method === 'GET' ? read(req) : write();
      },
    },
  );
  const router = createMemoryRouter(
    [
      {
        path: '/configuracoes/privacidade',
        element: (
          <RequireSession>
            <PrivacidadePage client={api} />
          </RequireSession>
        ),
      },
      { path: '/login', element: <AccountPage path="/login" /> },
    ],
    { initialEntries: ['/configuracoes/privacidade?casa=7&apagadas=1'] },
  );
  const view = render(
    <ProvedorAuth service={session}>
      <QueryClientProvider client={queries}>
        <ProvedorAcesso controller={controller} client={api}>
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
  return {
    session,
    transport,
    queries,
    router,
    requests,
    view,
    read: (fn: typeof read) => {
      read = fn;
    },
    write: (fn: typeof write) => {
      write = fn;
    },
  };
}
async function confirm() {
  await userEvent.click(
    screen.getByRole('button', { name: 'Solicitar encerramento' }),
  );
  const modal = screen.getByRole('dialog');
  await userEvent.click(within(modal).getByRole('checkbox'));
  await userEvent.click(
    within(modal).getByRole('button', { name: 'Confirmar encerramento' }),
  );
}
it('sem sessão não consulta dados nem oferece encerramento', () => {
  render(
    <MemoryRouter>
      <PrivacidadePage />
    </MemoryRouter>,
  );
  expect(screen.getByRole('status')).toHaveTextContent('Consultando sessão');
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
it('exporta JSON e Excel em READ_ONLY, nome correto, sem filtros e sem cache de bytes', async () => {
  const s = await open();
  expect(
    screen.getByRole('link', { name: 'Voltar às configurações' }),
  ).toHaveAttribute('href', '/configuracoes?casa=7&apagadas=1');
  for (const format of ['JSON', 'Excel']) {
    await userEvent.click(
      screen.getByRole('button', { name: `Baixar ${format}` }),
    );
    await screen.findByText(`Arquivo ${format} preparado para baixar.`);
  }
  expect(clicked.map((link) => link.download)).toEqual([
    'meus-dados.json',
    'meus-dados.xlsx',
  ]);
  expect(s.requests.map((r) => r.url)).toEqual([
    'http://127.0.0.1:8000/api/v1/usuario/me/export?formato=json',
    'http://127.0.0.1:8000/api/v1/usuario/me/export?formato=xlsx',
  ]);
  expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
  expect(
    s.queries
      .getQueryCache()
      .getAll()
      .some((q) => q.state.data instanceof Blob),
  ).toBe(false);
});
it.each(['text/html', 'image/png', 'empty'])(
  'recusa arquivo incompatível ou vazio: %s',
  async (mime) => {
    const s = await open();
    s.read(async () =>
      file(
        mime === 'empty' ? 'application/json' : mime,
        mime === 'empty' ? '' : 'segredo',
      ),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Baixar JSON' }));
    await screen.findByRole('alert');
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(document.body).not.toHaveTextContent('segredo');
  },
);
it('429 conserva prazo, sem novo GET antes de Retry-After', async () => {
  const s = await open();
  s.read(async () =>
    json({ detail: 'segredo' }, 429, { 'Retry-After': '120' }),
  );
  await userEvent.click(screen.getByRole('button', { name: 'Baixar JSON' }));
  await screen.findByText('Aguarde para tentar novamente');
  expect(screen.getByRole('button', { name: 'Baixar JSON' })).toBeDisabled();
  expect(
    screen.getByRole('button', { name: /Tentar novamente/ }),
  ).toBeDisabled();
  expect(s.requests).toHaveLength(1);
});
it('erro recuperável só repete GET por gesto e mantém o formato', async () => {
  const s = await open();
  s.read(async () => json({}, 503));
  await userEvent.click(screen.getByRole('button', { name: 'Baixar Excel' }));
  await screen.findByText('O serviço está temporariamente indisponível');
  s.read(async () =>
    file('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
  );
  await userEvent.click(
    screen.getByRole('button', { name: 'Tentar novamente' }),
  );
  await screen.findByText('Arquivo Excel preparado para baixar.');
  expect(s.requests).toHaveLength(2);
});
it('libera Object URL mesmo se o navegador recusar o clique', async () => {
  await open();
  vi.mocked(HTMLAnchorElement.prototype.click).mockImplementationOnce(() => {
    throw new Error('recusa');
  });
  await userEvent.click(screen.getByRole('button', { name: 'Baixar JSON' }));
  await screen.findByRole('alert');
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:privacidade');
});
it('diálogo começa em Manter conta, exige checkbox e cancelar não escreve', async () => {
  const s = await open();
  await userEvent.click(
    screen.getByRole('button', { name: 'Solicitar encerramento' }),
  );
  expect(
    screen.getByRole('button', { name: 'Manter minha conta' }),
  ).toHaveFocus();
  expect(
    screen.getByRole('button', { name: 'Confirmar encerramento' }),
  ).toBeDisabled();
  fireEvent(
    screen.getByRole('dialog'),
    new Event('cancel', { cancelable: true }),
  );
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Solicitar encerramento' }),
    ).toHaveFocus(),
  );
  await userEvent.click(
    screen.getByRole('button', { name: 'Solicitar encerramento' }),
  );
  await userEvent.click(
    screen.getByRole('button', { name: 'Manter minha conta' }),
  );
  expect(s.requests).toHaveLength(0);
});
it('confirmado em READ_ONLY limpa sessão, consultas e sinaliza sucesso só em memória', async () => {
  const s = await open();
  s.queries.setQueryData(['privado'], { detalhe: 'privado' });
  await confirm();
  await screen.findByText(/Conta desativada e anonimizada/);
  expect(s.session.getSnapshot()).toMatchObject({
    phase: 'anonymous',
    accountClosed: true,
  });
  expect(() => s.session.capture()).toThrow();
  expect(s.queries.getQueryData(['privado'])).toBeUndefined();
  expect(s.requests.filter((r) => r.method === 'DELETE')).toHaveLength(1);
  expect(s.router.state.location.search).toBe('');
});
it.each([409, 402, 422, 403, 404, 405])(
  'recusa %s preserva sessão sem texto bruto nem repetição',
  async (status) => {
    const s = await open();
    s.write(async () => json({ detail: 'segredo-do-provedor' }, status));
    await confirm();
    await screen.findByRole('alert');
    expect(s.session.getSnapshot().phase).toBe('authenticated');
    expect(s.requests.filter((r) => r.method === 'DELETE')).toHaveLength(1);
    expect(document.body).not.toHaveTextContent('segredo-do-provedor');
    expect(screen.getByRole('button', { name: 'Baixar JSON' })).toBeEnabled();
  },
);
it.each(['network', 'invalid', 'server'])(
  'resultado %s desconhecido nunca reenvia; consulta de sessão preserva bloqueio',
  async (failure) => {
    const s = await open();
    s.write(async () => {
      if (failure === 'network') throw new Error('rede');
      return json(
        failure === 'invalid' ? { status: 'outro' } : {},
        failure === 'server' ? 500 : 200,
      );
    });
    await confirm();
    await screen.findByText('O resultado ainda não foi confirmado');
    expect(
      screen.getByRole('button', { name: 'Solicitar encerramento' }),
    ).toBeDisabled();
    await userEvent.click(
      screen.getByRole('button', { name: 'Consultar sessão' }),
    );
    await screen.findByText(/A conta continua acessível/);
    expect(
      screen.getByRole('button', { name: 'Solicitar encerramento' }),
    ).toBeDisabled();
    expect(s.requests.filter((r) => r.method === 'DELETE')).toHaveLength(1);
    expect(s.session.getSnapshot().accountClosed).toBeUndefined();
  },
);
it.each(['GET', 'DELETE'])(
  'saída durante %s aborta e descarta resposta antiga',
  async (method) => {
    const s = await open();
    let resolve: (value: Response) => void = () => {};
    const pending = new Promise<Response>((done) => {
      resolve = done;
    });
    if (method === 'GET') s.read(async () => pending);
    else s.write(async () => pending);
    if (method === 'GET')
      await userEvent.click(
        screen.getByRole('button', { name: 'Baixar JSON' }),
      );
    else await confirm();
    await act(async () => {
      s.session.accountClosed();
      resolve(
        method === 'GET'
          ? file('application/json')
          : json({ status: 'anonymized' }),
      );
    });
    await screen.findByRole('heading', { name: /^Entrar$/ });
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(s.requests).toHaveLength(1);
  },
);
it('duplo gesto não repete exportação pendente e saída remove recurso', async () => {
  const s = await open();
  let resolve: (value: Response) => void = () => {};
  s.read(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const button = screen.getByRole('button', { name: 'Baixar JSON' });
  fireEvent.click(button);
  fireEvent.click(button);
  await waitFor(() => expect(s.requests).toHaveLength(1));
  expect(screen.getByRole('button', { name: 'Baixar Excel' })).toBeDisabled();
  s.view.unmount();
  await act(async () => resolve(file('application/json')));
  expect(URL.createObjectURL).not.toHaveBeenCalled();
});
it('401 na exportação encerra a sessão sem afirmar encerramento da conta', async () => {
  const s = await open();
  s.read(async () => json({ code: 'account_inactive' }, 401));
  await userEvent.click(screen.getByRole('button', { name: 'Baixar JSON' }));
  await screen.findByRole('heading', { name: /^Entrar$/ });
  expect(s.session.getSnapshot().accountClosed).toBeUndefined();
  expect(
    screen.queryByText(/Conta desativada e anonimizada/),
  ).not.toBeInTheDocument();
  expect(URL.createObjectURL).not.toHaveBeenCalled();
});
it('erro de exportação não afirma recusa de encerramento que não foi solicitado', async () => {
  const s = await open();
  s.read(async () => json({}, 409));
  await userEvent.click(screen.getByRole('button', { name: 'Baixar JSON' }));
  await screen.findByRole('alert');
  expect(
    screen.queryByText('O encerramento precisa de acompanhamento'),
  ).not.toBeInTheDocument();
  expect(s.requests.every((request) => request.method === 'GET')).toBe(true);
});
it('consulta concorrente de sessão não libera mutation cujo resultado ficou desconhecido', async () => {
  const s = await open();
  let resolve: (value: Response) => void = () => {};
  s.write(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  await confirm();
  await act(async () => {
    await s.session.resume();
    resolve(json({ status: 'anonymized' }));
  });
  await screen.findByText('O resultado ainda não foi confirmado');
  expect(
    screen.getByRole('button', { name: 'Solicitar encerramento' }),
  ).toBeDisabled();
  expect(
    s.requests.filter((request) => request.method === 'DELETE'),
  ).toHaveLength(1);
  expect(s.session.getSnapshot().accountClosed).toBeUndefined();
});
