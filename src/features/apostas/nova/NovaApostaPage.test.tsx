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
import {
  createMemoryRouter,
  RouterProvider,
  useLocation,
  useParams,
} from 'react-router-dom';
import { createSession } from '../../../auth/session';
import { sessionContext } from '../../../auth/protocol';
import { ProvedorAuth } from '../../../auth/ProvedorAuth';
import { createApiClient } from '../../../api/client';
import { parseConfig } from '../../../lib/config';
import { createAccessController } from '../../acesso/controller';
import { ProvedorAcesso } from '../../acesso/ProvedorAcesso';
import { billingStatus } from '../../../../tests/fixtures/acesso';
import {
  casasManual,
  matrizManual,
  reciboManual,
  manualId,
  manualKey,
} from '../../../../tests/fixtures/manual';
import { NovaApostaPage } from './NovaApostaPage';
import { ConfirmacaoManual } from './ConfirmacaoManual';

const cleanups: Array<() => void> = [];
const json = (data: unknown, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
beforeEach(() => {
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
});
async function open(
  entry = '/aposta/nova?casa=7&apagadas=1',
  access: 'FULL_WRITE' | 'READ_ONLY' = 'FULL_WRITE',
) {
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
  let get = async (req: Request) => {
    const url = new URL(req.url);
    return url.pathname.includes('/filtros/')
      ? json(casasManual)
      : url.pathname.endsWith('/matriz')
        ? json(matrizManual)
        : json({
            ...reciboManual,
            intencao_id: url.pathname.split('/').at(-1),
          });
  };
  let post = async (req: Request) =>
    json(
      {
        ...reciboManual,
        intencao_id: new URL(req.url).pathname.split('/').at(-1),
      },
      201,
    );
  const requests: Request[] = [];
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
        return req.method === 'GET' ? get(req) : post(req);
      },
    },
  );
  function Detail() {
    const location = useLocation();
    const { chave = '' } = useParams();
    return (
      <>
        <h1>Detalhe confirmado</h1>
        <ConfirmacaoManual api={api} chave={chave} search={location.search} />
      </>
    );
  }
  const router = createMemoryRouter(
    [
      { path: '/aposta/nova', element: <NovaApostaPage client={api} /> },
      { path: '/aposta/:chave', element: <Detail /> },
    ],
    { initialEntries: [entry] },
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
  await screen.findByRole('heading', { name: 'Nova aposta' });
  const user = userEvent.setup();
  const chooseHouse = async () => {
    await user.click(screen.getByRole('button', { name: /^Casa / }));
    await waitFor(() =>
      expect(requests.some((r) => r.url.includes('/filtros/'))).toBe(true),
    );
    await user.click(await screen.findByRole('button', { name: 'Betano' }));
  };
  const fill = async () => {
    await chooseHouse();
    await user.type(screen.getByLabelText('Odd', { exact: true }), '2,35');
    await user.type(
      screen.getByLabelText('Valor em unidades', { exact: true }),
      '1,5',
    );
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Registrar aposta' }),
      ).toBeEnabled(),
    );
  };
  const writes = () => requests.filter((r) => r.method === 'POST');
  return {
    ...view,
    api,
    queries,
    router,
    session,
    user,
    fill,
    chooseHouse,
    requests,
    writes,
    setGet: (fn: typeof get) => {
      get = fn;
    },
    setPost: (fn: typeof post) => {
      post = fn;
    },
    setAccess: (value: typeof access) => {
      access = value;
    },
  };
}
it('uses a catalog, commits URL before a single POST and navigates only after confirmation', async () => {
  const ui = await open();
  await ui.fill();
  ui.setPost(async (req) => {
    const id = new URL(req.url).pathname.split('/').at(-1);
    expect(
      new URLSearchParams(ui.router.state.location.search).get(
        'manual_intencao',
      ),
    ).toBe(id);
    expect(req.headers.get('X-CSRF-Token')).toBeTruthy();
    return json({ ...reciboManual, intencao_id: id }, 201);
  });
  await ui.user.click(screen.getByRole('button', { name: 'Registrar aposta' }));
  await screen.findByRole('heading', { name: 'Detalhe confirmado' });
  await screen.findByRole('heading', { name: 'Registro manual confirmado' });
  expect(ui.writes()).toHaveLength(1);
  expect(await ui.writes()[0]!.json()).toMatchObject({
    casa: 'Betano',
    odd: 2.35,
    stake_unidades: 1.5,
    freebet: false,
    data_aposta: null,
  });
  expect(ui.router.state.location.search).toContain('casa=7&apagadas=1');
  expect(
    screen.getByRole('link', { name: 'Conferir conta na Revisão' }),
  ).toHaveAttribute('href', expect.stringContaining('revisao_item=42'));
});
it('preserves freebet face, textual details, exact commission and explicit historic account', async () => {
  const ui = await open();
  await ui.fill();
  await ui.user.click(screen.getByLabelText('Esta aposta é uma freebet'));
  await ui.user.click(screen.getByText('Evento e outros detalhes (opcional)'));
  for (const [label, value] of [
    ['Evento', 'Casa x Fora'],
    ['Descrição', 'Texto'],
    ['Mercado', 'Resultado final'],
    ['Data/hora da aposta', '15/10/2026 14:00-03:00'],
    ['Data/hora do jogo', '16/10/2026 19:00-03:00'],
    ['Comissão (R$)', '90071992547409,93'],
  ]) {
    await ui.user.type(screen.getByLabelText(label!, { exact: true }), value!);
  }
  await ui.user.click(
    screen.getByRole('button', { name: /^Conta que fez a aposta / }),
  );
  await ui.user.click(screen.getByRole('button', { name: /Principal — Ana/ }));
  await ui.user.click(screen.getByRole('button', { name: 'Registrar aposta' }));
  await screen.findByRole('heading', { name: 'Detalhe confirmado' });
  expect(await ui.writes()[0]!.json()).toMatchObject({
    freebet: true,
    stake_unidades: 1.5,
    conta_casa_id: '11',
    comissao_centavos: '9007199254740993',
    evento: 'Casa x Fora',
  });
});
it('keeps the same request after response loss, GET 404 and explicit replay', async () => {
  const ui = await open();
  await ui.fill();
  ui.setPost(async () => {
    throw new TypeError('network');
  });
  await ui.user.click(screen.getByRole('button', { name: 'Registrar aposta' }));
  await screen.findByRole('heading', {
    name: 'Confira o registro antes de continuar',
  });
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Consultar registro' }),
    ).toBeEnabled(),
  );
  ui.setGet(async () => json({ detail: 'manual_intention_not_found' }, 404));
  await ui.user.click(
    screen.getByRole('button', { name: 'Consultar registro' }),
  );
  await screen.findByText(
    'Não há confirmação visível nesta consulta. Isso não garante que o pedido foi desfeito.',
  );
  expect(ui.writes()).toHaveLength(1);
  const first = ui.writes()[0]!;
  ui.setPost(async (req) =>
    json({
      ...reciboManual,
      intencao_id: new URL(req.url).pathname.split('/').at(-1),
    }),
  );
  await ui.user.click(
    screen.getByRole('button', { name: 'Reenviar este mesmo pedido' }),
  );
  await screen.findByRole('heading', { name: 'Detalhe confirmado' });
  expect(ui.writes()).toHaveLength(2);
  expect(ui.writes()[1]!.url).toBe(first.url);
  expect(await ui.writes()[1]!.json()).toEqual(await first.json());
});
it('recovers a committed response with GET and never repeats the POST', async () => {
  const ui = await open();
  await ui.fill();
  ui.setPost(async () => {
    throw new Error('lost');
  });
  await ui.user.click(screen.getByRole('button', { name: 'Registrar aposta' }));
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Consultar registro' }),
    ).toBeEnabled(),
  );
  await ui.user.click(
    screen.getByRole('button', { name: 'Consultar registro' }),
  );
  await screen.findByRole('heading', { name: 'Detalhe confirmado' });
  expect(ui.writes()).toHaveLength(1);
});
it.each([manualId, manualId + '&manual_intencao=' + manualId, 'bad'])(
  'reload never reconstructs a body from %s',
  async (value) => {
    const ui = await open('/aposta/nova?manual_intencao=' + value);
    expect(ui.writes()).toHaveLength(0);
    expect(
      screen.getByRole('button', { name: 'Registrar aposta' }),
    ).toBeDisabled();
    if (value === manualId) {
      ui.setGet(async () =>
        json({ detail: 'manual_intention_not_found' }, 404),
      );
      await ui.user.click(
        screen.getByRole('button', { name: 'Consultar registro' }),
      );
      await screen.findByText(/Não há confirmação visível/);
      expect(
        screen.queryByRole('button', { name: 'Reenviar este mesmo pedido' }),
      ).not.toBeInTheDocument();
    } else {
      await ui.user.click(
        screen.getByRole('button', { name: 'Abrir formulário novo' }),
      );
      await waitFor(() =>
        expect(ui.router.state.location.search).not.toContain(
          'manual_intencao',
        ),
      );
    }
  },
);
it('allows receipt GET in READ_ONLY and prevents new POST', async () => {
  const ui = await open(
    '/aposta/nova?manual_intencao=' + manualId,
    'READ_ONLY',
  );
  await ui.user.click(
    screen.getByRole('button', { name: 'Consultar registro' }),
  );
  await screen.findByRole('heading', { name: 'Detalhe confirmado' });
  expect(ui.writes()).toHaveLength(0);
});
it('preserves inputs and the UUID after safe 422, mapping only local field labels', async () => {
  const ui = await open();
  await ui.fill();
  ui.setPost(async () =>
    json(
      {
        detail: 'manual_validation_invalid',
        campo: 'odd',
        efeito: 'nenhuma_gravacao_neste_pedido',
        input: 'PRIVATE',
      },
      422,
    ),
  );
  await ui.user.click(screen.getByRole('button', { name: 'Registrar aposta' }));
  await waitFor(() =>
    expect(screen.getByLabelText('Odd', { exact: true })).toBeEnabled(),
  );
  expect(screen.getByLabelText('Odd', { exact: true })).toHaveValue('2,35');
  expect(screen.queryByText('PRIVATE')).not.toBeInTheDocument();
  const id = new URLSearchParams(ui.router.state.location.search).get(
    'manual_intencao',
  );
  await ui.user.clear(screen.getByLabelText('Odd', { exact: true }));
  await ui.user.type(screen.getByLabelText('Odd', { exact: true }), '3');
  ui.setPost(async () => json({ ...reciboManual, intencao_id: id }));
  await ui.user.click(screen.getByRole('button', { name: 'Registrar aposta' }));
  await screen.findByRole('heading', { name: 'Detalhe confirmado' });
  expect(new URL(ui.writes()[1]!.url).pathname).toContain(id!);
});
it('revalidates billing before writing and preserves the form on 402', async () => {
  const ui = await open();
  await ui.fill();
  ui.setAccess('READ_ONLY');
  await ui.user.click(screen.getByRole('button', { name: 'Registrar aposta' }));
  await screen.findByRole('heading', {
    name: 'Este pedido foi bloqueado para escrita',
  });
  expect(ui.writes()).toHaveLength(0);
  expect(screen.getByLabelText('Odd', { exact: true })).toHaveValue('2,35');
});
it.each([410, 429, 503])(
  'has bounded explicit lookup recovery for %s',
  async (status) => {
    const ui = await open('/aposta/nova?manual_intencao=' + manualId);
    ui.setGet(async () =>
      json(
        {
          detail:
            status === 410
              ? 'manual_receipt_expired'
              : 'manual_creation_unavailable',
        },
        status,
        { 'Retry-After': '60' },
      ),
    );
    await ui.user.click(
      screen.getByRole('button', { name: 'Consultar registro' }),
    );
    await waitFor(() =>
      expect(ui.requests.some((r) => r.url.includes('/apostas-manuais/'))).toBe(
        true,
      ),
    );
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Consultar registro' }),
      ).toBeDisabled(),
    );
    expect(
      screen.queryByRole('button', { name: 'Reenviar este mesmo pedido' }),
    ).not.toBeInTheDocument();
    expect(ui.writes()).toHaveLength(0);
  },
);
it('does not navigate on malformed confirmation and requires lookup', async () => {
  const ui = await open();
  await ui.fill();
  ui.setPost(async () =>
    json({ ...reciboManual, aposta_chave: 'https://evil.test' }),
  );
  await ui.user.click(screen.getByRole('button', { name: 'Registrar aposta' }));
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Consultar registro' }),
    ).toBeEnabled(),
  );
  expect(ui.router.state.location.pathname).toBe('/aposta/nova');
});
it('validates local date input and requires an explicit house', async () => {
  const ui = await open();
  await ui.user.type(screen.getByLabelText('Odd', { exact: true }), '2');
  await ui.user.type(
    screen.getByLabelText('Valor em unidades', { exact: true }),
    '1',
  );
  await ui.user.click(screen.getByRole('button', { name: 'Registrar aposta' }));
  await screen.findByText('Escolha a casa da aposta.');
  await ui.chooseHouse();
  await ui.user.click(screen.getByText('Evento e outros detalhes (opcional)'));
  await ui.user.type(
    screen.getByLabelText('Data/hora do jogo', { exact: true }),
    'bad',
  );
  await ui.user.click(screen.getByRole('button', { name: 'Registrar aposta' }));
  await screen.findByText(/Informe dia\/mês\/ano, hora e fuso, como/);
  expect(ui.writes()).toHaveLength(0);
});
it('blocks simultaneous clicks and discards a late write after leaving', async () => {
  const ui = await open();
  await ui.fill();
  let complete!: (response: Response) => void;
  ui.setPost(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  const button = screen.getByRole('button', { name: 'Registrar aposta' });
  fireEvent.click(button);
  fireEvent.click(button);
  await waitFor(() => expect(ui.writes()).toHaveLength(1));
  ui.unmount();
  await act(async () => {
    complete(json(reciboManual));
  });
  expect(ui.router.state.location.pathname).toBe('/aposta/nova');
});
it('clears private form and requests on logout', async () => {
  const ui = await open();
  await ui.fill();
  await act(async () => {
    await ui.session.logout();
  });
  expect(screen.queryByDisplayValue('2,35')).not.toBeInTheDocument();
  expect(ui.writes()).toHaveLength(0);
});
it('shows matrix failure and permits an explicit safe retry', async () => {
  const ui = await open();
  ui.setGet(async (req) =>
    req.url.includes('/matriz') ? json({}, 500) : json(casasManual),
  );
  await ui.chooseHouse();
  await ui.user.click(screen.getByText('Evento e outros detalhes (opcional)'));
  await screen.findByRole('heading', {
    name: 'Não foi possível concluir o pedido',
  });
  ui.setGet(async () => json(matrizManual));
  const retry = screen.getByRole('button', {
    name: 'Tentar novamente',
  });
  await ui.user.click(retry);
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: /^Conta que fez a aposta / }),
    ).toBeEnabled(),
  );
});

