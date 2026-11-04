import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { createSession } from '../../auth/session';
import { sessionContext } from '../../auth/protocol';
import { ProvedorAuth } from '../../auth/ProvedorAuth';
import { createApiClient } from '../../api/client';
import { ApiError } from '../../api/error';
import { parseConfig } from '../../lib/config';
import { createAccessController } from '../acesso/controller';
import { ProvedorAcesso } from '../acesso/ProvedorAcesso';
import { billingStatus } from '../../../tests/fixtures/acesso';
import { bancasFixture } from '../../../tests/fixtures/bancas';
import {
  BANCAS,
  conferirBanca,
  conferirBancas,
  conferirIntencaoBanca,
  type Banca,
} from './bancas';
import { BancasCaixa } from './BancasCaixa';

const cleanups: Array<() => void> = [];
beforeEach(() => {
  // jsdom has no modal dialog API.
  HTMLDialogElement.prototype.showModal ??= function () {};
  HTMLDialogElement.prototype.close ??= function () {};
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
  cleanups.splice(0).forEach((fn) => fn());
  vi.restoreAllMocks();
});
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
const KEY = '5e1a7c3b-9d2f-4a6e-8b1c-3f5d7a9e2c4b';
type Fixture = ReturnType<typeof bancasFixture>;
type Write = {
  method: string;
  path: string;
  key: string | null;
  url: string;
  body: string;
};

