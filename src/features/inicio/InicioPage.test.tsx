import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { createSession } from '../../auth/session';
import { sessionContext } from '../../auth/protocol';
import { ProvedorAuth } from '../../auth/ProvedorAuth';
import { createApiClient } from '../../api/client';
import { parseConfig } from '../../lib/config';
import { createAccessController } from '../acesso/controller';
import { ProvedorAcesso } from '../acesso/ProvedorAcesso';
import { billingStatus } from '../../../tests/fixtures/acesso';
import { inicioResposta } from '../../../tests/fixtures/inicio';
import { InicioPage } from './InicioPage';
import type { Subscription } from '../assinatura/protocol';

const clean: Array<() => void> = [];
afterEach(() => clean.splice(0).forEach((fn) => fn()));
function json(value: unknown, status = 200, headers = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}
async function open({
  present = false,
  status = billingStatus,
  override,
  withAccess = true,
}: {
  present?: boolean;
  status?: Subscription;
  override?: (
    request: Request,
  ) => Response | Promise<Response | undefined> | undefined;
  withAccess?: boolean;
} = {}) {
  const queries = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
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
  const service = createSession({
    baseUrl: 'http://127.0.0.1:8000',
    queryClient: queries,
    transport: {
      read: async () => context,
      renew: async () => context,
      logout: async () => {},
    },
    exclusive: async (_s, work) => work(),
  });
  await service.resume();
  const controller = createAccessController(service, queries);
  const requests: Request[] = [];
  const client = createApiClient(
    parseConfig({ VITE_API_URL: 'http://127.0.0.1:8000' }),
    {
      captureSession: service.capture,
      fetcher: async (request) => {
        requests.push(request.clone());
        const custom = await override?.(request);
        if (custom) return custom;
        const path = new URL(request.url).pathname;
        return json(
          path === '/api/v1/billing/status'
            ? status
            : inicioResposta(path, present),
        );
      },
    },
  );
  const router = createMemoryRouter(
    [
      { path: '/inicio', element: <InicioPage client={client} /> },
      { path: '*', element: <p>Destino</p> },
    ],
    {
      initialEntries: [
        '/inicio?casa=7&apagadas=1&estado=RED&manual_intencao=af31800d-6b75-4faf-91b4-1690a48e984a',
      ],
    },
  );
  const content = <RouterProvider router={router} />;
  const view = render(
    <ProvedorAuth service={service}>
      <QueryClientProvider client={queries}>
        {withAccess ? (
          <ProvedorAcesso controller={controller} client={client}>
            {content}
          </ProvedorAcesso>
        ) : (
          content
        )}
      </QueryClientProvider>
    </ProvedorAuth>,
  );
  clean.push(() => {
    view.unmount();
    router.dispose();
    controller.dispose();
    service.dispose();
    queries.clear();
  });
  return { requests, router, queries, service };
}
it('conta vazia tem próximo passo sem dinheiro fictício e consultas globais inclusive inativos', async () => {
  const { requests } = await open();
  await screen.findByRole('heading', { name: 'Prepare a conta da casa' });
  expect(
    screen.getByText(
      'Acesso à conta confirmado. A assinatura é uma etapa separada.',
    ),
  ).toBeVisible();
  expect(
    screen.getByText(
      'Você ainda não cadastrou titulares. Ainda não há contas da casa cadastradas.',
    ),
  ).toBeInTheDocument();
  expect(requests).toHaveLength(4);
  const bets = new URL(
    requests.find((r) => new URL(r.url).pathname === '/api/v1/apostas')!.url,
  );
  expect([...bets.searchParams.keys()].sort()).toEqual([
    'incluir_apagadas',
    'page',
    'page_size',
  ]);
  expect(bets.searchParams.get('incluir_apagadas')).toBe('true');
  expect(
    requests.find((r) => r.url.includes('/filtros/contas'))!.url,
  ).toContain('incluir_inativas=true');
  expect(
    requests.find((r) => new URL(r.url).pathname === '/api/v1/titulares')!.url,
  ).toContain('include_archived=true');
  expect(document.body.textContent).not.toMatch(/R\$|onboarding_complete/);
  expect(requests.every((r) => r.method === 'GET')).toBe(true);
});
it('presença não promete atribuição; aposta existente oferece lista e reconsulta por gesto', async () => {
  const { requests } = await open({ present: true });
  await screen.findByRole('heading', { name: 'Suas apostas já estão no site' });
  expect(
    screen.getByRole('link', { name: 'Ver minhas apostas' }),
  ).toHaveAttribute(
    'href',
    expect.stringContaining('/?casa=7&apagadas=1&estado=RED'),
  );
  expect(
    screen.getByText(/Isso não significa que estejam em uso/),
  ).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole('button', { name: 'Conferir meus registros' }),
  );
  await waitFor(() => expect(requests).toHaveLength(7));
});
it('voltar ao guia consulta novamente mesmo dentro da janela de cache global', async () => {
  let present = false;
  const { router } = await open({
    override: (request) =>
      new URL(request.url).pathname === '/api/v1/apostas'
        ? json(inicioResposta('/api/v1/apostas', present))
        : undefined,
  });
  await screen.findByRole('heading', { name: 'Prepare a conta da casa' });
  await act(async () => {
    await router.navigate('/');
  });
  present = true;
  await act(async () => {
    await router.navigate('/inicio?casa=7&apagadas=1');
  });
  await screen.findByRole('heading', { name: 'Suas apostas já estão no site' });
});
it('conta existente sem apostas sugere manual, limpando intenção antiga e preservando filtros', async () => {
  await open({
    override: (r) =>
      r.url.includes('/filtros/contas')
        ? json(inicioResposta('/api/v1/filtros/contas', true))
        : undefined,
  });
  await screen.findByRole('heading', { name: 'Registre sua primeira aposta' });
  const href = screen
    .getByRole('link', { name: 'Registrar uma aposta' })
    .getAttribute('href');
  expect(href).toContain('/aposta/nova?casa=7&apagadas=1&estado=RED');
  expect(href).not.toContain('manual_intencao');
  for (const [name, channel] of [
    ['Enviar arquivo do Telegram', 'telegram'],
    ['Enviar planilha', 'planilha'],
    ['Enviar prints', 'prints'],
  ])
    expect(screen.getByRole('link', { name })).toHaveAttribute(
      'href',
      expect.stringContaining('entrada=' + channel),
    );
});
it.each(['AWAITING_CARD', 'PAST_DUE', 'CANCELED', 'EXPIRED', null] as const)(
  'leitura %s oferece assinatura, ajuda/exportação e conexões, sem bloquear sessão',
  async (value) => {
    await open({
      status: { ...billingStatus, access: 'READ_ONLY', status: value },
    });
    await screen.findByRole('heading', {
      name: 'Confira seu acesso para enviar apostas',
    });
    expect(
      screen.getByRole('link', { name: 'Conferir assinatura' }),
    ).toHaveAttribute('href', expect.stringContaining('/assinatura?'));
    expect(
      screen.queryByRole('link', { name: 'Abrir Nova aposta' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Como usar: Planilha' }),
    ).toHaveAttribute('href', expect.stringContaining('/tutorial?'));
    fireEvent.click(screen.getByText('Entenda titular e conta da casa'));
    expect(
      screen.getByRole('link', { name: 'Consultar contas e titulares' }),
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Preparar conexão com Telegram' }),
    ).toBeVisible();
    expect(
      screen.getByRole('link', {
        name: 'Consultar exportação dos meus registros',
      }),
    ).toBeVisible();
    if (value === 'AWAITING_CARD')
      expect(screen.getByText(/Criar a conta não inicia/)).toBeVisible();
  },
);
it('cartão pendente antes do rollout respeita FULL_WRITE publicado sem inventar bloqueio', async () => {
  await open({
    status: {
      ...billingStatus,
      status: 'AWAITING_CARD',
      trial_confirmed: false,
      access: 'FULL_WRITE',
    },
  });
  await screen.findByRole('heading', { name: 'Prepare a conta da casa' });
  expect(screen.getByText('Confirmação do cartão pendente')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Abrir Nova aposta' })).toBeVisible();
  expect(
    screen.queryByText(/^Período gratuito confirmado/),
  ).not.toBeInTheDocument();
});
it('trial sem confirmação não é descrito como confirmado nem datas dão permissão', async () => {
  await open({
    status: { ...billingStatus, access: 'READ_ONLY', trial_confirmed: false },
  });
  await screen.findByText('Período gratuito aguardando confirmação');
  expect(
    screen.queryByText(/^Período gratuito confirmado/),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole('link', { name: 'Abrir Nova aposta' }),
  ).not.toBeInTheDocument();
});
it.each([true, false])(
  'trial confirmado com prazo disponível=%s usa apenas prazo publicado',
  async (expiry) => {
    await open({
      status: {
        ...billingStatus,
        trial_ends_at: expiry ? billingStatus.trial_ends_at : null,
      },
    });
    await screen.findByRole('heading', { name: 'Prepare a conta da casa' });
    expect(screen.queryByText(/Período gratuito confirmado até/) !== null).toBe(
      expiry,
    );
  },
);
it('assinatura ativa preserva acesso confirmado sem inventar período gratuito', async () => {
  await open({ status: { ...billingStatus, status: 'ACTIVE' } });
  await screen.findByText('Assinatura ativa');
  expect(
    screen.queryByText(/Período gratuito confirmado até/),
  ).not.toBeInTheDocument();
});
it('acesso indisponível não revela envio nem impede ajuda', async () => {
  await open({
    override: (r) =>
      r.url.includes('/billing/status')
        ? json({ detail: 'private' }, 503, { 'Retry-After': '61' })
        : undefined,
  });
  await screen.findByText('A situação da assinatura ainda não foi confirmada.');
  expect(
    screen.queryByRole('link', { name: 'Abrir Nova aposta' }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: 'Como usar: Prints dos bilhetes' }),
  ).toBeVisible();
});
it.each([404, 429, 500, 503])(
  'erro %s não vira conta vazia, não vaza detalhe e respeita prazo',
  async (status) => {
    await open({
      override: (r) =>
        new URL(r.url).pathname === '/api/v1/apostas'
          ? json({ detail: 'private-input-secret' }, status, {
              'Retry-After': '61',
            })
          : undefined,
    });
    await screen.findByRole('alert');
    expect(
      screen.queryByRole('heading', { name: 'Prepare a conta da casa' }),
    ).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain('private-input-secret');
    expect(
      screen.queryByRole('button', { name: 'Conferir meus registros' }),
    ).not.toBeInTheDocument();
    if ([429, 503].includes(status))
      expect(
        screen.queryByRole('button', { name: /Tentar/ }),
      ).not.toBeInTheDocument();
  },
);
it('erro permite consulta segura explícita e sucesso só após resposta', async () => {
  let fail = true;
  await open({
    override: (r) =>
      fail && new URL(r.url).pathname === '/api/v1/apostas'
        ? json({}, 500)
        : undefined,
  });
  const retry = await screen.findByRole('button', { name: /Tentar/ });
  fail = false;
  fireEvent.click(retry);
  await screen.findByRole('heading', { name: 'Prepare a conta da casa' });
});
it('espera consulta sem habilitar ações e descarte após logout inclusive parsing tardio', async () => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const { service, queries } = await open({
    override: async (r) => {
      if (r.url.includes('/api/v1/apostas')) {
        await pending;
        return json(inicioResposta('/api/v1/apostas', true));
      }
    },
  });
  expect(screen.getByText('Consultando seus registros…')).toBeVisible();
  await act(async () => {
    await service.logout();
    release();
  });
  await waitFor(() =>
    expect(
      queries
        .getQueriesData({ queryKey: ['inicio'] })
        .every(([, value]) => value === undefined),
    ).toBe(true),
  );
  expect(
    screen.queryByRole('heading', { name: 'Suas apostas já estão no site' }),
  ).not.toBeInTheDocument();
});
it('sem provedor comercial permanece consultável, sem assumir escrita', async () => {
  await open({ withAccess: false });
  await screen.findByRole('button', { name: 'Conferir meus registros' });
  expect(
    screen.getByText('A situação da assinatura ainda não foi confirmada.'),
  ).toBeVisible();
});
