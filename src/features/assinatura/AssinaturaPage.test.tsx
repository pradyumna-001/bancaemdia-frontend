import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { createSession } from '../../auth/session';
import { sessionContext } from '../../auth/protocol';
import { ProvedorAuth } from '../../auth/ProvedorAuth';
import { createApiClient } from '../../api/client';
import { parseConfig } from '../../lib/config';
import { createAccessController } from '../acesso/controller';
import { ProvedorAcesso } from '../acesso/ProvedorAcesso';
import { AssinaturaPage } from './AssinaturaPage';
import { billingStatus } from '../../../tests/fixtures/acesso';
import type { Subscription } from './protocol';

const initial: Subscription = {
  ...billingStatus,
  status: 'AWAITING_CARD',
  access: 'READ_ONLY',
  trial_confirmed: false,
  trial_started_at: null,
  trial_ends_at: null,
  checkout_available: true,
  prices: [
    { id: 1, amount_minor: 12345, currency: 'BRL', frequency: 'MONTHLY' },
    { id: 2, amount_minor: 50000, currency: 'JPY', frequency: 'YEARLY' },
  ],
};
const cleanup: Array<() => void> = [];
afterEach(() => {
  cleanup.splice(0).forEach((fn) => fn());
  sessionStorage.clear();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
async function open(
  data: Subscription = initial,
  options: {
    returning?: boolean;
    go?: (url: string) => void;
    status?: number;
  } = {},
) {
  const queries = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const session = createSession({
    baseUrl: 'http://127.0.0.1:8000',
    queryClient: queries,
    transport: {
      read: async () =>
        sessionContext({
          usuario_id: 1,
          nome: 'Teste',
          email: 'sandbox@example.org',
          session_version: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa:1',
          csrf_token: crypto.randomUUID(),
          refresh_required: false,
          access_expires_at: '2030-01-01T00:00:00Z',
          session_expires_at: '2030-01-02T00:00:00Z',
        }),
      renew: vi.fn(),
      logout: async () => {},
    },
    exclusive: async (_signal, work) => work(),
  });
  await session.resume();
  const controller = createAccessController(session, queries);
  let status = options.status ?? 200;
  let body: unknown = data;
  let post: (request: Request) => Promise<Response> = async (request) =>
    new Response(
      JSON.stringify({
        url: new URL(request.url).pathname.endsWith('portal')
          ? 'https://billing.stripe.com/p/session/test'
          : 'https://checkout.stripe.com/c/pay/test',
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  const fetcher = vi.fn(async (request: Request) =>
    request.method === 'GET'
      ? new Response(JSON.stringify(body), {
          status,
          headers: { 'Content-Type': 'application/json' },
        })
      : post(request),
  );
  const client = createApiClient(
    parseConfig({ VITE_API_URL: 'http://127.0.0.1:8000' }),
    {
      fetcher,
      captureSession: session.capture,
      onUnauthorized: session.unauthorized,
    },
  );
  const go = options.go ?? vi.fn();
  render(
    <ProvedorAuth service={session}>
      <QueryClientProvider client={queries}>
        <ProvedorAcesso controller={controller} client={client}>
          <MemoryRouter
            initialEntries={['/assinatura?casa=7&apagadas=1#secao']}
          >
            <AssinaturaPage
              client={client}
              go={go}
              returning={options.returning}
            />
          </MemoryRouter>
        </ProvedorAcesso>
      </QueryClientProvider>
    </ProvedorAuth>,
  );
  cleanup.push(() => {
    controller.dispose();
    session.dispose();
    queries.clear();
  });
  await waitFor(() => expect(fetcher).toHaveBeenCalled());
  return {
    session,
    fetcher,
    go,
    reply: (value: unknown, code = 200) => {
      body = value;
      status = code;
    },
    post: (handler: typeof post) => {
      post = handler;
    },
  };
}
it('preços exatos do servidor e checkout explícito; um POST com prova e chave estável', async () => {
  const s = await open();
  const user = userEvent.setup();
  expect(
    await screen.findByText('Confirmação do cartão pendente'),
  ).toBeVisible();
  expect(
    screen.getByRole('button', { name: 'Continuar para assinatura' }),
  ).toBeDisabled();
  await user.click(screen.getByRole('radio', { name: 'R$ 123,45 por mês' }));
  await user.click(
    screen.getByRole('button', { name: 'Continuar para assinatura' }),
  );
  expect(s.go).toHaveBeenCalledWith('https://checkout.stripe.com/c/pay/test');
  const posts = s.fetcher.mock.calls
    .map(([r]) => r)
    .filter((r) => r.method === 'POST');
  expect(posts).toHaveLength(1);
  expect(await posts[0]!.clone().json()).toEqual({
    currency: 'BRL',
    frequency: 'MONTHLY',
  });
  expect(posts[0]!.headers.get('Idempotency-Key')).toMatch(/^[\w-]{8,128}$/);
  expect(posts[0]!.headers.get('X-CSRF-Token')).toBeTruthy();
  expect(sessionStorage.getItem('bancaemdia:retorno-assinatura')).toContain(
    '/assinatura?casa=7&apagadas=1#secao',
  );
  expect(sessionStorage.getItem('bancaemdia:retorno-assinatura')).not.toContain(
    'stripe',
  );
});
it.each([
  'TRIALING',
  'ACTIVE',
  'PAST_DUE',
  'CANCELED',
  'EXPIRED',
  null,
] as const)(
  'mostra o estado %s sem decidir acesso por status/data',
  async (status) => {
    await open({
      ...initial,
      status,
      access: 'FULL_WRITE',
      checkout_available: false,
      prices: [],
    });
    expect(
      await screen.findByText(
        'O serviço permite consultar, enviar e alterar dados.',
      ),
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Voltar para Apostas' }),
    ).toHaveAttribute('href', '/?casa=7&apagadas=1');
    expect(
      screen.queryByRole('button', { name: 'Continuar para assinatura' }),
    ).toBeNull();
  },
);
it('portal não exige FULL_WRITE; cancelamento pede confirmação e consulta estado real', async () => {
  const s = await open({ ...initial, status: 'ACTIVE', can_manage: true });
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole('button', { name: 'Abrir gestão da assinatura' }),
  );
  expect(s.go).toHaveBeenCalledWith(
    'https://billing.stripe.com/p/session/test',
  );
  await user.click(
    screen.getByRole('button', { name: 'Solicitar cancelamento' }),
  );
  expect(
    screen.getByRole('button', { name: 'Confirmar cancelamento' }),
  ).toHaveFocus();
  await user.click(screen.getByRole('button', { name: 'Manter assinatura' }));
  expect(
    screen.getByRole('button', { name: 'Solicitar cancelamento' }),
  ).toHaveFocus();
  s.post(async () => {
    s.reply({
      ...initial,
      status: 'ACTIVE',
      can_manage: true,
      cancel_at_period_end: true,
    });
    return new Response(JSON.stringify({ status: 'cancellation_scheduled' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  });
  await user.click(
    screen.getByRole('button', { name: 'Solicitar cancelamento' }),
  );
  await user.click(
    screen.getByRole('button', { name: 'Confirmar cancelamento' }),
  );
  expect(
    await screen.findByText('Cancelamento agendado pelo serviço.'),
  ).toBeVisible();
  expect(
    screen.queryByRole('button', { name: 'Solicitar cancelamento' }),
  ).toBeNull();
});
it('409/reconciliação preserva preço e bloqueia reenvio, permitindo somente consulta', async () => {
  const s = await open();
  s.post(
    async () =>
      new Response(
        JSON.stringify({
          detail: 'billing_reconciliation_required private secret',
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } },
      ),
  );
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole('radio', { name: 'R$ 123,45 por mês' }),
  );
  await user.click(
    screen.getByRole('button', { name: 'Continuar para assinatura' }),
  );
  expect(
    await screen.findByRole('heading', {
      name: 'Este pedido precisa de revisão',
    }),
  ).toBeVisible();
  expect(
    screen.getByRole('radio', { name: 'R$ 123,45 por mês' }),
  ).toBeChecked();
  expect(
    screen.getByRole('button', { name: 'Continuar para assinatura' }),
  ).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Conferir resultado' }));
  expect(
    s.fetcher.mock.calls.filter(([r]) => r.method === 'POST'),
  ).toHaveLength(1);
  expect(document.body.textContent).not.toContain('private secret');
});
it.each(['invalid-url', 'invalid-body', 'network', 'navigation'])(
  'resposta incerta %s não navega nem repete',
  async (kind) => {
    const go = vi.fn(() => {
      if (kind === 'navigation') throw new Error('private secret');
    });
    const s = await open(initial, { go });
    s.post(async () => {
      if (kind === 'network') throw new Error('private secret');
      return new Response(
        JSON.stringify(
          kind === 'invalid-body'
            ? {}
            : {
                url:
                  kind === 'invalid-url'
                    ? 'https://evil.example/private'
                    : 'https://checkout.stripe.com/c/pay/test',
              },
        ),
        { headers: { 'Content-Type': 'application/json' } },
      );
    });
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole('radio', { name: 'R$ 123,45 por mês' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Continuar para assinatura' }),
    );
    await screen.findByRole('heading', {
      name: 'Confira se o pedido foi concluído',
    });
    expect(
      screen.getByRole('button', { name: 'Continuar para assinatura' }),
    ).toBeDisabled();
    expect(document.body.textContent).not.toContain('private secret');
    if (kind !== 'navigation') expect(go).not.toHaveBeenCalled();
  },
);
it('logout enquanto prepara checkout impede redirecionamento tardio', async () => {
  const s = await open();
  let finish!: (response: Response) => void;
  s.post(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole('radio', { name: 'R$ 123,45 por mês' }),
  );
  await user.click(
    screen.getByRole('button', { name: 'Continuar para assinatura' }),
  );
  await act(async () => {
    await s.session.logout();
    finish(
      new Response(
        JSON.stringify({ url: 'https://checkout.stripe.com/c/pay/test' }),
      ),
    );
  });
  expect(s.go).not.toHaveBeenCalled();
});
it('recusa definitiva permite revisar o preço e inicia outra intenção explícita', async () => {
  const s = await open();
  const user = userEvent.setup();
  s.post(
    async () =>
      new Response(JSON.stringify({ detail: [] }), {
        status: 422,
        headers: { 'Content-Type': 'application/json' },
      }),
  );
  await user.click(
    await screen.findByRole('radio', { name: 'R$ 123,45 por mês' }),
  );
  await user.click(
    screen.getByRole('button', { name: 'Continuar para assinatura' }),
  );
  await screen.findByRole('heading', { name: 'Confira os dados do pedido' });
  const first = s.fetcher.mock.calls.find(([r]) => r.method === 'POST')![0];
  expect(screen.getAllByRole('radio')[1]).toBeEnabled();
  await user.click(screen.getAllByRole('radio')[1]!);
  s.post(
    async () =>
      new Response(
        JSON.stringify({ url: 'https://checkout.stripe.com/c/pay/test' }),
        { headers: { 'Content-Type': 'application/json' } },
      ),
  );
  await user.click(
    screen.getByRole('button', { name: 'Continuar para assinatura' }),
  );
  const last = s.fetcher.mock.calls.filter(([r]) => r.method === 'POST')[1]![0];
  expect(await last.clone().json()).toEqual({
    currency: 'JPY',
    frequency: 'YEARLY',
  });
  expect(last.headers.get('Idempotency-Key')).not.toBe(
    first.headers.get('Idempotency-Key'),
  );
});
it('não afirma cancelamento com resposta inválida e mantém portal independente', async () => {
  const s = await open({
    ...initial,
    status: 'ACTIVE',
    can_manage: true,
    price_id: 1,
  });
  s.post(
    async () =>
      new Response(JSON.stringify({ status: 'unknown' }), {
        headers: { 'Content-Type': 'application/json' },
      }),
  );
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole('button', { name: 'Solicitar cancelamento' }),
  );
  await user.click(
    screen.getByRole('button', { name: 'Confirmar cancelamento' }),
  );
  await screen.findByRole('heading', {
    name: 'Confira se o pedido foi concluído',
  });
  expect(
    screen.getByRole('button', { name: 'Confirmar cancelamento' }),
  ).toBeDisabled();
  expect(
    screen.getByRole('button', { name: 'Abrir gestão da assinatura' }),
  ).toBeEnabled();
  expect(screen.queryByText('Cancelamento agendado pelo serviço.')).toBeNull();
  expect(screen.getByText('R$ 123,45 por mês')).toBeVisible();
});
it('exibe datas confirmadas e mantém desconhecidos sem preencher zero', async () => {
  await open({
    ...billingStatus,
    status: 'ACTIVE',
    current_period_ends_at: '2026-11-08T12:00:00Z',
  });
  expect(await screen.findByText('Assinatura ativa')).toBeVisible();
  expect(
    screen.getByText('01/10/2026, 09:00 (America/Sao_Paulo)'),
  ).toBeVisible();
  expect(
    screen.getByText('08/11/2026, 09:00 (America/Sao_Paulo)'),
  ).toBeVisible();
  expect(
    screen.queryByText('O serviço ainda não informou um período confirmado.'),
  ).toBeNull();
});
it('retorno consulta no máximo três vezes; parâmetro de sucesso não concede acesso', async () => {
  const s = await open(initial, { returning: true });
  await screen.findByText('Confirmação do cartão pendente');
  const user = userEvent.setup();
  // Real timers exercise query completion and effect cancellation together.
  await waitFor(
    () =>
      expect(
        screen.queryByText('Conferindo a situação após o retorno…'),
      ).toBeNull(),
    { timeout: 9000 },
  );
  expect(s.fetcher.mock.calls.filter(([r]) => r.method === 'GET')).toHaveLength(
    4,
  );
  expect(
    screen.getByText('Você pode consultar e exportar seus dados.'),
  ).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Atualizar situação' }));
  await screen.findByText(
    'Situação consultada no serviço. Nenhum pedido foi reenviado.',
  );
}, 12_000);
it('erro inicial e provedor ausente mantêm página e saída útil', async () => {
  const s = await open(initial, { status: 503 });
  expect(
    await screen.findByText(/A situação da assinatura está indisponível/),
  ).toBeVisible();
  expect(s.fetcher).toHaveBeenCalledTimes(1);
});