it('shows an empty account matrix and keeps automatic attribution explicit', async () => {
  const ui = await open();
  ui.setGet(async (req) =>
    req.url.includes('/matriz')
      ? json({ ...matrizManual, contas: [] })
      : json(casasManual),
  );
  await ui.chooseHouse();
  await ui.user.click(screen.getByText('Evento e outros detalhes (opcional)'));
  await ui.user.click(
    await screen.findByRole('button', { name: /^Conta que fez a aposta / }),
  );
  await screen.findByText(
    'Não há contas desta casa. O registro poderá precisar de Revisão.',
  );
});
it('does not round a house BIGINT to query the legacy numeric matrix', async () => {
  const ui = await open();
  ui.setGet(async () =>
    json({
      ...casasManual,
      data: [{ id: '9007199254740993', nome: 'Betano', ativa: true }],
    }),
  );
  await act(async () => {
    await ui.queries.invalidateQueries({ queryKey: ['catalogos-apostas'] });
  });
  await ui.chooseHouse();
  await ui.user.click(screen.getByText('Evento e outros detalhes (opcional)'));
  expect(
    await screen.findByText(/As contas desta casa não estão disponíveis/),
  ).toBeVisible();
  expect(ui.requests.some((r) => r.url.includes('/matriz'))).toBe(false);
  expect(screen.queryByText('Carregando contas…')).not.toBeInTheDocument();
});
it('sends the catalog name without its presentation status suffix', async () => {
  const ui = await open();
  await ui.fill();
  ui.setGet(async (req) =>
    req.url.includes('/matriz')
      ? json(matrizManual)
      : json({
          ...casasManual,
          data: [{ id: '7', nome: 'Betano', ativa: false }],
        }),
  );
  await act(async () => {
    await ui.queries.invalidateQueries({ queryKey: ['catalogos-apostas'] });
  });
  await ui.user.click(screen.getByRole('button', { name: 'Registrar aposta' }));
  await screen.findByRole('heading', { name: 'Detalhe confirmado' });
  expect((await ui.writes()[0]!.json()).casa).toBe('Betano');
});
it('offers search/pagination and does not submit the outer form from picker search', async () => {
  const ui = await open();
  ui.setGet(async (req) => {
    if (req.url.includes('/matriz')) return json(matrizManual);
    const params = new URL(req.url).searchParams;
    return json({
      ...casasManual,
      pagination: {
        page: Number(params.get('page') ?? 1),
        page_size: 20,
        total: 40,
      },
    });
  });
  await act(async () => {
    await ui.queries.invalidateQueries({ queryKey: ['catalogos-apostas'] });
  });
  await ui.user.click(screen.getByRole('button', { name: /^Casa / }));
  await ui.user.type(screen.getByLabelText('Buscar casa'), 'Betano{Enter}');
  await waitFor(() =>
    expect(
      ui.requests.some(
        (r) => new URL(r.url).searchParams.get('q') === 'Betano',
      ),
    ).toBe(true),
  );
  await ui.user.click(
    await screen.findByRole('button', { name: 'Próximas casas' }),
  );
  await ui.user.click(
    await screen.findByRole('button', { name: 'Casas anteriores' }),
  );
  expect(ui.writes()).toHaveLength(0);
});
it('keeps the current intent locked on a server conflict until receipt lookup', async () => {
  const ui = await open();
  await ui.fill();
  ui.setPost(async () => json({ detail: 'manual_intention_conflict' }, 409));
  await ui.user.click(screen.getByRole('button', { name: 'Registrar aposta' }));
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Consultar registro' }),
    ).toBeEnabled(),
  );
  expect(screen.getByLabelText('Odd')).toBeDisabled();
  await ui.user.click(
    screen.getByRole('button', { name: 'Consultar registro' }),
  );
  await screen.findByRole('heading', { name: 'Detalhe confirmado' });
  expect(ui.writes()).toHaveLength(1);
});
it('drops a pending body when navigation changes the public identity', async () => {
  const ui = await open();
  await ui.fill();
  ui.setPost(() => new Promise<Response>(() => {}));
  await ui.user.click(screen.getByRole('button', { name: 'Registrar aposta' }));
  await waitFor(() => expect(ui.writes()).toHaveLength(1));
  await act(async () => {
    await ui.router.navigate('/aposta/nova?manual_intencao=' + manualId);
  });
  await waitFor(() =>
    expect(screen.queryByDisplayValue('2,35')).not.toBeInTheDocument(),
  );
  expect(
    screen.queryByRole('button', { name: 'Reenviar este mesmo pedido' }),
  ).not.toBeInTheDocument();
});
it.each([undefined, 'bad', manualId + '&manual_intencao=' + manualId])(
  'ignores an invalid detail confirmation reference %s',
  async (id) => {
    const ui = await open();
    const before = ui.requests.length;
    await act(async () => {
      await ui.router.navigate(
        '/aposta/' + manualKey + (id ? '?manual_intencao=' + id : ''),
      );
    });
    expect(
      screen.queryByRole('region', { name: 'Confirmação do registro manual' }),
    ).not.toBeInTheDocument();
    expect(
      ui.requests
        .slice(before)
        .some((r) => r.url.includes('/apostas-manuais/')),
    ).toBe(false);
  },
);
it('shows an original ambiguity notice without treating it as current assignment', async () => {
  const ui = await open();
  ui.setGet(async () =>
    json({
      ...reciboManual,
      avisos: [
        {
          codigo: 'conta_ambigua',
          revisao_id: '43',
          encaminhamento: 'revisar_conta',
        },
      ],
    }),
  );
  await act(async () => {
    await ui.router.navigate(
      '/aposta/' + manualKey + '?casa=7&manual_intencao=' + manualId,
    );
  });
  await screen.findByText(/Há mais de uma conta possível/);
  expect(
    screen.getByRole('link', { name: 'Conferir conta na Revisão' }),
  ).toHaveAttribute('href', expect.stringContaining('revisao_item=43'));
});
it('has an explicit confirmation GET retry, without automatic data retries', async () => {
  const ui = await open();
  ui.setGet(async () => json({}, 500));
  await act(async () => {
    await ui.router.navigate(
      '/aposta/' + manualKey + '?manual_intencao=' + manualId,
    );
  });
  await screen.findByRole('button', {
    name: 'Consultar confirmação novamente',
  });
  const calls = () =>
    ui.requests.filter((r) => r.url.includes('/apostas-manuais/')).length;
  expect(calls()).toBe(1);
  ui.setGet(async () => json({ ...reciboManual, avisos: [] }));
  await ui.user.click(
    screen.getByRole('button', { name: 'Consultar confirmação novamente' }),
  );
  await screen.findByRole('heading', { name: 'Registro manual confirmado' });
  expect(calls()).toBe(2);
});
it('does not accept a receipt belonging to another bet or reveal it', async () => {
  const ui = await open();
  await act(async () => {
    await ui.router.navigate('/aposta/another?manual_intencao=' + manualId);
  });
  await screen.findByRole('button', {
    name: 'Consultar confirmação novamente',
  });
  expect(
    screen.queryByRole('heading', { name: 'Registro manual confirmado' }),
  ).not.toBeInTheDocument();
});
it('stops and discards a late confirmation after unmount', async () => {
  const ui = await open();
  let finish!: (value: Response) => void;
  ui.setGet(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await act(async () => {
    await ui.router.navigate(
      '/aposta/' + manualKey + '?manual_intencao=' + manualId,
    );
  });
  await waitFor(() => expect(finish).toBeDefined());
  ui.unmount();
  await act(async () => {
    finish(json(reciboManual));
  });
  expect(
    screen.queryByText('Registro manual confirmado'),
  ).not.toBeInTheDocument();
});
it.each([403, 405, 410, 422])(
  'does not offer a generic confirmation retry on %s',
  async (status) => {
    const ui = await open();
    ui.setGet(async () => json({}, status));
    await act(async () => {
      await ui.router.navigate(
        '/aposta/' + manualKey + '?manual_intencao=' + manualId,
      );
    });
    await screen.findByText(/A confirmação original não está disponível/);
    expect(
      screen.queryByRole('button', { name: 'Consultar confirmação novamente' }),
    ).not.toBeInTheDocument();
  },
);
it('offers explicit consultation when an old session scope discards confirmation', async () => {
  const ui = await open();
  const captured = ui.session.capture();
  const old = vi
    .spyOn(ui.session, 'capture')
    .mockReturnValue({ ...captured, isCurrent: () => false });
  await act(async () => {
    await ui.router.navigate(
      '/aposta/' + manualKey + '?manual_intencao=' + manualId,
    );
  });
  await screen.findByText(
    'A confirmação precisa ser consultada novamente nesta sessão.',
  );
  expect(
    screen.queryByText('Registro manual confirmado'),
  ).not.toBeInTheDocument();
  old.mockRestore();
  await ui.user.click(
    screen.getByRole('button', { name: 'Consultar confirmação novamente' }),
  );
  await screen.findByRole('heading', { name: 'Registro manual confirmado' });
});
