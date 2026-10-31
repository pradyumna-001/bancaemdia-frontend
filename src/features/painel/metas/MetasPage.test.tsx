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
  createMetasFixture,
  metasFixture,
} from '../../../../tests/fixtures/metas';
import { MetasPage } from './MetasPage';
import { MetaForm } from './MetaForm';
import { useMetas } from './useMetas';
import {
  LIST,
  conferir,
  conferirLista,
  statusLista,
  entradaValor,
  editarValor,
  apresentar,
  metrica,
  type Entrada,
} from './protocol';

const clean: Array<() => void> = [];
const json = (value: unknown, status = 200, headers = {}) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
beforeEach(() => {
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
  clean.splice(0).forEach((work) => work());
  vi.restoreAllMocks();
});
async function open(
  options: {
    page?: boolean;
    empty?: boolean;
    readOnly?: boolean;
    initial?: string;
    beforeBilling?: (count: number) => Promise<void>;
    override?: (
      request: Request,
    ) => Promise<Response | undefined> | Response | undefined;
  } = {},
) {
  const queries = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  let context = sessionContext({
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
      read: async () => context,
      renew: async () => context,
      logout: async () => {},
    },
    exclusive: async (_scope, work) => work(),
  });
  await session.resume();
  const controller = createAccessController(session, queries);
  const api = createMetasFixture(options.empty ? [] : metasFixture);
  const requests: Request[] = [];
  let billing = 0;
  const client = createApiClient(
    parseConfig({ VITE_API_URL: 'http://127.0.0.1:8000' }),
    {
      captureSession: session.capture,
      fetcher: async (request) => {
        requests.push(request.clone());
        const url = new URL(request.url);
        if (url.pathname === '/api/v1/billing/status') {
          await options.beforeBilling?.(++billing);
          return json({
            ...billingStatus,
            access: options.readOnly ? 'READ_ONLY' : 'FULL_WRITE',
          });
        }
        const custom = await options.override?.(request.clone());
        if (custom) return custom;
        const result = api.handle(
          request.method,
          url,
          ['POST', 'PATCH'].includes(request.method)
            ? await request.json()
            : undefined,
        );
        return json(result.data, result.status);
      },
    },
  );
  let hook: ReturnType<typeof useMetas>;
  function Harness() {
    hook = useMetas(client);
    return <p>Harness</p>;
  }
  const router = createMemoryRouter(
    [
      {
        path: '*',
        element: options.page ? <MetasPage client={client} /> : <Harness />,
      },
    ],
    {
      initialEntries: [options.initial ?? '/painel/metas?casa=7&apagadas=1'],
    },
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
  if (!options.page)
    await waitFor(() => expect(hook!.query.isFetching).toBe(false));
  return {
    get hook() {
      return hook!;
    },
    api,
    requests,
    queries,
    client,
    router,
    session,
    view,
    rotate: async () => {
      context = {
        ...context,
        version: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa:2',
      };
      await session.resume();
    },
  };
}
const body: Entrada = {
  titulo: 'Meta nova',
  metrica: 'lucro_centavos',
  inicio: '2026-10-01',
  fim: '2026-10-31',
  alvo: '100000',
  linha_base: '0',
};
const writes = (requests: Request[]) =>
  requests.filter((request) => !['GET', 'HEAD'].includes(request.method));
function choose(label: string, value: string) {
  const field = screen.getByText(label, {
    selector: 'span',
  }).parentElement!;
  fireEvent.click(field.querySelector('button')!);
  fireEvent.click(
    within(screen.getByRole('dialog', { name: label })).getByText(value, {
      selector: 'button',
    }),
  );
}
function date(label: string, position: number) {
  const field = screen.getByText(label, {
    selector: 'span',
  }).parentElement!;
  fireEvent.click(field.querySelector('button')!);
  const target = screen
    .getByRole('dialog', { name: label })
    .querySelectorAll<HTMLButtonElement>('button[data-dia]')[position]!;
  fireEvent.click(target);
}
async function fillNew() {
  expect(
    screen.getByRole('button', {
      name: 'Nova meta',
      hidden: true,
    }),
  ).toBeVisible();
  fireEvent.click(
    await screen.findByRole('button', {
      name: 'Nova meta',
      hidden: true,
    }),
  );
  fireEvent.change(screen.getByLabelText('Título'), {
    target: { value: 'Objetivo escolhido' },
  });
  choose('Métrica', 'Lucro');
  date('Data inicial da meta', 10);
  date('Data final da meta', 18);
  fireEvent.change(screen.getByLabelText('Alvo', { exact: true }), {
    target: { value: '1000,00' },
  });
  fireEvent.change(screen.getByLabelText('Linha base', { exact: true }), {
    target: { value: '0' },
  });
}

