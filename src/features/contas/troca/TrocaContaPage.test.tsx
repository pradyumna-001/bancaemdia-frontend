import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { createSession } from '../../../auth/session';
import { sessionContext } from '../../../auth/protocol';
import { ProvedorAuth } from '../../../auth/ProvedorAuth';
import { createApiClient } from '../../../api/client';
import { parseConfig } from '../../../lib/config';
import { createAccessController } from '../../acesso/controller';
import { ProvedorAcesso } from '../../acesso/ProvedorAcesso';
import { billingStatus } from '../../../../tests/fixtures/acesso';
import {
  createTrocaFixture,
  matrizTroca,
  pedidoTroca,
  previaTroca,
} from '../../../../tests/fixtures/troca';
import { useTroca } from './useTroca';
import { TrocaContaPage } from './TrocaContaPage';
import {
  conferir,
  conferirIntencao,
  instante,
  PREVIEW,
  APPLY,
  GET,
} from './protocol';

const clean: Array<() => void> = [];
const json = (value: unknown, status = 200, headers = {}) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
beforeEach(() => {
  sessionStorage.clear();
  HTMLDialogElement.prototype.showModal ??= function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close ??= function () {
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
    this.dispatchEvent(new Event('close'));
  });
});
afterEach(() => {
  clean.splice(0).forEach((f) => f());
  vi.restoreAllMocks();
});
async function open(
  options: {
    page?: boolean;
    readOnly?: boolean;
    initial?: string;
    key?: string;
    beforeBilling?: (count: number) => Promise<void>;
    override?: (
      r: Request,
    ) => Promise<Response | undefined> | Response | undefined;
  } = {},
) {
  const queries = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  let ctx = sessionContext({
    usuario_id: 1,
    nome: 'Teste',
    email: 'test@example.org',
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
      read: async () => ctx,
      renew: async () => ctx,
      logout: async () => {},
    },
    exclusive: async (_s, work) => work(),
  });
  await session.resume();
  const controller = createAccessController(session, queries);
  const api = createTrocaFixture();
  const requests: Request[] = [];
  let billingCount = 0;
  const client = createApiClient(
    parseConfig({ VITE_API_URL: 'http://127.0.0.1:8000' }),
    {
      captureSession: session.capture,
      fetcher: async (req) => {
        requests.push(req.clone());
        const url = new URL(req.url);
        if (url.pathname === '/api/v1/billing/status') {
          await options.beforeBilling?.(++billingCount);
          return json({
            ...billingStatus,
            access: options.readOnly ? 'READ_ONLY' : 'FULL_WRITE',
          });
        }
        const custom = await options.override?.(req);
        if (custom) return custom;
        if (url.pathname.startsWith('/api/v1/filtros/'))
          return json({
            dimensao: 'casas',
            data: [{ id: '7', nome: 'Betano', ativa: true }],
            pagination: { page: 1, page_size: 20, total: 1 },
          });
        const value = api.handle(
          req.method,
          url,
          req.headers.get('Idempotency-Key') ?? '',
          req.method === 'POST' ? await req.json() : undefined,
        );
        return value
          ? json(value)
          : json({ detail: 'swap_intention_unknown' }, 404);
      },
    },
  );
  let hook: ReturnType<typeof useTroca>;
  function Harness() {
    hook = useTroca(client);
    return <p>Harness</p>;
  }
  const router = createMemoryRouter(
    [
      {
        path: '*',
        element: options.page ? (
          <TrocaContaPage client={client} />
        ) : (
          <Harness />
        ),
      },
    ],
    { initialEntries: [options.initial ?? '/contas/trocar?casa=7&apagadas=1'] },
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
  clean.push(() => {
    view.unmount();
    router.dispose();
    controller.dispose();
    session.dispose();
    queries.clear();
  });
  await waitFor(() =>
    expect(queries.getQueryState(controller.key())?.status).toBe('success'),
  );
  if (options.key) {
    if (options.page) {
      fireEvent.click(
        screen.getByText('Consultar uma troca anterior', { exact: true }),
      );
      fireEvent.change(screen.getByLabelText('Código de consulta anterior'), {
        target: { value: options.key },
      });
      fireEvent.click(
        screen.getByRole('button', { name: 'Usar código para consulta' }),
      );
    } else act(() => hook!.recover(options.key!));
  }
  return {
    get hook() {
      return hook!;
    },
    requests,
    rotate: async () => {
      ctx = { ...ctx, version: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa:2' };
      await session.resume();
    },
    session,
    queries,
    router,
    view,
    api,
  };
}
const writes = (r: Request[]) => r.filter((r) => r.method === 'POST');

it('validates the published preview, receipt and intent without deriving financial values', () => {
  expect(instante('2026-10-01', '14:30', '-03:00')).toBe(
    pedidoTroca.efetiva_em,
  );
  expect(instante('2026-10-01', '14:30:15', '+00:00')).toContain(':15+00:00');
  for (const [d, t, z] of [
    ['2026-02-30', '14:30', '-03:00'],
    ['2026-10-01', '24:00', '-03:00'],
    ['2026-10-01', '14:30', 'Z'],
  ])
    expect(() => instante(d!, t!, z!)).toThrow();
  expect(conferir(previaTroca, pedidoTroca, false)).toEqual(previaTroca);
  expect(
    conferir(
      { ...previaTroca, efetiva_em: '2026-10-01T17:30:00Z' },
      pedidoTroca,
      false,
    ),
  ).toBeTruthy();
  const applied = { ...previaTroca, aplicada: true };
  const intent = {
    estado: 'APPLIED' as const,
    previa: previaTroca,
    previa_expira_em: '2026-10-02T17:30:00Z',
    recibo: applied,
  };
  expect(conferirIntencao(intent)).toEqual(intent);
  expect(
    conferirIntencao({ ...intent, estado: 'EXPIRED', recibo: null }),
  ).toBeTruthy();
  for (const value of [
    undefined,
    { ...previaTroca, aplicada: true },
    { ...previaTroca, casa_id: -1 },
    { ...previaTroca, conta_destino_id: 11 },
    { ...previaTroca, apostas_afetadas_ids: [1, 1] },
    { ...previaTroca, casa_id: 8 },
    { ...previaTroca, conta_origem_id: 1 },
    { ...previaTroca, conta_destino_id: 2 },
    { ...previaTroca, estado_origem: 'ENCERRADA' as const },
    { ...previaTroca, efetiva_em: '2026-10-02T17:30:00Z' },
  ])
    expect(() => conferir(value, pedidoTroca, false)).toThrow();
  expect(() => conferirIntencao({ ...intent, recibo: null })).toThrow();
  expect(() => conferirIntencao({ ...intent, estado: 'PREVIEW' })).toThrow();
});

it('sends one preview and separate confirmation with the same immutable identity/body', async () => {
  const h = await open();
  const body = { ...pedidoTroca };
  await act(async () => {
    await Promise.all([h.hook.preview(body), h.hook.preview(body)]);
  });
  body.conta_destino_id = 999;
  expect(writes(h.requests)).toHaveLength(1);
  expect(h.hook.state.preview).toEqual(previaTroca);
  expect(h.hook.state.receipt).toBeUndefined();
  const key = h.hook.state.id;
  expect(sessionStorage.length).toBe(0);
  await act(async () => {
    await h.hook.apply();
  });
  expect(h.hook.state.receipt?.aplicada).toBe(true);
  const sent = writes(h.requests);
  expect(sent.map((r) => r.headers.get('Idempotency-Key'))).toEqual([key, key]);
  expect(await sent[1]!.json()).toEqual(pedidoTroca);
  expect(sent.every((r) => !r.url.includes(key!))).toBe(true);
  await act(async () => {
    await h.hook.apply();
    await h.hook.resendPreview();
  });
  expect(writes(h.requests)).toHaveLength(2);
  act(() => h.hook.reset());
  expect(h.hook.state).toEqual({});
  expect(sessionStorage.getItem('bancaemdia:troca:1')).toBeNull();
});

it('lost committed response is recovered by GET, with no automatic mutation replay', async () => {
  let lost = true;
  const h = await open({
    override: async (req) => {
      if (new URL(req.url).pathname === APPLY && lost) {
        lost = false;
        throw new TypeError('disconnected');
      }
      if (new URL(req.url).pathname === GET)
        return json({
          estado: 'APPLIED',
          previa: previaTroca,
          previa_expira_em: '2030-01-01T00:00:00Z',
          recibo: { ...previaTroca, aplicada: true },
        });
    },
  });
  await act(async () => {
    await h.hook.preview(pedidoTroca);
    await h.hook.apply();
  });
  expect(h.hook.state.uncertain).toBe(true);
  act(() => h.hook.reset());
  await act(async () => {
    await h.hook.apply();
    await h.hook.preview(pedidoTroca);
  });
  expect(writes(h.requests)).toHaveLength(2);
  await act(async () => {
    await h.hook.consult();
  });
  expect(h.hook.state.receipt?.aplicada).toBe(true);
  expect(writes(h.requests)).toHaveLength(2);
});

it('unknown outcome permits only an explicit replay of the original body after consultation', async () => {
  let lost = true;
  const h = await open({
    override: (req) => {
      if (new URL(req.url).pathname === APPLY && lost) {
        lost = false;
        return json({}, 503);
      }
    },
  });
  await act(async () => {
    await h.hook.preview(pedidoTroca);
    await h.hook.apply();
  });
  await act(async () => {
    await h.hook.consult();
  });
  expect(h.hook.state.uncertain).toBe(true);
  expect(h.hook.state.consulted).toBe(true);
  expect(h.hook.state.receipt).toBeUndefined();
  await act(async () => {
    await h.hook.apply();
  });
  const sent = writes(h.requests);
  expect(sent).toHaveLength(3);
  expect(sent[2]!.headers.get('Idempotency-Key')).toBe(
    sent[1]!.headers.get('Idempotency-Key'),
  );
  expect(await sent[2]!.json()).toEqual(await sent[1]!.json());
  expect(h.hook.state.receipt?.aplicada).toBe(true);
});

it.each([
  [409, 'swap_preview_stale'],
  [410, 'swap_preview_expired'],
  [409, 'swap_invalid'],
  [422, 'swap_invalid_request'],
] as const)(
  'refusal %s/%s requires a fresh preview and confirmation',
  async (status, code) => {
    const h = await open({
      override: (req) =>
        new URL(req.url).pathname === APPLY
          ? json({ detail: code }, status)
          : undefined,
    });
    await act(async () => {
      await h.hook.preview(pedidoTroca);
      await h.hook.apply();
    });
    expect(h.hook.state.renewable).toBe(true);
    expect(h.hook.state.receipt).toBeUndefined();
    await act(async () => {
      await h.hook.consult();
    });
    expect(h.hook.state.renewable).toBe(true);
    const key = h.hook.state.id;
    act(() => h.hook.reset());
    await act(async () => {
      await h.hook.preview(pedidoTroca);
    });
    expect(h.hook.state.id).not.toBe(key);
    expect(h.hook.state.confirmed).toBeUndefined();
  },
);

it('404 after a lost preview is not rollback and permits only the same explicit preview replay', async () => {
  let lost = true;
  const h = await open({
    override: (req) => {
      if (new URL(req.url).pathname === PREVIEW && lost) {
        lost = false;
        return json({}, 500);
      }
    },
  });
  await act(async () => {
    await h.hook.preview(pedidoTroca);
  });
  const key = h.hook.state.id;
  await act(async () => {
    await h.hook.resendPreview();
  });
  expect(writes(h.requests)).toHaveLength(1);
  await act(async () => {
    await h.hook.consult();
  });
  expect(h.hook.state.uncertain).toBe(true);
  act(() => h.hook.reset());
  expect(h.hook.state.id).toBe(key);
  await act(async () => {
    await h.hook.resendPreview();
  });
  expect(h.hook.state.preview).toEqual(previaTroca);
  expect(writes(h.requests)).toHaveLength(2);
  expect(writes(h.requests)[1]!.headers.get('Idempotency-Key')).toBe(key);
});

it('manually supplied identity supports READ_ONLY receipt lookup without reconstructing the body', async () => {
  const key = crypto.randomUUID();
  const h = await open({
    key,
    readOnly: true,
    override: (req) =>
      new URL(req.url).pathname === GET
        ? json({
            estado: 'APPLIED',
            previa: previaTroca,
            previa_expira_em: '2030-01-01T00:00:00Z',
            recibo: { ...previaTroca, aplicada: true },
          })
        : undefined,
  });
  act(() => h.hook.recover(key));
  expect(h.hook.state).toEqual({ id: key });
  await act(async () => {
    await h.hook.apply();
    await h.hook.preview(pedidoTroca);
    await h.hook.consult();
  });
  expect(writes(h.requests)).toHaveLength(0);
  expect(h.hook.state.body).toBeUndefined();
  expect(h.hook.state.receipt?.aplicada).toBe(true);
  h.view.unmount();
  act(() => h.session.accountClosed());
  expect(sessionStorage.getItem('bancaemdia:troca:1')).toBeNull();
});

it('the intention stays in memory even when storage is unavailable and session cleanup removes it', async () => {
  const h = await open();
  const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  await act(async () => {
    await h.hook.preview(pedidoTroca);
  });
  expect(h.hook.state.preview).toBeTruthy();
  expect(set).not.toHaveBeenCalled();
  act(() => h.session.accountClosed());
  expect(h.hook.state).toEqual({});
});

it('invalid mutation response remains unknown and an unmounted component discards late replies', async () => {
  const h = await open({
    override: (req) =>
      new URL(req.url).pathname === PREVIEW
        ? json({ ...previaTroca, aplicada: true })
        : undefined,
  });
  await act(async () => {
    await h.hook.preview(pedidoTroca);
  });
  expect(h.hook.state.uncertain).toBe(true);
  h.view.unmount();
  const second = await open({
    override: async (req) => {
      if (new URL(req.url).pathname === PREVIEW) {
        await new Promise((r) => setTimeout(r, 20));
        return json(previaTroca);
      }
    },
  });
  let promise: Promise<void>;
  act(() => {
    promise = second.hook.preview(pedidoTroca);
  });
  second.view.unmount();
  await act(async () => {
    await promise!;
  });
  expect(second.hook.state.receipt).toBeUndefined();
});

async function choose(label: string, option: string) {
  fireEvent.click(
    screen.getByRole('button', { name: new RegExp('^' + label + ' ') }),
  );
  const dialog = screen.getByRole('dialog', { name: label });
  fireEvent.click(within(dialog).getByRole('button', { name: option }));
}
async function form() {
  await screen.findByRole('heading', { name: '2. Prepare a troca' });
  await choose('Conta anterior', 'Conta principal · Marina');
  await choose('Nova conta', 'Conta reserva · Rafael');
  fireEvent.click(screen.getByRole('button', { name: /^Data da troca / }));
  fireEvent.click(
    within(screen.getByRole('dialog', { name: 'Data da troca' }))
      .getAllByRole('button', { name: /de/ })
      .find((b) => b.hasAttribute('data-dia'))!,
  );
  fireEvent.change(screen.getByLabelText('Hora da troca'), {
    target: { value: '14:30' },
  });
  await choose('Estado final da conta anterior', 'Limitada');
}
it('page presents explicit selection, retained filters, separate confirmation and temporal consequences', async () => {
  const h = await open({ page: true });
  await form();
  expect(
    screen.getByRole('link', { name: 'Contas e titulares' }),
  ).toHaveAttribute('href', '/contas?casa=7&apagadas=1');
  fireEvent.click(
    screen.getByRole('button', { name: 'Consultar prévia da troca' }),
  );
  await screen.findByRole('heading', { name: '3. Confira a prévia' });
  expect(writes(h.requests)).toHaveLength(1);
  expect(
    screen.getAllByText('3 apostas para conferir a atribuição')[0],
  ).toBeVisible();
  const trigger = screen.getByRole('button', {
    name: 'Continuar para confirmação',
  });
  fireEvent.click(trigger);
  const dialog = screen.getByRole('dialog', { name: 'Confirmar esta troca?' });
  expect(dialog).toBeVisible();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Agora não' }));
  expect(trigger).toHaveFocus();
  fireEvent.click(trigger);
  fireEvent.click(
    within(dialog).getByRole('button', {
      name: 'Confirmar troca',
    }),
  );
  await screen.findByRole('heading', { name: 'Troca confirmada' });
  expect(writes(h.requests)).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: 'Preparar outra troca' }));
  await screen.findByRole('heading', { name: '2. Prepare a troca' });
  expect(
    screen.getByRole('button', { name: 'Consultar prévia da troca' }),
  ).toBeDisabled();
});

