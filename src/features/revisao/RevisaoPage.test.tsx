import { webcrypto } from 'node:crypto';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
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
import { billingStatus } from '../../../tests/fixtures/acesso';
import { revisaoFixture } from '../../../tests/fixtures/revisao';
import { RevisaoPage } from './RevisaoPage';
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
  path = '/revisao',
  accessState = 'FULL_WRITE',
) {
  const fixture = revisaoFixture(),
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
            <RevisaoPage client={client} />
            <Location />
          </MemoryRouter>
        </ProvedorAcesso>
      </QueryClientProvider>
    </ProvedorAuth>,
  );
  await screen.findByRole('heading', { name: 'Revisão' });
  return { ...rendered, fixture, calls, writes, service, queries };
}
async function select(label: string, value: string) {
  fireEvent.click(
    await screen.findByRole('button', { name: new RegExp(`^${label}`) }),
  );
  fireEvent.click(screen.getByRole('button', { name: value }));
}

async function editor(name = 'Flamengo × Botafogo') {
  await screen.findByRole('heading', { name });
  await waitFor(() =>
    expect(
      screen.queryByText('Conferindo evidência atual…'),
    ).not.toBeInTheDocument(),
  );
}
it('corrige sem recarregar, preservando filtros e UUID antes do POST', async () => {
  const s = await setup(undefined, '/revisao?casa=7&apagadas=1');
  await editor();
  fireEvent.change(screen.getByLabelText('Odd', {}), {
    target: { value: '2,5' },
  });
  fireEvent.click(screen.getByLabelText('Freebet'));
  fireEvent.click(screen.getByRole('button', { name: 'Salvar correção' }));
  await screen.findByText(
    'Revisão resolvida. A fila foi consultada novamente desde o início.',
  );
  expect(s.writes).toHaveLength(1);
  expect(await s.writes[0]!.json()).toMatchObject({
    acao: 'CORRIGIR',
    aposta_corrigida: { odd: 2.5, freebet: true },
  });
  expect(screen.getByTestId('url').textContent).toContain('casa=7');
  await waitFor(() =>
    expect(screen.getByTestId('url').textContent).not.toContain(
      'revisao_operacao',
    ),
  );
});
it('conta não seleciona candidato implicitamente e conserva BIGINT exato', async () => {
  const s = await setup(undefined, '/revisao?revisao_item=102');
  await editor('Palmeiras × Santos');
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar conta' }));
  await screen.findByText('Escolha uma conta válida para esta aposta.');
  expect(s.writes).toHaveLength(0);
  await select(
    'Conta para esta aposta',
    'Principal · Marina · EM_USO · corresponde ao dia do jogo',
  );
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar conta' }));
  await screen.findByText(
    'Revisão resolvida. A fila foi consultada novamente desde o início.',
  );
  expect((await s.writes[0]!.json()).conta_casa_id).toBe('9007199254740993');
});
it('exige tipster e confirmação antes de consolidar', async () => {
  const s = await setup(undefined, '/revisao?motivo=consolidacao');
  await editor('Grêmio × Internacional');
  const same = screen.getByRole('button', {
    name: 'São a mesma aposta',
  });
  fireEvent.click(same);
  await screen.findByText('Escolha o tipster que deve ficar na aposta.');
  await select('Tipster da aposta vinculada', 'Telegram · Rafael');
  fireEvent.click(same);
  fireEvent.click(screen.getByRole('button', { name: 'Voltar à revisão' }));
  expect(s.writes).toHaveLength(0);
  fireEvent.click(same);
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar decisão' }));
  await screen.findByText('Tudo conferido neste recorte');
  expect((await s.writes[0]!.json()).tipster_choice).toBe('telegram');
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Consultar toda a fila' }),
    ).toBeEnabled(),
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Consultar toda a fila' }),
  );
  await editor();
});
it.each(['São apostas distintas', 'Recusar vínculo', 'Descartar revisão'])(
  '%s tem confirmação',
  async (label) => {
    const s = await setup(
      undefined,
      label === 'Descartar revisão' ? '/revisao' : '/revisao?revisao_item=105',
    );
    await editor(
      label === 'Descartar revisão' ? 'Flamengo × Botafogo' : 'Bahia × Vitória',
    );
    fireEvent.click(screen.getByRole('button', { name: label }));
    expect(s.writes).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar decisão' }));
    await screen.findByText(
      'Revisão resolvida. A fila foi consultada novamente desde o início.',
    );
    expect(s.writes).toHaveLength(1);
  },
);
it('print sem stake exige humano e motivo desconhecido tem encaminhamento', async () => {
  const s = await setup(undefined, '/revisao?revisao_item=104');
  await editor('Cruzeiro × Atlético-MG');
  expect(screen.getByLabelText('Valor em unidades')).toHaveValue('');
  fireEvent.click(screen.getByRole('button', { name: 'Salvar correção' }));
  await screen.findByText('Informe o valor em unidades que falta na leitura.');
  fireEvent.change(screen.getByLabelText('Valor em unidades'), {
    target: { value: '1' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar correção' }));
  await screen.findByText(
    'Revisão resolvida. A fila foi consultada novamente desde o início.',
  );
  expect(s.writes).toHaveLength(1);
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: /Precisa de suporte Pendência/ }),
    ).toBeEnabled(),
  );
  fireEvent.click(
    screen.getByRole('button', { name: /Precisa de suporte Pendência/ }),
  );
  await screen.findByRole('heading', { name: 'Precisa de suporte' });
  expect(
    screen.queryByRole('button', { name: 'Salvar correção' }),
  ).not.toBeInTheDocument();
});
it('descarte de Print confirma que nenhuma aposta será criada', async () => {
  const s = await setup(undefined, '/revisao?revisao_item=104');
  await editor('Cruzeiro × Atlético-MG');
  fireEvent.click(screen.getByRole('button', { name: 'Descartar revisão' }));
  await screen.findByText('O print sairá da fila sem criar uma aposta.');
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar decisão' }));
  await screen.findByText(
    'Revisão resolvida. A fila foi consultada novamente desde o início.',
  );
  await waitFor(() =>
    expect(screen.getByTestId('url').textContent).not.toContain(
      'revisao_operacao',
    ),
  );
  expect(s.fixture.receipts.size).toBe(1);
  expect([...s.fixture.receipts.values()][0]!.aposta_chave).toBeNull();
});
it('rede sem commit: consulta mesma intenção antes de replay explícito', async () => {
  let drop = true;
  const s = await setup(async (r) => {
    if (r.method === 'POST' && drop) {
      drop = false;
      throw new TypeError('network');
    }
    return undefined;
  });
  await editor();
  fireEvent.click(screen.getByRole('button', { name: 'Salvar correção' }));
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Consultar decisão' }),
    ).toBeEnabled(),
  );
  expect(s.writes).toHaveLength(1);
  expect(
    screen.queryByRole('button', {
      name: 'Reler pendência antes de nova decisão',
    }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Consultar decisão' }));
  await screen.findByText('Não encontramos o que você procurou.');
  fireEvent.click(
    screen.getByRole('button', { name: 'Reenviar a mesma decisão' }),
  );
  await screen.findByText(
    'Revisão resolvida. A fila foi consultada novamente desde o início.',
  );
  expect(s.writes).toHaveLength(2);
  expect(s.writes[0]!.url).toBe(s.writes[1]!.url);
  expect(await s.writes[0]!.json()).toEqual(await s.writes[1]!.json());
});
it('commit com resposta perdida recupera recibo sem novo POST', async () => {
  let fixture: ReturnType<typeof revisaoFixture> | undefined = undefined;
  const s = await setup(async (r) => {
    if (r.method === 'POST' && fixture) {
      fixture.handle('POST', new URL(r.url), await r.json());
      throw new TypeError('network');
    }
    return undefined;
  });
  fixture = s.fixture;
  await editor();
  fireEvent.click(screen.getByRole('button', { name: 'Salvar correção' }));
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Consultar decisão' }),
    ).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Consultar decisão' }));
  await screen.findByText(
    'Revisão resolvida. A fila foi consultada novamente desde o início.',
  );
  expect(s.writes).toHaveLength(1);
});
it.each([409, 402, 503])(
  'erro %i conserva formulário e exige GET para nova decisão',
  async (status) => {
    const s = await setup(async (r) =>
      r.method === 'POST'
        ? json(
            {
              detail:
                status === 409
                  ? 'review_evidence_changed'
                  : 'review_correction_invalid',
              campo: 'odd',
            },
            status,
          )
        : undefined,
    );
    await editor();
    fireEvent.change(screen.getByLabelText('Odd', {}), {
      target: { value: '3,2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar correção' }));
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Consultar decisão' }),
      ).toBeEnabled(),
    );
    expect(screen.getByLabelText('Odd', {})).toHaveValue('3,2');
    expect(s.writes).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Consultar decisão' }));
    await screen.findByText('Não encontramos o que você procurou.');
    if (status === 409)
      expect(
        screen.queryByRole('button', { name: 'Reenviar a mesma decisão' }),
      ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Reler pendência antes de nova decisão',
      }),
    );
    await screen.findByText(
      'Evidência atualizada. Confira o formulário preservado antes de enviar uma nova decisão.',
    );
    expect(screen.getByLabelText('Odd', {})).toHaveValue('3,2');
  },
);
it('422 definitivo devolve campo editável com valores preservados, sem repetir POST', async () => {
  const s = await setup(async (r) =>
    r.method === 'POST'
      ? json({ detail: 'review_correction_invalid', campo: 'odd' }, 422)
      : undefined,
  );
  await editor();
  fireEvent.change(screen.getByLabelText('Odd', { exact: true }), {
    target: { value: '3,2' },
  });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Salvar correção' }));
  });
  await screen.findByRole('heading', { name: 'Confira os dados do pedido' });
  await waitFor(() =>
    expect(screen.getByLabelText('Odd', { exact: true })).toBeEnabled(),
  );
  await screen.findByRole('button', { name: 'Confira Odd' });
  expect(screen.getByLabelText('Odd', { exact: true })).toHaveValue('3,2');
  fireEvent.click(screen.getByRole('button', { name: 'Confira Odd' }));
  expect(screen.getByLabelText('Odd', { exact: true })).toHaveFocus();
  expect(s.writes).toHaveLength(1);
  expect(
    screen.queryByRole('button', { name: 'Consultar decisão' }),
  ).not.toBeInTheDocument();
});
it('recarga não reconstrói corpo; referência inválida é removível', async () => {
  const s = await setup(
    undefined,
    '/revisao?revisao_operacao=a1234567-1234-1234-1234-123456789abc',
  );
  fireEvent.click(
    await screen.findByRole('button', { name: 'Consultar decisão' }),
  );
  await screen.findByText('Não encontramos o que você procurou.');
  expect(
    screen.queryByRole('button', { name: 'Reenviar a mesma decisão' }),
  ).not.toBeInTheDocument();
  fireEvent.click(
    screen.getByRole('button', {
      name: 'Voltar à fila sem reconstruir a decisão',
    }),
  );
  await editor();
  expect(s.writes).toHaveLength(0);
  s.unmount();
  await setup(undefined, '/revisao?revisao_operacao=x');
  fireEvent.click(
    await screen.findByRole('button', { name: 'Remover referência inválida' }),
  );
  await editor();
});
it('READ_ONLY permite consulta, não escrita; sessão ausente mostra estado próprio', async () => {
  const s = await setup(undefined, '/revisao', 'READ_ONLY');
  await editor();
  expect(
    screen.getByRole('button', { name: 'Salvar correção' }),
  ).toBeDisabled();
  expect(s.writes).toHaveLength(0);
  s.unmount();
  render(<RevisaoPage />);
  expect(screen.getByText('Consultando sessão…')).toBeInTheDocument();
});
it('troca seleção e motivo sem perder casa', async () => {
  await setup(undefined, '/revisao?casa=7');
  await editor();
  fireEvent.click(
    screen.getByRole('button', { name: /Escolher conta Palmeiras/ }),
  );
  await editor('Palmeiras × Santos');
  await select('Motivo', 'Leitura incompleta');
  await editor();
  expect(screen.getByTestId('url').textContent).toContain('motivo=leitura');
  fireEvent.click(
    screen.getByRole('button', { name: 'Leitura incompleta · remover' }),
  );
  await waitFor(() =>
    expect(screen.getByTestId('url').textContent).toBe('?casa=7'),
  );
});
it('consulta de novo por gesto sem remover o recorte ou decidir pela pessoa', async () => {
  const s = await setup(undefined, '/revisao?motivo=leitura&casa=7');
  await editor();
  const before = s.calls.filter((r) =>
    new URL(r.url).pathname.endsWith('/fila'),
  ).length;
  const button = screen.getByRole('button', {
    name: 'Consultar fila novamente',
  });
  await waitFor(() => expect(button).toBeEnabled());
  fireEvent.click(button);
  await waitFor(() =>
    expect(
      s.calls.filter((r) => new URL(r.url).pathname.endsWith('/fila')).length,
    ).toBeGreaterThan(before),
  );
  expect(screen.getByTestId('url').textContent).toContain('motivo=leitura');
  expect(s.writes).toHaveLength(0);
});
it('detalhe indisponível, conta ausente e logout conservam saídas seguras', async () => {
  let detailError = true;
  const s = await setup(async (r) =>
    new URL(r.url).pathname.endsWith('/101') && detailError
      ? json({}, 500)
      : undefined,
  );
  await screen.findByText(
    'O serviço encontrou um problema. Tente novamente mais tarde.',
  );
  detailError = false;
  fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  await editor();
  s.fixture.items[1]!.conta!.encaminhamento = 'cadastrar_conta_na_casa';
  s.fixture.items[1]!.acoes = [];
  s.fixture.items[1]!.conta!.candidatos = [];
  fireEvent.click(
    screen.getByRole('button', { name: /Escolher conta Palmeiras/ }),
  );
  await editor('Palmeiras × Santos');
  expect(
    screen.getByRole('link', { name: 'Ir para Contas e titulares' }),
  ).toBeInTheDocument();
  await act(async () => s.service.logout());
  expect(
    s.queries.getQueriesData({ queryKey: ['revisao-operacional'] }),
  ).toHaveLength(0);
});
