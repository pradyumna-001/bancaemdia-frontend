import { webcrypto } from 'node:crypto';
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
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { ProvedorAuth } from '../../auth/ProvedorAuth';
import { createSession, type SessionService } from '../../auth/session';
import { sessionContext } from '../../auth/protocol';
import { createApiClient } from '../../api/client';
import { parseConfig } from '../../lib/config';
import { createAccessController } from '../acesso/controller';
import { ProvedorAcesso } from '../acesso/ProvedorAcesso';
import { billingStatus } from '../../../tests/fixtures/acesso';
import {
  apostaResultado,
  filaResultado,
  resultadosFixture,
  reciboResultado,
} from '../../../tests/fixtures/resultados';
import { ResultadosPage } from './ResultadosPage';
const clean: (() => void)[] = [];
beforeEach(() => {
  vi.stubGlobal('crypto', webcrypto);
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});
afterEach(() => {
  clean.splice(0).forEach((fn) => fn());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const json = (data: unknown, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
function Location() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output data-testid="url">{location.search}</output>
      <button onClick={() => void navigate('/resultados?casa=8')}>
        Trocar filtro de teste
      </button>
    </>
  );
}
async function setup(
  custom?: (request: Request) => Promise<Response | undefined>,
  path = '/resultados',
  accessState = 'FULL_WRITE',
) {
  const fixture = resultadosFixture();
  const writes: Request[] = [];
  const calls: Request[] = [];
  const context = sessionContext({
    usuario_id: 1,
    nome: 'Teste',
    email: 'teste@example.org',
    session_version: `${crypto.randomUUID()}:1`,
    csrf_token: crypto.randomUUID(),
    refresh_required: false,
    access_expires_at: '2030-01-01T00:00:00Z',
    session_expires_at: '2030-01-02T00:00:00Z',
  });
  const queries = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30000 } },
  });
  const service: SessionService = createSession({
    baseUrl: 'https://site.example.org',
    queryClient: queries,
    exclusive: async (_signal, work) => work(),
    transport: {
      read: async () => context,
      renew: async () => context,
      logout: async () => {},
    },
  });
  await service.resume();
  const client = createApiClient(
    parseConfig({ VITE_API_URL: 'https://site.example.org' }),
    {
      captureSession: service.capture,
      fetcher: async (request) => {
        if (new URL(request.url).pathname.endsWith('/billing/status'))
          return json({ ...billingStatus, access: accessState });
        calls.push(request.clone());
        if (request.method !== 'GET') writes.push(request.clone());
        const override = await custom?.(request.clone());
        if (override) return override;
        const url = new URL(request.url);
        if (url.pathname.includes('/filtros/'))
          return json({
            dimensao: url.pathname.split('/').at(-1),
            data: [],
            pagination: { page: 1, page_size: 20, total: 0 },
          });
        const response = fixture.handle(
          request.method,
          url.pathname,
          url.searchParams,
          request.method === 'POST' ? await request.json() : undefined,
        );
        return json(response.data, response.status);
      },
    },
  );
  const access = createAccessController(service, queries);
  await queries.fetchQuery({
    queryKey: access.key(),
    queryFn: ({ signal }) => access.consult(client, signal),
  });
  clean.push(() => {
    access.dispose();
    service.dispose();
    queries.clear();
  });
  const view = render(
    <ProvedorAuth service={service}>
      <QueryClientProvider client={queries}>
        <ProvedorAcesso controller={access} client={client}>
          <MemoryRouter initialEntries={[path]}>
            <ResultadosPage client={client} />
            <Location />
          </MemoryRouter>
        </ProvedorAcesso>
      </QueryClientProvider>
    </ProvedorAuth>,
  );
  return { ...view, fixture, service, writes, calls };
}
const green = () => screen.getByRole('button', { name: 'GREEN' });
async function ready() {
  await waitFor(() => expect(green()).toBeEnabled(), { timeout: 4000 });
}
it('20 resultados simples exigem 20 gestos e paginação keyset sem pular itens', async () => {
  const state = await setup();
  for (let index = 0; index < 20; index++) {
    await ready();
    fireEvent.click(green());
    await waitFor(() => expect(state.writes).toHaveLength(index + 1));
  }
  await waitFor(() =>
    expect(screen.getByText('20', { selector: 'strong' })).toBeInTheDocument(),
  );
  expect(state.fixture.receipts.size).toBe(20);
  expect(
    state.calls.some((r) => new URL(r.url).searchParams.has('cursor')),
  ).toBe(true);
  expect(
    state.calls.some(
      (r) => r.url.includes('/fila') && new URL(r.url).searchParams.has('page'),
    ),
  ).toBe(false);
  const bodies = await Promise.all(state.writes.map((r) => r.json()));
  expect(new Set(bodies.map((body) => body.chave)).size).toBe(20);
}, 40000);
it('duplo toque, foco e desfazer condicionado não alteram a aposta seguinte', async () => {
  const state = await setup();
  await ready();
  fireEvent.click(green());
  fireEvent.click(green(), { detail: 2 });
  await waitFor(() => expect(state.writes).toHaveLength(1));
  await ready();
  expect(green()).toHaveFocus();
  expect(
    screen.getByRole('heading', { name: 'Corinthians × Santos' }),
  ).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole('button', { name: 'Desfazer Botafogo × Fluminense' }),
  );
  await waitFor(() =>
    expect(
      screen.getByRole('heading', { name: 'Botafogo × Fluminense' }),
    ).toBeInTheDocument(),
  );
  expect(await state.writes[1]!.json()).toMatchObject({
    operacao_id: [...state.fixture.receipts.keys()][0],
  });
  expect(state.writes[1]!.url).toMatch(/\/desfazer$/);
});
it('Outro usa picker, cashout pago e detalhes opcionais da casa', async () => {
  const user = userEvent.setup();
  const state = await setup();
  await ready();
  await user.click(screen.getByRole('button', { name: 'Outro resultado' }));
  await user.click(screen.getByRole('button', { name: /^Resultado / }));
  await user.click(screen.getByRole('button', { name: 'Cashout' }));
  fireEvent.submit(
    screen
      .getByRole('button', { name: 'Registrar resultado' })
      .closest('form')!,
  );
  expect(await screen.findByRole('alert')).toBeInTheDocument();
  expect(state.writes).toHaveLength(0);
  await user.type(screen.getByLabelText('Valor pago no cashout (R$)'), '8,00');
  await user.click(screen.getByRole('button', { name: 'Registrar resultado' }));
  await waitFor(() => expect(state.writes).toHaveLength(1));
  expect(await state.writes[0]!.json()).toMatchObject({
    estado: 'CASHOUT',
    cashout_valor_centavos: 800,
  });
});
it('Outro pode ser fechado e comissão/retorno só seguem a entrada humana', async () => {
  const state = await setup();
  await ready();
  fireEvent.click(screen.getByRole('button', { name: 'Outro resultado' }));
  fireEvent.click(screen.getByRole('button', { name: 'Outro resultado' }));
  expect(
    screen.queryByRole('button', { name: 'Registrar resultado' }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Outro resultado' }));
  fireEvent.click(screen.getByText('Retorno e comissão informados pela casa'));
  fireEvent.change(screen.getByLabelText('Retorno pago (R$) · opcional'), {
    target: { value: '12,34' },
  });
  fireEvent.change(screen.getByLabelText('Comissão (R$) · opcional'), {
    target: { value: '0,12' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Registrar resultado' }));
  await waitFor(() => expect(state.writes).toHaveLength(1));
  expect(await state.writes[0]!.json()).toMatchObject({
    retorno_centavos: 1234,
    comissao_centavos: 12,
  });
});
it('resposta perdida consulta a mesma identidade e não repete POST', async () => {
  let receipt: ReturnType<typeof reciboResultado> | undefined;
  const state = await setup(async (r) => {
    if (r.method === 'POST') {
      receipt = reciboResultado(new URL(r.url).pathname.split('/').at(-1)!);
      throw new TypeError('network');
    }
    if (r.url.includes('/operacoes/') && receipt) return json(receipt);
  });
  await ready();
  fireEvent.click(green());
  await screen.findByRole('heading', { name: 'Consultar este pedido' });
  expect(screen.getByTestId('url').textContent).toContain('resultado=');
  fireEvent.click(
    screen.getByRole('button', { name: 'Consultar resultado do pedido' }),
  );
  await screen.findByRole('button', { name: 'Desfazer Botafogo × Fluminense' });
  expect(state.writes).toHaveLength(1);
});
it('404 após incerteza admite somente replay explícito do payload/UUID guardado', async () => {
  let first = true;
  const state = await setup(async (r) => {
    if (r.method === 'POST' && first) {
      first = false;
      throw new TypeError('network');
    }
    return undefined;
  });
  await ready();
  fireEvent.click(green());
  await screen.findByRole('heading', { name: 'Consultar este pedido' });
  fireEvent.click(
    screen.getByRole('button', { name: 'Consultar resultado do pedido' }),
  );
  fireEvent.click(
    await screen.findByRole('button', {
      name: 'Reenviar exatamente este pedido',
    }),
  );
  await screen.findByRole('button', { name: 'Desfazer Botafogo × Fluminense' });
  expect(state.writes).toHaveLength(2);
  expect(state.writes[0]!.url).toBe(state.writes[1]!.url);
  expect(await state.writes[0]!.json()).toEqual(await state.writes[1]!.json());
});
it('conflito consulta estado atual antes de permitir outra intenção', async () => {
  const state = await setup(async (r) =>
    r.method === 'POST'
      ? json({ detail: { code: 'result_revision_conflict' } }, 409)
      : undefined,
  );
  await ready();
  fireEvent.click(green());
  await screen.findByRole('button', { name: 'Consultar aposta atual' });
  expect(green()).toBeDisabled();
  fireEvent.click(
    screen.getByRole('button', { name: 'Consultar aposta atual' }),
  );
  await ready();
  expect(state.writes).toHaveLength(1);
  expect(screen.getByTestId('url').textContent).not.toContain('resultado');
});
it('alteração externa impede desfazer e a consulta atual remove essa ação', async () => {
  const state = await setup();
  await ready();
  fireEvent.click(green());
  await ready();
  state.fixture.items[0]!.revisao = crypto.randomUUID();
  fireEvent.click(
    screen.getByRole('button', { name: 'Desfazer Botafogo × Fluminense' }),
  );
  fireEvent.click(
    await screen.findByRole('button', { name: 'Consultar aposta atual' }),
  );
  expect(
    await screen.findByRole('button', {
      name: 'Alterada depois da confirmação Botafogo × Fluminense',
    }),
  ).toBeDisabled();
  expect(state.writes).toHaveLength(2);
});
it('uma nova fila confia na elegibilidade atual, inclusive resultado revertido externamente', async () => {
  const state = await setup();
  await ready();
  fireEvent.click(green());
  await ready();
  Object.assign(state.fixture.items[0]!, {
    estado: 'PENDENTE',
    elegivel: true,
    motivo_inelegivel: null,
    revisao: crypto.randomUUID(),
    retorno_centavos: null,
    lucro_centavos: null,
  });
  fireEvent.click(screen.getByRole('button', { name: 'Atualizar fila' }));
  await screen.findByRole('heading', { name: 'Botafogo × Fluminense' });
  await ready();
  expect(state.writes).toHaveLength(1);
});
it('mais páginas são uma consulta explícita e recibo incompatível não instala dinheiro', async () => {
  const state = await setup(async (r) =>
    r.method === 'POST'
      ? json(reciboResultado(crypto.randomUUID()))
      : undefined,
  );
  await ready();
  fireEvent.click(
    screen.getByRole('button', { name: 'Carregar próximas apostas' }),
  );
  await waitFor(() =>
    expect(
      state.calls.some((r) => new URL(r.url).searchParams.has('cursor')),
    ).toBe(true),
  );
  fireEvent.click(green());
  await screen.findByRole('heading', { name: 'Consultar este pedido' });
  expect(
    screen.queryByRole('button', { name: 'Desfazer Botafogo × Fluminense' }),
  ).not.toBeInTheDocument();
});
it('recarregar referência consulta recibo sem corpo em memória ou escrita', async () => {
  const id = crypto.randomUUID();
  const receipt = reciboResultado(id);
  const state = await setup(
    async (r) => (r.url.includes('/operacoes/') ? json(receipt) : undefined),
    '/resultados?resultado=' + id,
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Consultar resultado do pedido' }),
  );
  await screen.findByRole('button', { name: 'Desfazer Botafogo × Fluminense' });
  expect(state.writes).toHaveLength(0);
});
it('GET tem seu próprio Retry-After, sem herdar a espera do POST', async () => {
  let reads = 0;
  const state = await setup(async (r) =>
    r.method === 'POST'
      ? json({}, 503, { 'Retry-After': '60' })
      : r.url.includes('/operacoes/')
        ? json(
            {},
            ++reads === 1 ? 503 : 500,
            reads === 1 ? { 'Retry-After': '1' } : {},
          )
        : undefined,
  );
  await ready();
  fireEvent.click(green());
  await screen.findByRole('heading', { name: 'Consultar este pedido' });
  const consult = screen.getByRole('button', {
    name: 'Consultar resultado do pedido',
  });
  expect(consult).toBeEnabled();
  fireEvent.click(consult);
  await waitFor(() => expect(consult).toBeDisabled());
  await waitFor(() => expect(consult).toBeEnabled(), { timeout: 2000 });
  fireEvent.click(consult);
  await screen.findByText('O serviço encontrou um problema.', { exact: false });
  expect(state.writes).toHaveLength(1);
});
it.each([402, 422])(
  'recusa %i conserva formulário e não avança',
  async (status) => {
    const state = await setup(async (r) =>
      r.method === 'POST' ? json({}, status) : undefined,
    );
    await ready();
    fireEvent.click(screen.getByRole('button', { name: 'RED' }));
    await screen.findByRole('heading', { name: 'Consultar este pedido' });
    expect(state.writes).toHaveLength(1);
    expect(
      screen.getByRole('heading', { name: 'Botafogo × Fluminense' }),
    ).toBeInTheDocument();
  },
);
it('READ_ONLY consulta fila e bloqueia gravação/reversão', async () => {
  const state = await setup(undefined, '/resultados', 'READ_ONLY');
  await screen.findByRole('heading', { name: 'Botafogo × Fluminense' });
  expect(green()).toBeDisabled();
  expect(state.writes).toHaveLength(0);
  expect(
    screen.getByRole('heading', { name: 'Resultados em consulta' }),
  ).toBeInTheDocument();
});
it('catálogos e seletores carregam somente ao abrir os filtros', async () => {
  const state = await setup();
  await ready();
  expect(state.calls.some((r) => r.url.includes('/filtros/'))).toBe(false);
  const details = screen.getByText('Filtros da fila').closest('details')!;
  details.open = true;
  fireEvent(details, new Event('toggle', { bubbles: true }));
  await screen.findByRole('region', { name: 'Filtros da visão' });
  await waitFor(() =>
    expect(state.calls.some((r) => r.url.includes('/filtros/'))).toBe(true),
  );
  details.open = false;
  fireEvent(details, new Event('toggle', { bubbles: true }));
  await waitFor(() =>
    expect(
      screen.queryByRole('region', { name: 'Filtros da visão' }),
    ).not.toBeInTheDocument(),
  );
});
it('422 projeta somente o campo com rótulo local, nunca input/msg/ctx privados', async () => {
  const state = await setup(async (r) =>
    r.method === 'POST'
      ? json(
          {
            detail: [
              {
                loc: ['body', 'cashout_valor_centavos'],
                input: 'privado-input',
                msg: 'privado-msg',
                ctx: { token: 'privado-ctx' },
              },
            ],
          },
          422,
        )
      : undefined,
  );
  await ready();
  fireEvent.click(green());
  expect(
    await screen.findByRole('button', {
      name: 'Confira Valor pago no cashout',
    }),
  ).toBeInTheDocument();
  expect(
    screen.queryByText(/privado-input|privado-msg|privado-ctx/),
  ).not.toBeInTheDocument();
  expect(state.writes).toHaveLength(1);
});
it('filtros não suportados e inválidos preservam URL, sem consulta de outra população', async () => {
  const state = await setup(
    undefined,
    '/resultados?apagadas=1&grupo=7&casa=errada&resultado=errado',
  );
  expect(
    screen.getByRole('heading', { name: 'Confira os filtros' }),
  ).toBeInTheDocument();
  expect(screen.getByTestId('url').textContent).toContain('apagadas=1');
  expect(state.calls.some((r) => r.url.includes('/resultados/'))).toBe(false);
  expect(
    screen.getByText('A referência inválida', { exact: false }),
  ).toBeInTheDocument();
});
it('estado vazio, nova consulta e atualização têm ação explícita', async () => {
  const state = await setup(async (r) =>
    r.url.includes('/fila') ? json(filaResultado([])) : undefined,
  );
  await screen.findByRole('heading', {
    name: 'Nenhuma aposta pendente nesta fila',
  });
  fireEvent.click(screen.getByRole('button', { name: 'Consultar nova fila' }));
  fireEvent.click(screen.getByRole('button', { name: 'Atualizar fila' }));
  await waitFor(() =>
    expect(
      state.calls.filter((r) => r.url.includes('/fila')).length,
    ).toBeGreaterThan(1),
  );
});
it('erro da fila oferece consulta segura e representação sem informações vira copy local', async () => {
  let fail = true;
  await setup(async (r) =>
    r.url.includes('/fila')
      ? fail
        ? json({}, 500)
        : json(
            filaResultado([
              apostaResultado({
                evento: null,
                descricao: null,
                mercado: null,
                casa: null,
                freebet: true,
                criterio_antiguidade: 'criada_em',
              }),
            ]),
          )
      : undefined,
  );
  await screen.findByRole('button', { name: 'Tentar novamente' });
  fail = false;
  fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  await screen.findByRole('heading', { name: 'Aposta sem evento informado' });
});
it('logout, troca de recorte e saída descartam respostas e memória privadas', async () => {
  let finish: (() => void) | undefined;
  const state = await setup(async (r) =>
    r.method === 'POST'
      ? new Promise<Response>((resolve) => {
          finish = () =>
            resolve(
              json(reciboResultado(new URL(r.url).pathname.split('/').at(-1)!)),
            );
        })
      : undefined,
  );
  await ready();
  fireEvent.click(green());
  await waitFor(() => expect(finish).toBeDefined());
  fireEvent.click(
    screen.getByRole('button', { name: 'Trocar filtro de teste' }),
  );
  await act(async () => finish!());
  expect(
    screen.queryByRole('button', { name: 'Desfazer Botafogo × Fluminense' }),
  ).not.toBeInTheDocument();
  await act(async () => state.service.logout());
  state.unmount();
});