it('page keeps a read-only recovered identity consultable without reconstructing the body', async () => {
  const h = await open({
    page: true,
    readOnly: true,
    key: crypto.randomUUID(),
  });
  await screen.findByText(/Os dados do pedido saíram da memória/);
  fireEvent.click(
    screen.getByRole('button', {
      name: 'Consultar resultado da mesma intenção',
    }),
  );
  await screen.findByText(/Nenhum recibo de aplicação foi confirmado/);
  expect(writes(h.requests)).toHaveLength(0);
  expect(
    screen.queryByRole('button', { name: 'Confirmar troca' }),
  ).not.toBeInTheDocument();
});

it('page provides actionable empty and invalid matrix states', async () => {
  await open({
    page: true,
    override: (req) =>
      req.url.includes('/matriz')
        ? json({ ...matrizTroca, contas: [] })
        : undefined,
  });
  await screen.findByText(/Esta casa precisa de uma conta em uso/);
});

it('page validates time without writing, makes closure explicit and allows editing an unconfirmed preview', async () => {
  const h = await open({
    page: true,
    override: async (req) =>
      new URL(req.url).pathname === PREVIEW
        ? json({
            ...(await req.json()),
            aplicada: false,
            apostas_afetadas_ids: [],
          })
        : undefined,
  });
  await form();
  await choose('Estado final da conta anterior', 'Encerrada');
  expect(screen.getByText(/Encerrar preserva o histórico/)).toBeVisible();
  await choose('Fuso da hora informada', 'UTC +00:00');
  fireEvent.change(screen.getByLabelText('Hora da troca'), {
    target: { value: '25:00' },
  });
  fireEvent.click(
    screen.getByRole('button', { name: 'Consultar prévia da troca' }),
  );
  expect(
    screen.getByText(/Confira a data, a hora e o deslocamento/),
  ).toBeVisible();
  expect(writes(h.requests)).toHaveLength(0);
  fireEvent.change(screen.getByLabelText('Hora da troca'), {
    target: { value: '14:30' },
  });
  fireEvent.click(
    screen.getByRole('button', { name: 'Consultar prévia da troca' }),
  );
  await screen.findByRole('heading', { name: '3. Confira a prévia' });
  expect(
    screen.getAllByText(/Nenhuma aposta existente indicada/)[0],
  ).toBeVisible();
  fireEvent.click(
    screen.getByRole('button', { name: 'Alterar dados da troca' }),
  );
  await screen.findByRole('heading', { name: '2. Prepare a troca' });
  await choose('Casa da troca', 'Sem filtro');
  await screen.findByText(
    'Escolha uma casa para consultar as contas elegíveis.',
  );
  expect(h.router.state.location.search).toBe('?apagadas=1');
  await choose('Casa da troca', 'Betano');
  await screen.findByRole('heading', { name: '2. Prepare a troca' });
});