it('valida apenas o contrato e formata todas as unidades sem derivar progresso', () => {
  expect(conferirLista(metasFixture)).toHaveLength(5);
  expect(metrica('roi')).toBe(true);
  expect(metrica('saldo')).toBe(false);
  expect(statusLista('invalida')).toBe('todas');
  expect(statusLista(null)).toBe('todas');
  expect(statusLista('arquivada')).toBe('arquivada');
  expect(entradaValor('-12,5', 'roi')).toBe('-0.125');
  expect(editarValor('0.125000', 'win_rate')).toBe('12,5');
  expect(
    entradaValor(editarValor('0.000001', 'lucro_centavos'), 'lucro_centavos'),
  ).toBe('0.000001');
  expect(apresentar('0.100000', 'roi')).toBe('10%');
  expect(apresentar('4.000000', 'total_apostas')).toBe('4');
  expect(apresentar('-100.000000', 'giro_centavos')).toBe('−R$ 1,00');
  for (const bad of [
    undefined,
    { ...metasFixture[0], id: 0 },
    { ...metasFixture[0], fim: '2026-02-30' },
    { ...metasFixture[0], alvo: 'NaN' },
    { ...metasFixture[0], progresso: 'Infinity' },
  ])
    expect(() => conferir(bad as (typeof metasFixture)[0], true)).toThrow();
  expect(() => conferirLista([metasFixture[0]!, metasFixture[0]!])).toThrow();
  expect(() => conferirLista(undefined)).toThrow();
});
it('lista toda a população, null, status e progresso fora da faixa com filtros preservados', async () => {
  const view = await open({
    page: true,
    initial: '/painel/metas?casa=7&apagadas=1&meta_status=invalido',
  });
  await screen.findByRole('heading', { name: 'Resultado de outubro' });
  expect(screen.getByText('133,3333%')).toBeVisible();
  expect(screen.getByText('Não calculável')).toBeVisible();
  expect(screen.getByText(/não se aplicam às metas/)).toBeVisible();
  expect(screen.getByRole('link', { name: 'Ver Análises' })).toHaveAttribute(
    'href',
    '/painel/analises?casa=7&apagadas=1&meta_status=invalido',
  );
  choose('Mostrar metas', 'Arquivada');
  expect(
    screen.queryByRole('heading', { name: 'Resultado de outubro' }),
  ).not.toBeInTheDocument();
  expect(view.router.state.location.search).toContain('casa=7');
  expect(view.router.state.location.search).toContain('meta_status=arquivada');
  choose('Mostrar metas', 'Todas as metas');
  expect(
    await screen.findByRole('heading', { name: 'Resultado de outubro' }),
  ).toBeVisible();
});
it('cria com campos explícitos e usa o identificador retornado pela API', async () => {
  const view = await open({ page: true, empty: true });
  await fillNew();
  fireEvent.click(
    screen.getByRole('button', {
      name: 'Criar meta',
      hidden: true,
    }),
  );
  await screen.findByText('Meta criada.');
  expect(await writes(view.requests)[0]!.json()).toMatchObject({
    alvo: '100000',
    linha_base: '0',
  });
  expect(
    screen.getByRole('button', { name: 'Editar Objetivo escolhido' }),
  ).toBeVisible();
});
it('edita com dados atuais sem transformar status em alvo atingido', async () => {
  const view = await open({ page: true });
  await screen.findByRole('heading', { name: 'Resultado de outubro' });
  fireEvent.click(
    screen.getByRole('button', { name: 'Editar Resultado de outubro' }),
  );
  expect(screen.getByLabelText('Alvo', { exact: true })).toHaveValue('1000');
  fireEvent.change(screen.getByLabelText('Alvo', { exact: true }), {
    target: { value: '900' },
  });
  choose('Status da meta', 'Concluída');
  fireEvent.click(
    screen.getByRole('button', { name: 'Salvar alterações da meta' }),
  );
  await screen.findByText('Meta atualizada.');
  expect(screen.getByText('46,6667%')).toBeVisible();
  expect(await writes(view.requests)[0]!.json()).toMatchObject({
    alvo: '90000',
    status: 'concluida',
  });
});
it('arquiva com confirmação e conserva a meta consultável no histórico', async () => {
  await open({ page: true });
  await screen.findByRole('heading', { name: 'Resultado de outubro' });
  const archive = screen.getByRole('button', {
    name: 'Arquivar Resultado de outubro',
  });
  fireEvent.click(archive);
  let dialog = screen.getByRole('dialog', { name: 'Arquivar esta meta?' });
  expect(
    within(dialog).getByRole('button', { name: 'Agora não' }),
  ).toHaveFocus();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Agora não' }));
  expect(archive).toHaveFocus();
  fireEvent.click(archive);
  dialog = screen.getByRole('dialog', { name: 'Arquivar esta meta?' });
  fireEvent.click(
    within(dialog).getByRole('button', { name: 'Arquivar meta' }),
  );
  await screen.findByText(/Meta arquivada/);
  expect(
    screen.getByRole('heading', { name: 'Resultado de outubro' }),
  ).toBeVisible();
  fireEvent.click(
    screen.getByRole('button', { name: 'Editar Resultado de outubro' }),
  );
  expect(screen.getByText('Status: Arquivada.')).toBeVisible();
});
it('valida datas e precisão preservando campos sem enviar o formulário', () => {
  const submit = vi.fn();
  render(<MetaForm meta={metasFixture[0]!} disabled={false} submit={submit} />);
  date('Data inicial da meta', 24);
  date('Data final da meta', 10);
  fireEvent.click(
    screen.getByRole('button', {
      name: 'Salvar alterações da meta',
    }),
  );
  expect(screen.getByText(/data inicial deve/)).toBeVisible();
  date('Data final da meta', 26);
  fireEvent.change(screen.getByLabelText('Alvo', { exact: true }), {
    target: { value: 'NaN' },
  });
  fireEvent.click(
    screen.getByRole('button', {
      name: 'Salvar alterações da meta',
    }),
  );
  expect(screen.getByText(/Confira os campos/)).toBeVisible();
  expect(submit).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Título')).toHaveValue('Resultado de outubro');
});
it('não preenche metas novas por padrão e limpa valores ao escolher outra unidade', async () => {
  await open({ page: true, empty: true });
  await screen.findByText('Você ainda não criou metas');
  fireEvent.click(
    screen.getByRole('button', {
      name: 'Nova meta',
      hidden: true,
    }),
  );
  expect(screen.getByLabelText('Título')).toHaveValue('');
  expect(screen.getByLabelText('Linha base', { exact: true })).toHaveValue('');
  choose('Métrica', 'Lucro');
  fireEvent.change(screen.getByLabelText('Alvo', { exact: true }), {
    target: { value: '100' },
  });
  choose('Métrica', 'ROI');
  expect(screen.getByLabelText('Alvo', { exact: true })).toHaveValue('');
  choose('Métrica', 'Escolher métrica');
  expect(screen.getByText('Escolha primeiro a métrica.')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Fechar formulário' }));
  fireEvent.click(
    within(
      screen.getByRole('dialog', { name: 'Fechar este formulário?' }),
    ).getByRole('button', { name: 'Fechar formulário' }),
  );
  fireEvent.click(
    screen.getByRole('button', {
      name: 'Nova meta',
      hidden: true,
    }),
  );
  expect(screen.getByLabelText('Título')).toHaveValue('');
  expect(screen.getByLabelText('Linha base', { exact: true })).toHaveValue('');
});
it('mantém consulta em READ_ONLY e recusa mutações sem enviar', async () => {
  const view = await open({ readOnly: true });
  await act(() => view.hook.write({ kind: 'create', body }));
  expect(writes(view.requests)).toHaveLength(0);
  await act(() => view.hook.consult());
  expect(view.hook.notice).toBe('Metas consultadas.');
});
it('mostra leitura, vazio de status e erro estilizado', async () => {
  const view = await open({
    page: true,
    readOnly: true,
    initial: '/painel/metas?meta_status=concluida',
    override: (r) =>
      new URL(r.url).pathname === LIST ? json([metasFixture[0]]) : undefined,
  });
  await screen.findByText('Nenhuma meta neste status');
  expect(
    screen.getByRole('button', {
      name: 'Nova meta',
      hidden: true,
    }),
  ).toBeDisabled();
  expect(screen.getByText(/Você pode consultar metas/)).toBeVisible();
  expect(writes(view.requests)).toHaveLength(0);
});
it.each([402, 409, 422, 429, 503])(
  'trata recusa %s sem repetir nem perder o formulário',
  async (status) => {
    const view = await open({
      override: (r) =>
        r.method === 'POST' && new URL(r.url).pathname === LIST
          ? json(
              {
                detail: [
                  { loc: ['body', 'titulo'], input: 'privado', msg: 'interno' },
                ],
              },
              status,
              { 'Retry-After': '61' },
            )
          : undefined,
    });
    await act(() => view.hook.write({ kind: 'create', body }));
    expect(writes(view.requests)).toHaveLength(1);
    expect(view.hook.error).toBeTruthy();
    if (status === 429 || status === 503) expect(view.hook.waiting).toBe(true);
  },
);
it('não reconcilia criação desconhecida pelo título/lista nem reenvia o pedido', async () => {
  let lose = true;
  const view = await open({
    override: (r) => {
      if (r.method === 'POST' && new URL(r.url).pathname === LIST && lose) {
        lose = false;
        throw new TypeError('falha de rede');
      }
      return undefined;
    },
  });
  await act(() => view.hook.write({ kind: 'create', body }));
  expect(view.hook.unknown?.kind).toBe('create');
  await act(() => view.hook.write({ kind: 'create', body }));
  await act(() => view.hook.consult());
  expect(view.hook.unknown?.kind).toBe('create');
  expect(view.hook.notice).toContain('não confirma');
  expect(writes(view.requests)).toHaveLength(1);
  act(() => expect(view.hook.close()).toBe(true));
  expect(view.hook.unknown).toBeUndefined();
});
it('preserva criação incerta visível e não usa a lista como prova de aplicação', async () => {
  await open({
    page: true,
    empty: true,
    override: (r) => {
      if (r.method === 'POST') throw new TypeError('rede');
      return undefined;
    },
  });
  await fillNew();
  fireEvent.click(
    screen.getByRole('button', {
      name: 'Criar meta',
      hidden: true,
    }),
  );
  await screen.findByRole('heading', {
    name: 'Não recebemos confirmação deste pedido',
  });
  expect(screen.getByLabelText('Título')).toHaveValue('Objetivo escolhido');
  expect(screen.getByLabelText('Título')).toBeVisible();
  expect(
    screen.getByRole('button', {
      name: 'Criar meta',
      hidden: true,
    }),
  ).toBeDisabled();
  fireEvent.click(
    screen.getByRole('button', { name: 'Consultar lista de metas' }),
  );
  await screen.findByText(/Lista consultada/);
  expect(
    screen.getByRole('button', {
      name: 'Criar meta',
      hidden: true,
    }),
  ).toBeDisabled();
});
it('fecha criação incerta por gesto explícito sem prometer cancelamento e reabre vazia', async () => {
  await open({
    page: true,
    empty: true,
    override: (r) => {
      if (r.method === 'POST') throw new TypeError('rede');
      return undefined;
    },
  });
  await fillNew();
  fireEvent.click(
    screen.getByRole('button', {
      name: 'Criar meta',
      hidden: true,
    }),
  );
  await screen.findByRole('heading', {
    name: 'Não recebemos confirmação deste pedido',
  });
  fireEvent.click(
    screen.getByRole('button', {
      name: 'Encerrar este acompanhamento',
      hidden: true,
    }),
  );
  const modal = screen.getByRole('dialog', { name: 'Fechar este formulário?' });
  expect(within(modal).getByText(/não cancela/)).toBeVisible();
  fireEvent.click(
    within(modal).getByRole('button', { name: 'Fechar formulário' }),
  );
  fireEvent.click(
    screen.getByRole('button', {
      name: 'Nova meta',
      hidden: true,
    }),
  );
  expect(screen.getByLabelText('Título')).toHaveValue('');
});
it.each(['edit', 'archive'] as const)(
  'consulta recurso atual após %s incerto antes de preparar nova edição',
  async (kind) => {
    const view = await open({
      override: (r) => {
        if (r.method === 'PATCH' || r.method === 'DELETE')
          throw new TypeError('rede');
        return undefined;
      },
    });
    await act(() =>
      view.hook.write(
        kind === 'edit'
          ? { kind, id: 1, body: { titulo: 'Edição' } }
          : { kind, id: 1 },
      ),
    );
    act(() => expect(view.hook.close()).toBe(false));
    await act(() => view.hook.consult());
    expect(view.hook.unknown?.consulted).toBe(true);
    expect(view.hook.notice).toContain('não é um recibo');
    act(() => expect(view.hook.close()).toBe(true));
    expect(writes(view.requests)).toHaveLength(1);
  },
);
it.each([404, 503])(
  'consulta recusada %s não vira confirmação nem repete a escrita',
  async (status) => {
    const view = await open({
      override: (r) => {
        if (r.method === 'PATCH') throw new TypeError('rede');
        if (new URL(r.url).pathname.endsWith('/metas/1'))
          return json({ detail: 'x' }, status, { 'Retry-After': '61' });
      },
    });
    await act(() =>
      view.hook.write({ kind: 'edit', id: 1, body: { titulo: 'Edição' } }),
    );
    await act(() => view.hook.consult());
    expect(view.hook.unknown?.consulted).toBe(status === 404);
    expect(view.hook.error).toBeTruthy();
  },
);
it('recusa resposta de mutation incompatível como resultado desconhecido', async () => {
  const view = await open({
    override: (r) =>
      r.method === 'DELETE' ? json(metasFixture[0]) : undefined,
  });
  await act(() => view.hook.write({ kind: 'archive', id: 1 }));
  expect(view.hook.unknown?.kind).toBe('archive');
});
it('descarta resposta após saída e impede toque concorrente', async () => {
  let release!: () => void;
  const latch = new Promise<void>((resolve) => {
    release = resolve;
  });
  const view = await open({
    override: async (r) => {
      if (r.method === 'POST') {
        await latch;
        return json({ ...metasFixture[0], id: 100 }, 201);
      }
    },
  });
  let pending: Promise<unknown>;
  act(() => {
    pending = view.hook.write({ kind: 'create', body });
  });
  await waitFor(() => expect(writes(view.requests)).toHaveLength(1));
  await act(() => view.hook.write({ kind: 'create', body }));
  view.view.unmount();
  await act(async () => {
    release();
    await pending;
  });
  expect(writes(view.requests)).toHaveLength(1);
  expect(view.queries.getQueryData(['metas', 'outro'])).toBeUndefined();
});
it('mantém fuso compartilhado e confirma a preferência no servidor', async () => {
  const view = await open({ page: true });
  await screen.findByText(/Salvo na conta/);
  fireEvent.click(screen.getByRole('button', { name: 'Consultar fuso salvo' }));
  await screen.findByText(/Fuso atual confirmado/);
  expect(
    view.requests.some((r) =>
      new URL(r.url).pathname.endsWith('/painel/preferencias'),
    ),
  ).toBe(true);
});
it('logout durante parsing remove estado privado e rejeita a resposta antiga', async () => {
  let stream!: ReadableStreamDefaultController<Uint8Array>;
  const bytes = new TextEncoder().encode(
    JSON.stringify({ ...metasFixture[0], id: 100 }),
  );
  const view = await open({
    override: (request) => {
      if (request.method !== 'POST') return;
      return new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            stream = controller;
            controller.enqueue(bytes.slice(0, -1));
          },
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      );
    },
  });
  let pending!: Promise<unknown>;
  act(() => {
    pending = view.hook.write({ kind: 'create', body });
  });
  await waitFor(() => expect(view.hook.unknown?.kind).toBe('create'));
  await waitFor(() => expect(stream).toBeDefined());
  await act(() => view.session.logout());
  await act(async () => {
    stream.enqueue(bytes.slice(-1));
    stream.close();
    await pending;
  });
  expect(view.session.getSnapshot().phase).toBe('anonymous');
  expect(view.hook.notice).toBe('');
  expect(view.hook.unknown).toBeUndefined();
  expect(view.hook.busy).toBe(false);
  expect(view.queries.getQueryData(['metas', 'outro'])).toBeUndefined();
});
it('renovação antes do POST não envia nem prende o formulário em execução', async () => {
  const view: Awaited<ReturnType<typeof open>> = await open({
    beforeBilling: async (count) => {
      if (count === 2) await view.rotate();
    },
  });
  await act(() => view.hook.write({ kind: 'create', body }));
  expect(writes(view.requests)).toHaveLength(0);
  expect(view.hook.busy).toBe(false);
  expect(view.hook.unknown).toBeUndefined();
  expect(view.hook.error).toBeTruthy();
});
