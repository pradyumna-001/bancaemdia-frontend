import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
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
import golden from '../../../tests/fixtures/calculadoras-golden.json';
import { CalculadorasPage } from './CalculadorasPage';

const cleanups: Array<() => void> = [];
afterEach(() => {
  cleanups.splice(0).forEach((fn) => fn());
  vi.restoreAllMocks();
});
async function open(tool = 'mercado-justo') {
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
  let handler: (request: Request) => Promise<Response> = async () =>
    new Response(JSON.stringify(golden.cases[0]!.response), {
      headers: { 'Content-Type': 'application/json' },
    });
  const writes: Request[] = [];
  const client = createApiClient(
    parseConfig({ VITE_API_URL: 'http://127.0.0.1:8000' }),
    {
      captureSession: session.capture,
      fetcher: async (request) => {
        if (request.method === 'GET')
          return new Response(
            JSON.stringify({ ...billingStatus, access: 'READ_ONLY' }),
            { headers: { 'Content-Type': 'application/json' } },
          );
        writes.push(request.clone());
        return handler(request);
      },
    },
  );
  const router = createMemoryRouter(
    [
      {
        path: '/calculadoras',
        loader: () => true,
        hydrateFallbackElement: <p>Abrindo…</p>,
        element: (
          <RequireSession>
            <CalculadorasPage client={client} />
          </RequireSession>
        ),
      },
      { path: '/login', element: <p>Entrar</p> },
    ],
    { initialEntries: [`/calculadoras?casa=7&apagadas=1&ferramenta=${tool}`] },
  );
  render(
    <ProvedorAuth service={session}>
      <QueryClientProvider client={queries}>
        <ProvedorAcesso controller={controller} client={client}>
          <RouterProvider router={router} />
        </ProvedorAcesso>
      </QueryClientProvider>
    </ProvedorAuth>,
  );
  await screen.findByRole('heading', { name: 'Calculadoras' });
  cleanups.push(() => {
    router.dispose();
    session.dispose();
    controller.dispose();
    queries.clear();
  });
  return {
    user: userEvent.setup(),
    writes,
    session,
    reply: (
      body: unknown,
      status = 200,
      headers: Record<string, string> = {},
    ) => {
      handler = async () =>
        new Response(JSON.stringify(body), {
          status,
          headers: { 'Content-Type': 'application/json', ...headers },
        });
    },
    respond: (next: typeof handler) => {
      handler = next;
    },
  };
}
async function market(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Nome do resultado 1'), 'Casa vence');
  await user.type(
    screen.getByLabelText('Nome do resultado 2'),
    'Visitante vence',
  );
  await user.type(screen.getByLabelText('Odd do resultado 1'), '2,1');
  await user.type(screen.getByLabelText('Odd do resultado 2'), '2,1');
  await user.click(screen.getByRole('checkbox'));
}
const submit = () =>
  screen.getByRole('button', { name: 'Consultar resultado' });