async function open(
  hooks: {
    access?: string;
    entry?: string;
    write?: (req: Request, fixture: Fixture) => Promise<Response> | undefined;
    intencao?: () => Promise<Response>;
  } = {},
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
  const fixture = bancasFixture();
  const writes: Write[] = [];
  const lookups: Array<string | null> = [];
  // eslint-disable-next-line prefer-const
  let router: ReturnType<typeof createMemoryRouter>;
  const client = createApiClient(
    parseConfig({ VITE_API_URL: 'http://127.0.0.1:8000' }),
    {
      captureSession: session.capture,
      fetcher: async (req) => {
        const path = new URL(req.url).pathname;
        const key = req.headers.get('Idempotency-Key');
        if (path === '/api/v1/billing/status')
          return json({
            ...billingStatus,
            access: hooks.access ?? 'FULL_WRITE',
          });
        if (path === '/api/v1/bancas/intencao') {
          lookups.push(key);
          if (hooks.intencao) return hooks.intencao();
          const r = fixture.intencao(key ?? '');
          return json(r.data, r.status);
        }
        if (path === BANCAS && req.method === 'GET')
          return json(fixture.lista());
        const body = await req.clone().text();
        writes.push({
          method: req.method,
          path,
          key,
          url: router.state.location.search,
          body,
        });
        const custom = hooks.write?.(req, fixture);
        if (custom) return custom;
        const id = Number(path.split('/')[4]);
        const r =
          req.method === 'PATCH'
            ? fixture.alterar(key!, id, JSON.parse(body))
            : path.endsWith('/arquivar')
              ? fixture.arquivar(key!, id)
              : fixture.criar(key!, JSON.parse(body));
        return json(r.data, r.status);
      },
    },
  );
  router = createMemoryRouter(
    [
      {
        path: '/caixa',
        element: (
          <BancasCaixa
            client={client}
            saldos={[
              { id: 1, saldo_total_centavos: 25000 },
              {
                id: 2,
                saldo_total_centavos: null,
                motivo_saldo_indisponivel: 'conta_sem_saldo',
              },
            ]}
          />
        ),
      },
    ],
    { initialEntries: [hooks.entry ?? '/caixa?secao=saldos&casa=7'] },
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
  const search = () => new URLSearchParams(router.state.location.search);
  await screen.findByRole('heading', { name: 'Banca principal' });
  return { fixture, writes, lookups, search, session };
}

async function criar(nome: string, capital = '') {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Nova banca' }));
  if (nome) await user.type(screen.getByLabelText('Nome da banca'), nome);
  if (capital)
    await user.type(screen.getByLabelText('Capital inicial (R$)'), capital);
  await user.click(screen.getByRole('button', { name: 'Criar banca' }));
  return user;
}

const banca: Banca = {
  id: 3,
  nome: 'Teste',
  estado: 'ativa',
  arquivada_em: null,
  saldo_inicial_centavos: 0,
  contas: [],
};

it('protocolo recusa listas, recibos e intenções fora do contrato', () => {
  expect(conferirBancas({ bancas: [banca] })).toEqual([banca]);
  for (const bad of [
    [{ ...banca, estado: 'arquivada' as const }],
    [{ ...banca, arquivada_em: '2026-11-04T18:00:00Z' }],
    [{ ...banca, saldo_inicial_centavos: -1 }],
    [{ ...banca, nome: ' ' }],
    [{ ...banca, id: 0 }],
    [banca, banca],
  ])
    expect(() => conferirBancas({ bancas: bad })).toThrow(ApiError);
  const criar = {
    operacao: 'CRIAR' as const,
    body: { nome: ' Teste ', saldo_inicial_centavos: 0 },
  };
  expect(conferirBanca(banca, criar, undefined)).toBe(banca);
  expect(() =>
    conferirBanca({ ...banca, saldo_inicial_centavos: null }, criar, undefined),
  ).toThrow(ApiError);
  expect(() =>
    conferirBanca(banca, { operacao: 'ARQUIVAR', bancaId: 3 }, undefined),
  ).toThrow(ApiError);
  expect(() =>
    conferirBanca(
      banca,
      { operacao: 'ALTERAR', bancaId: 4, body: {} },
      undefined,
    ),
  ).toThrow(ApiError);
  try {
    conferirBanca(
      banca,
      { operacao: 'ALTERAR', bancaId: 4, body: {} },
      undefined,
      true,
    );
  } catch (error) {
    expect((error as ApiError).outcomeUnknown).toBe(true);
  }
  expect(
    conferirIntencaoBanca(
      { operacao: 'CRIAR', status_code: 201, resposta: banca },
      criar,
    ).banca,
  ).toBe(banca);
  // After reload the operation comes from the API.
  expect(
    conferirIntencaoBanca(
      {
        operacao: 'ARQUIVAR',
        status_code: 200,
        resposta: {
          ...banca,
          estado: 'arquivada',
          arquivada_em: '2026-11-04T18:00:00Z',
        },
      },
      undefined,
    ).operacao,
  ).toBe('ARQUIVAR');
  expect(
    conferirIntencaoBanca(
      { operacao: 'ALTERAR', status_code: 200, resposta: banca },
      undefined,
    ).operacao,
  ).toBe('ALTERAR');
  for (const value of [
    { operacao: 'CRIAR' as const, status_code: 200, resposta: banca },
    { operacao: 'ALTERAR' as const, status_code: 200, resposta: banca },
  ])
    expect(() => conferirIntencaoBanca(value, criar)).toThrow(ApiError);
});

it('lista ativas com capital, saldo e contas; arquivadas ficam sob demanda', async () => {
  await open();
  const principal = screen.getByRole('article', { name: 'Banca principal' });
  expect(principal).toHaveTextContent('R$ 1.000,00');
  expect(principal).toHaveTextContent('R$ 250,00');
  expect(principal).toHaveTextContent('Betano principal');
  const reserva = screen.getByRole('article', { name: 'Reserva' });
  // null capital is "not informed", never zero.
  expect(reserva).toHaveTextContent('Não informado');
  expect(reserva).toHaveTextContent('Saldo indisponível');
  expect(reserva).toHaveTextContent('Nenhuma conta vinculada');
  expect(
    within(principal).getByRole('button', { name: 'Arquivar Banca principal' }),
  ).toBeDisabled();
  expect(principal).toHaveTextContent('desvincule as contas');
});

it('cria com chave na URL antes do POST e capital em branco não informado', async () => {
  const { writes, search } = await open();
  await criar('Nova casa');
  expect(await screen.findByText('Banca Nova casa criada.')).toBeVisible();
  expect(writes).toHaveLength(1);
  expect(writes[0]!.method).toBe('POST');
  expect(JSON.parse(writes[0]!.body)).toEqual({ nome: 'Nova casa' });
  expect(new URLSearchParams(writes[0]!.url).get('banca_intencao')).toBe(
    writes[0]!.key,
  );
  expect(search().has('banca_intencao')).toBe(false);
  expect(search().get('casa')).toBe('7');
  expect(
    await screen.findByRole('heading', { name: 'Nova casa' }),
  ).toBeVisible();
  expect(screen.queryByLabelText('Nome da banca')).toBeNull();
});

it('converte o capital digitado só pelo formatador e valida antes de enviar', async () => {
  const { writes } = await open();
  const user = await criar('', '');
  expect(
    screen.getByText('Informe um nome de 1 a 80', { exact: false }),
  ).toBeVisible();
  await user.type(screen.getByLabelText('Nome da banca'), 'Com capital');
  await user.type(screen.getByLabelText('Capital inicial (R$)'), '1.500,5');
  await user.click(screen.getByRole('button', { name: 'Criar banca' }));
  expect(
    screen.getByText('Informe o capital em reais', { exact: false }),
  ).toBeVisible();
  expect(writes).toHaveLength(0);
  await user.clear(screen.getByLabelText('Capital inicial (R$)'));
  await user.type(screen.getByLabelText('Capital inicial (R$)'), '1500,5');
  await user.click(screen.getByRole('button', { name: 'Criar banca' }));
  await screen.findByText('Banca Com capital criada.');
  expect(JSON.parse(writes[0]!.body)).toEqual({
    nome: 'Com capital',
    saldo_inicial_centavos: 150050,
  });
});

it('edição envia só o que mudou; capital apagado vira não informado', async () => {
  const { writes } = await open();
  const user = userEvent.setup();
  await user.click(
    screen.getByRole('button', { name: 'Editar Banca principal' }),
  );
  expect(screen.getByLabelText('Capital inicial (R$)')).toHaveValue('1000');
  // Nothing changed: no request.
  await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));
  expect(writes).toHaveLength(0);
  await user.click(
    screen.getByRole('button', { name: 'Editar Banca principal' }),
  );
  await user.clear(screen.getByLabelText('Capital inicial (R$)'));
  await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));
  expect(
    await screen.findByText('Alterações da banca Banca principal salvas.'),
  ).toBeVisible();
  expect(writes[0]!.method).toBe('PATCH');
  expect(writes[0]!.path).toBe('/api/v1/bancas/1');
  expect(JSON.parse(writes[0]!.body)).toEqual({ saldo_inicial_centavos: null });
  expect(
    screen.getByRole('article', { name: 'Banca principal' }),
  ).toHaveTextContent('Não informado');
});