it('page offers explicit same-preview resend after a failed attempt and consultation', async () => {
  let failed = true;
  const h = await open({
    page: true,
    override: (req) => {
      if (new URL(req.url).pathname === PREVIEW && failed) {
        failed = false;
        return json({}, 500);
      }
    },
  });
  await form();
  fireEvent.click(
    screen.getByRole('button', { name: 'Consultar prévia da troca' }),
  );
  await screen.findByText(/O resultado deste pedido ainda não foi confirmado/);
  fireEvent.click(
    screen.getByRole('button', {
      name: 'Consultar resultado da mesma intenção',
    }),
  );
  await screen.findByRole('button', { name: 'Reenviar a mesma prévia' });
  fireEvent.click(
    screen.getByRole('button', { name: 'Reenviar a mesma prévia' }),
  );
  await screen.findByRole('heading', { name: '3. Confira a prévia' });
  expect(writes(h.requests)).toHaveLength(2);
});

it('page restores a manually supplied lookup code and copies only after a gesture', async () => {
  const h = await open({
    page: true,
    initial: '/contas/trocar?casa=invalid&desde=wrong&apagadas=1',
  });
  expect(
    screen.getByText(/Parâmetros inválidos foram ignorados/),
  ).toBeVisible();
  fireEvent.click(
    screen.getByText('Consultar uma troca anterior', { exact: true }),
  );
  const key = crypto.randomUUID();
  fireEvent.change(screen.getByLabelText('Código de consulta anterior'), {
    target: { value: key },
  });
  fireEvent.click(
    screen.getByRole('button', { name: 'Usar código para consulta' }),
  );
  await screen.findByText(/Os dados do pedido saíram da memória/);
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
  fireEvent.click(screen.getByText('Código de consulta', { exact: true }));
  expect(writeText).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole('button', { name: 'Copiar código de consulta' }),
  );
  await screen.findByText('Código copiado.');
  expect(writeText).toHaveBeenCalledWith(key);
  writeText.mockRejectedValueOnce(new Error('denied'));
  fireEvent.click(
    screen.getByRole('button', { name: 'Copiar código de consulta' }),
  );
  await screen.findByText(/Não foi possível copiar/);
  expect(writes(h.requests)).toHaveLength(0);
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: undefined,
  });
});

