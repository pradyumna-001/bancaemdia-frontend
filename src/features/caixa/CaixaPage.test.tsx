import { webcrypto } from 'node:crypto';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import * as api from '../../api/client';
import { createSession, type SessionService } from '../../auth/session';
import { sessionContext } from '../../auth/protocol';
import { ProvedorAuth } from '../../auth/ProvedorAuth';
import { ProvedorAcesso } from '../acesso/ProvedorAcesso';
import { createAccessController } from '../acesso/controller';
import { parseConfig } from '../../lib/config';
import { ApiError } from '../../api/error';
import { billingStatus } from '../../../tests/fixtures/acesso';
import {
  caixaFixture,
  caixaSaldo,
  caixaMovimentos,
  caixaExtrato,
} from '../../../tests/fixtures/caixa';
import { CaixaPage } from './CaixaPage';
const clean: Array<() => void> = [];
beforeEach(() => {
  vi.stubGlobal('crypto', webcrypto);
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});
afterEach(() => {
  cleanup();
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
  const loc = useLocation(),
    nav = useNavigate();
  return (
    <>
      <output data-testid="url">{loc.search}</output>
      <button onClick={() => void nav('/fora')}>Sair da tela de teste</button>
    </>
  );
}
async function setup(
  custom?: (r: Request) => Promise<Response | undefined>,
  path = '/banca',
  accessState = 'FULL_WRITE',
) {
  const fixture = caixaFixture(),
    calls: Request[] = [],
    writes: Request[] = [];
  const person = sessionContext({
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
      read: async () => person,
      renew: async () => person,
      logout: async () => {},
    },
  });
  await service.resume();
  const client = api.createApiClient(
    parseConfig({ VITE_API_URL: 'https://site.example.org' }),
    {
      captureSession: service.capture,
      fetcher: async (r) => {
        if (new URL(r.url).pathname.endsWith('/billing/status'))
          return json({ ...billingStatus, access: accessState });
        calls.push(r.clone());
        if (r.method !== 'GET') writes.push(r.clone());
        const override = await custom?.(r.clone());
        if (override) return override;
        const result = fixture.handle(
          r.method,
          new URL(r.url),
          r.method === 'GET' ? undefined : await r.json(),
          r.headers.get('Idempotency-Key') ?? undefined,
        );
        return json(result.data, result.status);
      },
    },
  );
  vi.spyOn(api, 'getApiClient').mockReturnValue(client);
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
  const rendered = render(
    <ProvedorAuth service={service}>
      <QueryClientProvider client={queries}>
        <ProvedorAcesso controller={access} client={client}>
          <MemoryRouter initialEntries={[path]}>
            <CaixaPage client={client} />
            <Location />
          </MemoryRouter>
        </ProvedorAcesso>
      </QueryClientProvider>
    </ProvedorAuth>,
  );
  await screen.findByRole('heading', { name: 'Caixa' });
  return { ...rendered, fixture, calls, writes, service, queries };
}
async function select(label: string, value: string) {
  fireEvent.click(
    await screen.findByRole('button', { name: new RegExp(`^${label}`) }),
  );
  fireEvent.click(screen.getByRole('button', { name: value }));
}
async function fill(tipo = 'DEPOSITO', value = '10,00') {
  await screen.findByRole('heading', {
    name: 'Marina · Betano · Principal',
  });
  if (tipo !== 'DEPOSITO')
    await select(
      'Movimento',
      (
        {
          SAQUE: 'Saque',
          TRANSFERENCIA: 'Transferência',
          AJUSTE: 'Ajuste',
        } as Record<string, string>
      )[tipo]!,
    );
  await select(
    tipo === 'TRANSFERENCIA' ? 'Conta de origem' : 'Conta do lançamento',
    'Marina · Betano · Principal',
  );
  if (tipo === 'TRANSFERENCIA')
    await select('Conta de destino', 'Sem titular · Betano · Reserva');
  fireEvent.change(screen.getByLabelText(/^Valor \(R\$\)/), {
    target: { value },
  });
  fireEvent.change(screen.getByLabelText('Data e hora com fuso'), {
    target: { value: '13/10/2026 14:30-03:00' },
  });
  fireEvent.change(screen.getByLabelText('Descrição · opcional'), {
    target: { value: 'Movimento de teste' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Conferir lançamento' }));
}
function confirm() {
  fireEvent.click(
    within(screen.getByRole('dialog', { name: /Confirmar/ })).getByRole(
      'button',
      { name: 'Confirmar' },
    ),
  );
}
it('saldo, parte conhecida e conta sem titular vêm da API; null permanece desconhecido', async () => {
  const s = await setup();
  await screen.findByRole('heading', {
    name: 'Sem titular · Betano · Reserva',
  });
  expect(screen.getAllByText('Saldo desconhecido')).toHaveLength(2);
  expect(screen.getAllByText('R$ 482,00').length).toBeGreaterThan(0);
  expect(s.writes).toHaveLength(0);
  fireEvent.click(
    screen.getAllByText('Entradas e saídas da conta', {
      selector: 'summary',
    })[0]!,
  );
  expect(screen.getAllByText('R$ 120,00').length).toBeGreaterThan(0);
});
it('conferir/cancelar não grava; confirmar duas vezes faz um POST com UUID previamente na URL', async () => {
  let key: string | undefined;
  const s = await setup(async (r) => {
    if (r.method === 'POST') {
      key = r.headers.get('Idempotency-Key')!;
      expect(screen.getByTestId('url').textContent).toContain(key);
    }
    return undefined;
  });
  await fill();
  expect(s.writes).toHaveLength(0);
  fireEvent.click(
    within(screen.getByRole('dialog', { name: /Confirmar/ })).getByRole(
      'button',
      { name: 'Cancelar' },
    ),
  );
  expect(s.writes).toHaveLength(0);
  fireEvent.click(screen.getByRole('button', { name: 'Conferir lançamento' }));
  confirm();
  fireEvent.click(
    screen.getByRole('button', {
      name: 'Confirmar',

      hidden: true,
    }),
  );
  await screen.findByText('Depósito registrado.');
  expect(s.writes).toHaveLength(1);
  expect(s.fixture.receipts.size).toBe(1);
  expect(key).toMatch(/^[a-f\d-]{36}$/);
  expect(await s.writes[0]!.json()).toMatchObject({
    conta_casa_id: 11,
    valor_centavos: 1000,
    descricao: 'Movimento de teste',
  });
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Conferir lançamento' }),
    ).toHaveFocus(),
  );
  expect(screen.getByLabelText(/^Valor \(R\$\)/)).toHaveValue('');
  await waitFor(() =>
    expect(screen.getByTestId('url')).not.toHaveTextContent('movimento='),
  );
});
it.each(['SAQUE', 'TRANSFERENCIA', 'AJUSTE'])(
  'registra %s com o pedido público e recibo real da fixture',
  async (tipo) => {
    const s = await setup();
    await fill(tipo, tipo === 'AJUSTE' ? '-1,50' : '15,00');
    confirm();
    await screen.findByText(
      `${({ SAQUE: 'Saque', TRANSFERENCIA: 'Transferência', AJUSTE: 'Ajuste' } as Record<string, string>)[tipo]} ${tipo === 'TRANSFERENCIA' ? 'registrada' : 'registrado'}.`,
    );
    await waitFor(() =>
      expect(
        screen.getByRole('button', {
          name: 'Conferir lançamento',
        }),
      ).toHaveFocus(),
    );
    expect(s.writes).toHaveLength(1);
    const body = await s.writes[0]!.json();
    expect(body.valor_centavos).toBe(tipo === 'AJUSTE' ? -150 : 1500);
    if (tipo === 'TRANSFERENCIA') {
      expect(body.conta_casa_destino_id).toBe(12);
      expect(
        s.fixture.receipts.values().next().value!.data.movimentos,
      ).toHaveLength(2);
    }
  },
);
it('ajuste global é escolha explícita e bônus não é lançamento manual', async () => {
  const s = await setup();
  await screen.findByRole('heading', { name: 'Marina · Betano · Principal' });
  await select('Movimento', 'Ajuste');
  await select('Conta do lançamento', 'Sem conta · ajuste global');
  expect(
    screen.getByText(/saldo acima cobre somente contas/),
  ).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/^Valor \(R\$\)/), {
    target: { value: '+1,25' },
  });
  fireEvent.change(screen.getByLabelText('Data e hora com fuso'), {
    target: { value: '13/10/2026 14:30Z' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Conferir lançamento' }));
  confirm();
  await screen.findByText('Ajuste registrado.');
  expect(await s.writes[0]!.json()).toMatchObject({
    conta_casa_id: null,
    valor_centavos: 125,
  });
  fireEvent.click(screen.getByRole('button', { name: /^Movimento / }));
  expect(
    screen.queryByRole('button', { name: 'Bônus' }),
  ).not.toBeInTheDocument();
});
it('valor/data inválidos preservam formulário e não criam intenção', async () => {
  const s = await setup();
  await fill('DEPOSITO', '0');
  expect(screen.getByRole('alert')).toHaveTextContent('diferente de zero');
  expect(s.writes).toHaveLength(0);
  expect(screen.getByTestId('url')).not.toHaveTextContent('movimento=');
  fireEvent.change(screen.getByLabelText(/^Valor \(R\$\)/), {
    target: { value: '10' },
  });
  fireEvent.change(screen.getByLabelText('Data e hora com fuso'), {
    target: { value: '31/02/2026 14:30Z' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Conferir lançamento' }));
  expect(screen.getByRole('alert')).toHaveTextContent('data');
});
it('resposta perdida exige GET e replay explícito do mesmo UUID/corpo; não duplica movimento', async () => {
  let first = true;
  const s = await setup(async (r) => {
    if (r.method === 'POST' && first) {
      first = false;
      s.fixture.handle(
        r.method,
        new URL(r.url),
        await r.json(),
        r.headers.get('Idempotency-Key')!,
      );
      throw new ApiError('network', { mutation: true });
    }
    return undefined;
  });
  await fill();
  confirm();
  await screen.findByRole('heading', { name: 'Conferir o lançamento' });
  expect(s.writes).toHaveLength(1);
  expect(
    screen.queryByRole('button', { name: 'Reenviar este lançamento' }),
  ).not.toBeInTheDocument();
  fireEvent.click(
    screen.getByRole('button', { name: 'Conferir movimentos e vínculo' }),
  );
  await screen.findByRole('button', { name: 'Reenviar este lançamento' });
  expect(s.writes).toHaveLength(1);
  fireEvent.click(
    screen.getByRole('button', { name: 'Reenviar este lançamento' }),
  );
  await screen.findByText('Depósito registrado.');
  expect(s.writes).toHaveLength(2);
  expect(s.writes[1]!.headers.get('Idempotency-Key')).toBe(
    s.writes[0]!.headers.get('Idempotency-Key'),
  );
  expect(await s.writes[1]!.json()).toEqual(await s.writes[0]!.json());
  expect(s.fixture.receipts.size).toBe(1);
});
it.each([402, 422, 429])(
  'recusa %s mantém entrada, sem repetição nem sessão fictícia',
  async (status) => {
    const s = await setup(async (r) =>
      r.method === 'POST'
        ? json(
            status === 422
              ? {
                  detail: [
                    {
                      loc: ['body', 'valor_centavos'],
                      msg: 'segredo-msg',
                      input: 'segredo-input',
                      ctx: { token: 'segredo-ctx' },
                      type: 'invalid',
                    },
                  ],
                }
              : { detail: 'privado' },
            status,
            status === 429 ? { 'Retry-After': '2' } : {},
          )
        : undefined,
    );
    await fill();
    confirm();
    await waitFor(() => expect(s.writes).toHaveLength(1));
    await waitFor(() =>
      expect(
        screen.queryByRole('heading', { name: 'Conferir o lançamento' }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByLabelText(/^Valor \(R\$\)/)).toHaveValue('10,00');
    expect(
      screen.queryByText(/segredo-msg|segredo-input|segredo-ctx/),
    ).not.toBeInTheDocument();
    expect(s.service.getSnapshot().phase).toBe('authenticated');
    if (status === 422) {
      fireEvent.click(screen.getByRole('button', { name: 'Confira Valor' }));
      expect(screen.getByLabelText(/^Valor \(R\$\)/)).toHaveFocus();
    }
  },
);
it('READ_ONLY consulta e mantém todos os controles de escrita bloqueados', async () => {
  const s = await setup(undefined, '/banca', 'READ_ONLY');
  await screen.findByRole('heading', { name: 'Marina · Betano · Principal' });
  expect(
    screen.getByRole('button', { name: 'Conferir lançamento' }),
  ).toBeDisabled();
  expect(
    screen
      .getAllByRole('button', { name: 'Salvar vínculo' })
      .every((b) => (b as HTMLButtonElement).disabled),
  ).toBe(true);
  expect(s.writes).toHaveLength(0);
  expect(screen.getByText(/permite consultar os dados/)).toBeInTheDocument();
});
it('filtros, paginação e aba viajam no endereço; filtros externos não são enviados à API', async () => {
  const s = await setup(
    undefined,
    '/banca?caixa=movimentos&caixa_conta=12&caixa_tipo=BONUS&casa=7&apagadas=1',
  );
  await screen.findByText('Bônus', { selector: 'strong' });
  const call = s.calls.find(
    (r) => new URL(r.url).pathname === '/api/v1/caixa',
  )!;
  expect(new URL(call.url).searchParams.get('conta_casa_id')).toBe('12');
  expect(new URL(call.url).searchParams.has('casa_id')).toBe(false);
  fireEvent.click(screen.getByRole('link', { name: 'Extrato' }));
  await screen.findByText(/hora de liquidação não está disponível/);
  expect(screen.getByTestId('url')).toHaveTextContent('casa=7');
  expect(screen.getByTestId('url')).toHaveTextContent('apagadas=1');
  expect(
    screen.getByText(/Tipo e titular estão preservados/),
  ).toBeInTheDocument();
});
it('extrato mostra data de referência da aposta, sem hora de liquidação nem saldo por linha', async () => {
  await setup(undefined, '/banca?caixa=extrato');
  await screen.findByRole('link', { name: 'Ver aposta' });
  expect(screen.getByText('Aposta · GREEN')).toBeInTheDocument();
  expect(screen.getByText('Resultado líquido recebido')).toBeInTheDocument();
  expect(screen.getAllByText(/data da aposta/).length).toBeGreaterThan(0);
});
it('vínculo da banca exige escolha/confirmar; resposta desconhecida só faz GET antes de nova intenção', async () => {
  let lost = true;
  const s = await setup(async (r) => {
    if (r.method === 'PATCH' && lost) {
      lost = false;
      s.fixture.handle('PATCH', new URL(r.url), await r.json());
      throw new ApiError('network', { mutation: true });
    }
    return undefined;
  });
  await screen.findByRole('heading', { name: 'Marina · Betano · Principal' });
  await select('Banca da conta 11', 'Banca de reserva');
  const article = screen
    .getByRole('heading', { name: 'Marina · Betano · Principal' })
    .closest('article')!;
  fireEvent.click(
    within(article).getByRole('button', { name: 'Salvar vínculo' }),
  );
  expect(s.writes).toHaveLength(0);
  fireEvent.click(
    within(screen.getByRole('dialog', { name: /Confirmar vínculo/ })).getByRole(
      'button',
      { name: 'Cancelar' },
    ),
  );
  expect(
    screen.getByRole('button', { name: /^Banca da conta 11 / }),
  ).toHaveFocus();
  fireEvent.click(
    within(article).getByRole('button', { name: 'Salvar vínculo' }),
  );
  confirm();
  await screen.findByRole('heading', { name: 'Conferir o lançamento' });
  expect(s.writes).toHaveLength(1);
  fireEvent.click(
    screen.getByRole('button', { name: 'Conferir movimentos e vínculo' }),
  );
  await screen.findByText(/Vínculo atual consultado/);
  expect(s.writes).toHaveLength(1);
  expect(
    screen.queryByText('Vínculo da conta com a banca atualizado.'),
  ).not.toBeInTheDocument();
});
it('restauração de referência sem corpo nunca reconstrói/reenvia POST', async () => {
  const id = crypto.randomUUID();
  const s = await setup(undefined, `/banca?movimento=${id}`);
  await screen.findByRole('heading', { name: 'Marina · Betano · Principal' });
  expect(
    screen
      .getAllByRole('button', { name: /^Banca da conta / })
      .every((button) => (button as HTMLButtonElement).disabled),
  ).toBe(true);
  expect(
    screen.getByRole('button', { name: 'Conferir lançamento' }),
  ).toBeDisabled();
  fireEvent.click(
    screen.getByRole('button', { name: 'Conferir movimentos e vínculo' }),
  );
  await screen.findByRole('button', { name: 'Encerrar esta consulta' });
  expect(
    screen.queryByRole('button', { name: 'Reenviar este lançamento' }),
  ).not.toBeInTheDocument();
  fireEvent.click(
    screen.getByRole('button', { name: 'Encerrar esta consulta' }),
  );
  expect(screen.getByTestId('url')).not.toHaveTextContent(id);
  expect(s.writes).toHaveLength(0);
});
it('GET de recuperação falho mantém escrita incerta bloqueada', async () => {
  let failed = false;
  const s = await setup(async (r) => {
    if (r.method === 'POST') {
      failed = true;
      throw new ApiError('network', { mutation: true });
    }
    if (failed && new URL(r.url).pathname === '/api/v1/caixa')
      return json({ detail: 'privado' }, 503, { 'Retry-After': '2' });
    return undefined;
  });
  await fill();
  confirm();
  await screen.findByRole('heading', { name: 'Conferir o lançamento' });
  fireEvent.click(
    screen.getByRole('button', { name: 'Conferir movimentos e vínculo' }),
  );
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Conferir movimentos e vínculo' }),
    ).toBeDisabled(),
  );
  expect(s.writes).toHaveLength(1);
  expect(
    screen.queryByRole('button', { name: 'Reenviar este lançamento' }),
  ).not.toBeInTheDocument();
});
it('logout elimina recibo/formulário e descarta resposta tardia de POST', async () => {
  let finish: (value: Response) => void = () => {};
  let request: Request | undefined;
  const s = await setup(async (r) => {
    if (r.method === 'POST') {
      request = r;
      return new Promise((resolve) => {
        finish = resolve;
      });
    }
    return undefined;
  });
  await fill();
  confirm();
  await waitFor(() => expect(s.writes).toHaveLength(1));
  await act(() => s.service.logout());
  expect(request!.signal.aborted).toBe(true);
  await act(async () => {
    finish(
      json(
        s.fixture.handle(
          'POST',
          new URL(request!.url),
          await request!.json(),
          request!.headers.get('Idempotency-Key')!,
        ).data,
        201,
      ),
    );
  });
  expect(screen.queryByText('Depósito registrado.')).not.toBeInTheDocument();
  expect(
    screen.queryByRole('heading', { name: 'Marina · Betano · Principal' }),
  ).not.toBeInTheDocument();
  expect(
    s.queries.getQueryCache().findAll({ queryKey: ['caixa'] }),
  ).toHaveLength(0);
});
it('confirmação tardia preserva o recorte escolhido durante o envio', async () => {
  let finish: (value: Response) => void = () => {};
  let sent: Request | undefined;
  const s = await setup(async (r) => {
    if (r.method === 'POST') {
      sent = r;
      return new Promise((resolve) => {
        finish = resolve;
      });
    }
  }, '/banca?casa=7&apagadas=1');
  await fill();
  confirm();
  await waitFor(() => expect(s.writes).toHaveLength(1));
  expect(
    screen.queryByRole('heading', { name: 'Conferir o lançamento' }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByText('Registrando alteração no Caixa…'),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole('link', { name: 'Movimentos' }));
  await select('Conta do Caixa', 'Sem titular · Betano · Reserva');
  expect(screen.getByTestId('url')).toHaveTextContent('caixa_conta=12');
  await act(async () =>
    finish(
      json(
        s.fixture.handle(
          'POST',
          new URL(sent!.url),
          await sent!.json(),
          sent!.headers.get('Idempotency-Key')!,
        ).data,
        201,
      ),
    ),
  );
  await screen.findByText('Depósito registrado.');
  await waitFor(() =>
    expect(screen.getByTestId('url')).not.toHaveTextContent('movimento='),
  );
  expect(screen.getByTestId('url')).toHaveTextContent('caixa=movimentos');
  expect(screen.getByTestId('url')).toHaveTextContent('caixa_conta=12');
  expect(screen.getByTestId('url')).toHaveTextContent('casa=7');
  expect(screen.getByTestId('url')).toHaveTextContent('apagadas=1');
});
it('estado vazio orienta ação, rótulos ausentes têm erro seguro e query inválida usa defaults', async () => {
  await setup(
    async (r) =>
      new URL(r.url).pathname === '/api/v1/caixa/saldo'
        ? json({ ...caixaSaldo, contas: [], bancas: [] })
        : undefined,
    '/banca?caixa=x&caixa_pagina=-1&data_corte=erro&movimento=invalido',
  );
  await screen.findByRole('heading', { name: 'Comece por uma conta' });
  expect(
    screen.getByRole('link', { name: 'Ver Contas e titulares' }),
  ).toBeInTheDocument();
  expect(screen.getByText(/parâmetros inválidos/)).toBeInTheDocument();
  expect(screen.getByText(/referência inválida/)).toBeInTheDocument();
});
it('falha de identificação e resposta financeira inválida não fabricam valores', async () => {
  const s = await setup(async (r) =>
    new URL(r.url).pathname.endsWith('/matriz')
      ? json({ detail: 'segredo' }, 500)
      : undefined,
  );
  await screen.findByText(/identificação de algumas contas/);
  expect(screen.getAllByText(/identificação pendente/).length).toBeGreaterThan(
    0,
  );
  expect(s.writes).toHaveLength(0);
});
it('paginação e escolhas de conta/titular/tipo consultam o recorte publicado', async () => {
  const s = await setup(async (r) => {
    const url = new URL(r.url);
    if (url.pathname === '/api/v1/caixa')
      return json({
        data: caixaMovimentos.data,
        pagination: {
          page: Number(url.searchParams.get('page')),
          page_size: 20,
          total: 21,
        },
      });
  }, '/banca?caixa=movimentos');
  await screen.findByText('Entrada inicial');
  fireEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
  await screen.findByText('Página 2 · 21 itens neste recorte');
  fireEvent.click(screen.getByRole('button', { name: 'Página anterior' }));
  await screen.findByText('Página 1 · 21 itens neste recorte');
  await screen.findByRole('heading', { name: 'Registrar movimento' });
  await select('Conta do Caixa', 'Marina · Betano · Principal');
  await select('Titular dos movimentos', 'Marina');
  await select('Tipo do movimento', 'Depósito');
  await waitFor(() =>
    expect(
      s.calls.some(
        (r) => new URL(r.url).searchParams.get('tipo') === 'DEPOSITO',
      ),
    ).toBe(true),
  );
  expect(screen.getByTestId('url')).toHaveTextContent('caixa_conta=11');
  expect(screen.getByTestId('url')).toHaveTextContent('caixa_titular=1');
  fireEvent.click(screen.getByRole('button', { name: 'Remover filtro conta' }));
  expect(screen.getByTestId('url')).not.toHaveTextContent('caixa_conta=');
});
it('saldo histórico usa picker, nova consulta e vínculo/desvínculo confirmado', async () => {
  const s = await setup();
  await screen.findByRole('heading', { name: 'Marina · Betano · Principal' });
  fireEvent.click(screen.getByRole('button', { name: /^Saldo até a data / }));
  const picker = screen.getByRole('dialog', { name: 'Saldo até a data' });
  fireEvent.click(
    within(picker).getAllByRole('button', { name: /^Selecionar / })[0]!,
  );
  await waitFor(() =>
    expect(
      s.calls.some((r) => new URL(r.url).searchParams.has('data_corte')),
    ).toBe(true),
  );
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Consultar saldo novamente' }),
    ).toBeEnabled(),
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Consultar saldo novamente' }),
  );
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: /^Banca da conta 11 / }),
    ).toBeEnabled(),
  );
  await select('Banca da conta 11', 'Sem banca');
  const article = screen
    .getByRole('heading', { name: 'Marina · Betano · Principal' })
    .closest('article')!;
  fireEvent.click(
    within(article).getByRole('button', { name: 'Salvar vínculo' }),
  );
  confirm();
  await screen.findByText('Vínculo da conta com a banca atualizado.');
  expect(await s.writes[0]!.json()).toEqual({ banca_id: null });
});
it.each(['saldo', 'lista', 'identificação'])(
  'falha %s permite apenas nova consulta segura',
  async (kind) => {
    let fail = true;
    const s = await setup(
      async (r) => {
        const path = new URL(r.url).pathname;
        const affected =
          kind === 'saldo'
            ? path.endsWith('/saldo')
            : kind === 'lista'
              ? path === '/api/v1/caixa'
              : path.endsWith('/matriz');
        if (affected && fail) return json({ detail: 'interno' }, 500);
      },
      kind === 'lista' ? '/banca?caixa=movimentos' : '/banca',
    );
    await screen.findByRole('button', { name: 'Tentar novamente' });
    fail = false;
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    if (kind === 'lista') await screen.findByText('Entrada inicial');
    else
      await screen.findByRole('heading', {
        name: 'Marina · Betano · Principal',
      });
    expect(s.writes).toHaveLength(0);
  },
);
it('lista vazia oferece nova consulta; extrato nulo mantém origem criação e ausência de data', async () => {
  let empty = true;
  const s = await setup(async (r) => {
    if (new URL(r.url).pathname.endsWith('/extrato'))
      return json(
        empty
          ? { ...caixaExtrato, data: [] }
          : {
              ...caixaExtrato,
              data: [
                {
                  ...caixaExtrato.data[1]!,
                  chave: null,
                  data_referencia: null,
                  data_referencia_origem: 'criada_em',
                },
              ],
            },
      );
  }, '/banca?caixa=extrato');
  await screen.findByRole('heading', { name: 'Nenhum item neste recorte' });
  empty = false;
  fireEvent.click(screen.getByRole('button', { name: 'Consultar novamente' }));
  await screen.findByText(/Data não informada/);
  expect(screen.getByText(/data de criação/)).toBeInTheDocument();
  expect(s.writes).toHaveLength(0);
});
it('conflito não pode prender a tela nem repetir pedido; encerramento explícito após GET não desfaz', async () => {
  const s = await setup(async (r) =>
    r.method === 'POST' ? json({ detail: 'conflito' }, 409) : undefined,
  );
  await fill();
  confirm();
  await screen.findByRole('heading', { name: 'Conferir o lançamento' });
  fireEvent.click(
    screen.getByRole('button', { name: 'Conferir movimentos e vínculo' }),
  );
  await screen.findByRole('button', { name: 'Encerrar sem reenviar' });
  fireEvent.click(
    screen.getByRole('button', { name: 'Encerrar sem reenviar' }),
  );
  await screen.findByText('Consulta encerrada. Nenhum movimento foi desfeito.');
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Conferir lançamento' }),
    ).toBeEnabled(),
  );
  expect(screen.getByLabelText(/^Valor \(R\$\)/)).toHaveValue('');
  expect(s.writes).toHaveLength(1);
});