it('arquivar pede confirmação, "Agora não" não grava e a banca segue identificável', async () => {
  const { writes } = await open();
  const user = userEvent.setup();
  const arquivar = screen.getByRole('button', { name: 'Arquivar Reserva' });
  await user.click(arquivar);
  const dialog = screen.getByRole('dialog', { hidden: true });
  expect(dialog).toHaveTextContent('Movimentos e apostas não mudam');
  await user.click(
    within(dialog).getByRole('button', { name: 'Agora não', hidden: true }),
  );
  expect(writes).toHaveLength(0);
  expect(arquivar).toHaveFocus();
  await user.click(arquivar);
  await user.click(
    within(dialog).getByRole('button', {
      name: 'Arquivar banca',
      hidden: true,
    }),
  );
  expect(
    await screen.findByText('Banca Reserva arquivada', { exact: false }),
  ).toBeVisible();
  expect(writes[0]!.path).toBe('/api/v1/bancas/2/arquivar');
  expect(screen.getByText('Bancas arquivadas (1)')).toBeVisible();
  expect(screen.queryByRole('article', { name: 'Reserva' })).toBeNull();
});

it('nome em uso é recusa conhecida: libera a chave e mantém o formulário', async () => {
  const { writes, search } = await open();
  await criar('reserva');
  expect(
    await screen.findByText('Já existe uma banca com este nome', {
      exact: false,
    }),
  ).toBeVisible();
  expect(writes).toHaveLength(1);
  expect(search().has('banca_intencao')).toBe(false);
  expect(screen.getByLabelText('Nome da banca')).toHaveValue('reserva');
});