it('page keeps the original form after a stale confirmation and requests a new preview', async () => {
  await open({
    page: true,
    override: (req) =>
      new URL(req.url).pathname === APPLY
        ? json({ detail: 'swap_preview_stale' }, 409)
        : undefined,
  });
  await form();
  fireEvent.click(
    screen.getByRole('button', { name: 'Consultar prévia da troca' }),
  );
  await screen.findByRole('heading', { name: '3. Confira a prévia' });
  fireEvent.click(
    screen.getByRole('button', { name: 'Continuar para confirmação' }),
  );
  fireEvent.click(
    within(
      screen.getByRole('dialog', { name: 'Confirmar esta troca?' }),
    ).getByRole('button', { name: 'Confirmar troca' }),
  );
  await screen.findByText(/A prévia não pode ser confirmada/);
  fireEvent.click(screen.getByRole('button', { name: 'Preparar outra troca' }));
  await screen.findByRole('heading', { name: '2. Prepare a troca' });
  expect(screen.getByLabelText('Hora da troca')).toHaveValue('14:30');
});

it('matrix refusal remains actionable and never silently substitutes another house', async () => {
  const h = await open({
    page: true,
    override: (req) =>
      req.url.includes('/matriz')
        ? json({ ...matrizTroca, casa_id: 8 })
        : undefined,
  });
  await screen.findByRole('region', { name: /Contas elegíveis/ });
  expect(
    screen.queryByRole('heading', { name: '2. Prepare a troca' }),
  ).not.toBeInTheDocument();
  expect(h.router.state.location.search).toBe('?casa=7&apagadas=1');
});