it('envia nomes/odds decimais exatos em READ_ONLY, mostra resultado e limpa ao editar', async () => {
  const app = await open();
  await market(app.user);
  app.reply(golden.cases[0]!.response);
  await app.user.click(submit());
  expect(
    await screen.findByRole('heading', {
      name: 'Resultado informado pelo serviço',
    }),
  ).toBeVisible();
  expect(await app.writes[0]!.json()).toEqual({
    outcomes: [
      { name: 'Casa vence', odd: '2.1' },
      { name: 'Visitante vence', odd: '2.1' },
    ],
  });
  expect(app.writes[0]!.headers.get('X-CSRF-Token')).toBeTruthy();
  expect(
    screen.getByRole('link', { name: 'Voltar para Apostas' }),
  ).toHaveAttribute(
    'href',
    '/apostas?casa=7&apagadas=1&ferramenta=mercado-justo',
  );
  await app.user.click(screen.getByText('Premissas e método do serviço'));
  expect(
    screen.getByText('Retirar a margem não prevê as probabilidades reais.'),
  ).toBeVisible();
  await app.user.type(screen.getByLabelText('Odd do resultado 1'), '0');
  expect(
    screen.queryByRole('heading', { name: 'Resultado informado pelo serviço' }),
  ).not.toBeInTheDocument();
});
it('não envia mercado incompleto nem nomes duplicados e permite revisar', async () => {
  const app = await open();
  await app.user.click(submit());
  expect(await screen.findByRole('alert')).toHaveTextContent('Confirme');
  expect(app.writes).toHaveLength(0);
  await market(app.user);
  await app.user.clear(screen.getByLabelText('Nome do resultado 2'));
  await app.user.type(
    screen.getByLabelText('Nome do resultado 2'),
    'CASA VENCE',
  );
  await app.user.click(submit());
  expect(await screen.findByRole('alert')).toHaveTextContent('nomes distintos');
  expect(app.writes).toHaveLength(0);
});
it('adiciona/remove resultados e preserva campos ao mudar ferramenta', async () => {
  const app = await open();
  await market(app.user);
  await app.user.click(
    screen.getByRole('button', { name: 'Adicionar resultado' }),
  );
  expect(screen.getByLabelText('Nome do resultado 3')).toBeVisible();
  await app.user.click(
    screen.getByRole('button', { name: 'Remover resultado 3' }),
  );
  expect(
    screen.queryByLabelText('Nome do resultado 3'),
  ).not.toBeInTheDocument();
  await app.user.click(
    screen.getByRole('button', { name: 'Desfazer remoção' }),
  );
  expect(screen.getByLabelText('Nome do resultado 3')).toBeVisible();
  await app.user.click(
    screen.getByRole('button', { name: 'Remover resultado 3' }),
  );
  await app.user.click(
    screen.getByRole('link', {
      name: 'Distribuir entre resultados',
    }),
  );
  expect(screen.getByLabelText('Nome do resultado 1')).toHaveValue(
    'Casa vence',
  );
});
it('limita o mercado a 20 resultados sem perder as entradas existentes', async () => {
  await open();
  const name = screen.getByLabelText('Nome do resultado 1');
  fireEvent.change(name, { target: { value: 'Casa vence' } });
  const add = screen.getByRole('button', { name: 'Adicionar resultado' });
  for (let index = 2; index < 20; index++) fireEvent.click(add);
  expect(screen.getByLabelText('Nome do resultado 20')).toBeVisible();
  expect(name).toHaveValue('Casa vence');
  expect(
    screen.getByRole('button', { name: 'Adicionar resultado' }),
  ).toBeDisabled();
  fireEvent.click(add);
  expect(
    screen.queryByLabelText('Nome do resultado 21'),
  ).not.toBeInTheDocument();
});
it('distribuição envia centavos e exibe perda real e avisos sem somar cenários', async () => {
  const app = await open('distribuir-entre-resultados');
  await market(app.user);
  await app.user.type(screen.getByLabelText('Entrada total (R$)'), '100,00');
  app.reply(golden.cases[3]!.response);
  await app.user.click(submit());
  expect(await screen.findAllByText('−R$ 5,00')).toHaveLength(3);
  expect(await app.writes[0]!.json()).toMatchObject({
    total_stake_centavos: 10000,
  });
  expect(
    screen.getByText(
      'Pelo menos um cenário após o arredondamento não apresenta lucro.',
    ),
  ).toBeVisible();
});
it('cobertura envia somente dinheiro/mercado binário e respeita comissão/dados decimais', async () => {
  const app = await open('cobertura-ao-vivo');
  for (const [label, value] of [
    ['Entrada original (R$)', '100,00'],
    ['Odd original', '1,5'],
    ['Odd oposta', '2'],
  ] as const)
    await app.user.type(screen.getByLabelText(label), value);
  await app.user.clear(screen.getByLabelText('Comissão (%)'));
  await app.user.type(screen.getByLabelText('Comissão (%)'), '10');
  app.reply(golden.cases[6]!.response);
  await app.user.click(submit());
  expect(
    await screen.findByRole('heading', {
      name: 'Resultado informado pelo serviço',
    }),
  ).toBeVisible();
  expect(await app.writes[0]!.json()).toEqual(golden.cases[6]!.body);
  expect(
    screen.getByText('Pelo menos um cenário ainda apresenta perda.'),
  ).toBeVisible();
  expect(screen.getByRole('cell', { name: '−R$ 31,32' })).toBeVisible();
});
it('percentual direto e inverso não escolhem saldo e enviam exatamente uma modalidade', async () => {
  const app = await open('percentual-banca');
  expect(screen.getByLabelText('Banca informada (R$)')).toHaveValue('');
  await app.user.type(screen.getByLabelText('Banca informada (R$)'), '100,00');
  await app.user.type(screen.getByLabelText('Percentual (%)'), '1,25');
  app.reply(golden.cases[8]!.response);
  await app.user.click(submit());
  expect(await screen.findByText('R$ 1,25')).toBeVisible();
  expect(await app.writes[0]!.json()).toEqual(golden.cases[8]!.body);
  await app.user.click(
    screen.getByRole('radio', { name: 'Percentual a partir do valor' }),
  );
  await app.user.clear(screen.getByLabelText('Banca informada (R$)'));
  await app.user.type(screen.getByLabelText('Banca informada (R$)'), '1,01');
  await app.user.type(screen.getByLabelText('Valor da entrada (R$)'), '0,01');
  app.reply(golden.cases[9]!.response);
  await app.user.click(submit());
  expect((await screen.findAllByText('0,990099%'))[0]!).toBeVisible();
  expect(await app.writes[1]!.json()).toEqual(golden.cases[9]!.body);
});
it('entrada inválida não chega ao servidor e conserva o formulário', async () => {
  const app = await open('percentual-banca');
  await app.user.type(
    screen.getByLabelText('Banca informada (R$)'),
    '1.000,00',
  );
  await app.user.type(screen.getByLabelText('Percentual (%)'), '1');
  await app.user.click(submit());
  expect(await screen.findByRole('alert')).toHaveTextContent('duas casas');
  expect(app.writes).toHaveLength(0);
  expect(screen.getByLabelText('Banca informada (R$)')).toHaveValue('1.000,00');
});
it.each([422, 409, 500, 503, 402])(
  'erro %s preserva entrada, sem retry automático de POST',
  async (code) => {
    const app = await open();
    await market(app.user);
    app.reply(
      { detail: code === 402 ? 'account_read_only' : 'private diagnostic' },
      code,
    );
    await app.user.click(submit());
    expect(await screen.findByRole('alert')).toBeVisible();
    expect(screen.getByLabelText('Nome do resultado 1')).toHaveValue(
      'Casa vence',
    );
    expect(screen.queryByText('private diagnostic')).not.toBeInTheDocument();
    expect(app.writes).toHaveLength(1);
    await app.user.click(
      screen.getByRole('button', {
        name: code === 422 ? 'Revisar pedido' : 'Voltar ao formulário',
      }),
    );
    expect(screen.getByLabelText('Nome do resultado 1')).toHaveFocus();
  },
);
it('429 mantém o prazo mesmo após edição e troca de ferramenta', async () => {
  const app = await open();
  await market(app.user);
  app.reply({ detail: 'rate_limited' }, 429, { 'Retry-After': '61' });
  await app.user.click(submit());
  expect(await screen.findByRole('alert')).toBeVisible();
  await app.user.type(screen.getByLabelText('Odd do resultado 1'), '1');
  expect(submit()).toBeDisabled();
  await app.user.click(
    screen.getByRole('link', { name: 'Percentual da banca' }),
  );
  expect(submit()).toBeDisabled();
  expect(app.writes).toHaveLength(1);
});
it('resposta tardia após edição é descartada e nova consulta é explícita', async () => {
  const app = await open();
  await market(app.user);
  let done!: (value: Response) => void;
  app.respond(
    async () =>
      new Promise((resolve) => {
        done = resolve;
      }),
  );
  await app.user.click(submit());
  await waitFor(() => expect(app.writes).toHaveLength(1));
  expect(screen.getByRole('button', { name: 'Consultando…' })).toBeDisabled();
  await app.user.type(
    screen.getByLabelText('Nome do resultado 1'),
    ' alterado',
  );
  await act(async () => {
    done(
      new Response(JSON.stringify(golden.cases[0]!.response), {
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });
  expect(
    screen.queryByRole('heading', { name: 'Resultado informado pelo serviço' }),
  ).not.toBeInTheDocument();
  expect(submit()).toBeEnabled();
});
it('parar e trocar ferramenta cancelam observação sem apresentar resultado velho', async () => {
  const app = await open();
  await market(app.user);
  app.respond(async () => new Promise(() => {}));
  await app.user.click(submit());
  await app.user.click(screen.getByRole('button', { name: 'Parar consulta' }));
  expect(submit()).toBeDisabled();
  await app.user.type(screen.getByLabelText('Odd do resultado 1'), '1');
  expect(submit()).toBeEnabled();
  await app.user.click(submit());
  await app.user.click(screen.getByRole('link', { name: 'Cobertura ao vivo' }));
  await waitFor(() => expect(submit()).toBeEnabled());
  expect(
    screen.queryByRole('button', { name: 'Parar consulta' }),
  ).not.toBeInTheDocument();
});
it('logout desmonta dados privados e bloqueia resposta tardia', async () => {
  const app = await open();
  await market(app.user);
  app.respond(async () => new Promise(() => {}));
  await app.user.click(submit());
  await act(() => app.session.logout());
  expect(
    screen.queryByRole('heading', { name: 'Calculadoras' }),
  ).not.toBeInTheDocument();
});
it.each([{ data: {} }, undefined])(
  'resposta incompleta é erro seguro, sem resultado fabricado',
  async (value) => {
    const app = await open();
    await market(app.user);
    app.reply(value);
    await app.user.click(submit());
    expect(await screen.findByRole('alert')).toBeVisible();
    expect(
      screen.queryByRole('heading', {
        name: 'Resultado informado pelo serviço',
      }),
    ).not.toBeInTheDocument();
  },
);
it('recusa linhas/nome inesperado na resposta mesmo que o método seja válido', async () => {
  const app = await open();
  await market(app.user);
  app.reply(golden.cases[1]!.response);
  await app.user.click(submit());
  expect(await screen.findByRole('alert')).toBeVisible();
});

it('resultado desconhecido pausa a mesma intenção; edição explícita permite uma nova', async () => {
  const app = await open();
  await market(app.user);
  app.respond(async () => {
    throw new TypeError('private network failure');
  });
  await app.user.click(submit());
  expect(await screen.findByRole('alert')).toBeVisible();
  expect(submit()).toBeDisabled();
  await app.user.click(screen.getByRole('link', { name: 'Mercado justo' }));
  expect(submit()).toBeDisabled();
  await app.user.type(screen.getByLabelText('Odd do resultado 1'), '1');
  expect(submit()).toBeEnabled();
  expect(app.writes).toHaveLength(1);
});