it('resposta perdida não reenvia: consulta a mesma chave e recupera a banca', async () => {
  const { writes, lookups, search } = await open({
    write: (req, fixture) =>
      (async () => {
        fixture.criar(req.headers.get('Idempotency-Key')!, await req.json());
        throw new TypeError('rede');
      })(),
  });
  const user = await criar('Perdida');
  expect(
    await screen.findByText('Não foi possível confirmar', { exact: false }),
  ).toBeVisible();
  // The form stays, blocked, until the result is known.
  expect(screen.getByRole('button', { name: 'Criar banca' })).toBeDisabled();
  expect(screen.getByLabelText('Nome da banca')).toBeDisabled();
  expect(search().get('banca_intencao')).toBe(writes[0]!.key);
  await user.click(screen.getByRole('button', { name: 'Consultar resultado' }));
  expect(await screen.findByText('Banca Perdida criada.')).toBeVisible();
  expect(lookups).toEqual([writes[0]!.key]);
  expect(writes).toHaveLength(1);
});

it('sem registro, reenvia a mesma chave e corpo por gesto', async () => {
  let first = true;
  const { writes } = await open({
    write: () => {
      if (!first) return undefined;
      first = false;
      return Promise.reject(new TypeError('rede'));
    },
  });
  const user = await criar('Segunda');
  await user.click(
    await screen.findByRole('button', { name: 'Consultar resultado' }),
  );
  await user.click(
    await screen.findByRole('button', { name: 'Reenviar o mesmo pedido' }),
  );
  expect(await screen.findByText('Banca Segunda criada.')).toBeVisible();
  expect(writes).toHaveLength(2);
  expect(writes[1]!.key).toBe(writes[0]!.key);
  expect(writes[1]!.body).toBe(writes[0]!.body);
});

it('após recarga só com a chave, consulta e descarta sem reenviar', async () => {
  const { writes, lookups, search } = await open({
    entry: `/caixa?casa=7&banca_intencao=${KEY}`,
  });
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Consultar resultado' }));
  expect(
    await screen.findByText('O pedido original não está mais nesta página', {
      exact: false,
    }),
  ).toBeVisible();
  expect(
    screen.queryByRole('button', { name: 'Reenviar o mesmo pedido' }),
  ).toBeNull();
  await user.click(
    screen.getByRole('button', { name: 'Descartar este pedido' }),
  );
  expect(search().has('banca_intencao')).toBe(false);
  expect(lookups).toEqual([KEY]);
  expect(writes).toHaveLength(0);
  expect(screen.getByRole('button', { name: 'Nova banca' })).toBeEnabled();
});

it('consulta com falha mantém a incerteza', async () => {
  const { lookups } = await open({
    entry: `/caixa?banca_intencao=${KEY}`,
    intencao: async () => json({ detail: 'erro' }, 500),
  });
  await userEvent
    .setup()
    .click(screen.getByRole('button', { name: 'Consultar resultado' }));
  await waitFor(() => expect(lookups).toHaveLength(1));
  expect(
    await screen.findByText('Não foi possível confirmar', { exact: false }),
  ).toBeVisible();
});

it('422 por campo aponta o rótulo local sem expor código', async () => {
  await open({
    write: () =>
      Promise.resolve(
        json(
          {
            detail: 'banca_invalida',
            campos: [{ campo: 'nome', codigo: 'tamanho' }],
          },
          422,
        ),
      ),
  });
  const user = await criar('Qualquer');
  await user.click(
    await screen.findByRole('button', { name: 'Confira Nome da banca' }),
  );
  expect(screen.getByLabelText('Nome da banca')).toHaveFocus();
  expect(screen.queryByText(/tamanho/)).toBeNull();
});

it('modo de leitura consulta as bancas sem criar, editar ou arquivar', async () => {
  const { writes } = await open({ access: 'READ_ONLY' });
  expect(screen.getByRole('button', { name: 'Nova banca' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Editar Reserva' })).toBeDisabled();
  expect(
    screen.getByRole('button', { name: 'Arquivar Reserva' }),
  ).toBeDisabled();
  expect(
    screen.getByText('podem ser consultadas, mas não criadas', {
      exact: false,
    }),
  ).toBeVisible();
  expect(writes).toHaveLength(0);
});

it('saída da sessão limpa a tentativa em memória', async () => {
  const { session } = await open({
    write: () => Promise.reject(new TypeError('rede')),
  });
  await criar('Antes da saída');
  await screen.findByText('Não foi possível confirmar', { exact: false });
  await act(() => session.logout());
  await waitFor(() => expect(screen.queryByText('Banca principal')).toBeNull());
});