it('lookup displays the receipt house explicitly even when the preserved filter names another house', async () => {
  const h = await open({
    page: true,
    initial: '/contas/trocar?casa=8&apagadas=1',
    key: crypto.randomUUID(),
    readOnly: true,
    override: (req) =>
      new URL(req.url).pathname === GET
        ? json({
            estado: 'APPLIED',
            previa: previaTroca,
            previa_expira_em: '2030-01-01T00:00:00Z',
            recibo: { ...previaTroca, aplicada: true },
          })
        : undefined,
  });
  fireEvent.click(
    screen.getByRole('button', {
      name: 'Consultar resultado da mesma intenção',
    }),
  );
  await screen.findByRole('heading', { name: 'Troca confirmada' });
  const region = screen.getByRole('region', { name: 'Troca confirmada' });
  expect(within(region).getByText('Casa 7')).toBeVisible();
  expect(within(region).getByText('Conta 11')).toBeVisible();
  expect(h.router.state.location.search).toBe('?casa=8&apagadas=1');
});

it('a refused preview preserves the visible form and never queues a write after payment', async () => {
  const h = await open({
    page: true,
    override: (req) =>
      new URL(req.url).pathname === PREVIEW
        ? json({ detail: 'account_read_only' }, 402)
        : undefined,
  });
  await form();
  fireEvent.click(
    screen.getByRole('button', { name: 'Consultar prévia da troca' }),
  );
  await screen.findByRole('heading', {
    name: 'Este pedido foi bloqueado para escrita',
  });
  expect(
    screen.getByRole('heading', { name: '2. Prepare a troca' }),
  ).toBeVisible();
  expect(screen.getByLabelText('Hora da troca')).toHaveValue('14:30');
  expect(writes(h.requests)).toHaveLength(1);
  expect(
    screen.queryByRole('heading', { name: '3. Confira a prévia' }),
  ).not.toBeInTheDocument();
});

it('a session refresh during access validation discards the unsent identity and preserves a new explicit gesture', async () => {
  let start!: () => void;
  let release!: () => void;
  const started = new Promise<void>((resolve) => {
    start = resolve;
  });
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  const h = await open({
    beforeBilling: async (n) => {
      if (n === 2) {
        start();
        await blocked;
      }
    },
  });
  const epoch = h.session.getSnapshot().privateEpoch;
  let pending!: Promise<void>;
  act(() => {
    pending = h.hook.preview(pedidoTroca);
  });
  await act(async () => {
    await started;
    await h.rotate();
    release();
    await pending;
  });
  expect(h.session.getSnapshot().privateEpoch).toBe(epoch);
  expect(writes(h.requests)).toHaveLength(0);
  expect(h.hook.state).toEqual({});
  await waitFor(() => expect(h.hook.canPreview).toBe(true));
  await act(async () => {
    await h.hook.preview(pedidoTroca);
  });
  expect(writes(h.requests)).toHaveLength(1);
  expect(h.hook.state.preview).toBeTruthy();
});
