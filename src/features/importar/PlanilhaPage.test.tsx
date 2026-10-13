import { webcrypto } from 'node:crypto';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import * as api from '../../api/client';
import * as config from '../../lib/config';
import { parseConfig } from '../../lib/config';
import { ProvedorAuth } from '../../auth/ProvedorAuth';
import { createAccessController } from '../acesso/controller';
import { ProvedorAcesso } from '../acesso/ProvedorAcesso';
import { billingStatus } from '../../../tests/fixtures/acesso';
import { createSession, type SessionService } from '../../auth/session';
import { sessionContext } from '../../auth/protocol';
import { EnviarPage } from '../enviar/EnviarPage';
import {
  sheetFixture,
  sourceId,
  previewId,
  confirmationId,
  preview,
  rows,
  result,
  source,
} from '../../../tests/fixtures/planilha';
const settings = parseConfig({ VITE_API_URL: 'https://site.example.org' });
const services: SessionService[] = [];
const cleanupAccess: Array<() => void> = [];
beforeEach(() => {
  vi.spyOn(config, 'getConfig').mockReturnValue(settings);
  vi.stubGlobal('crypto', webcrypto);
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
  URL.createObjectURL = vi.fn(() => `blob:${crypto.randomUUID()}`);
  URL.revokeObjectURL = vi.fn();
  Element.prototype.scrollBy = vi.fn();
});
afterEach(() => {
  services.splice(0).forEach((s) => s.dispose());
  cleanupAccess.splice(0).forEach((fn) => fn());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
function json(data: unknown, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}
function Location() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output data-testid="url">{location.pathname + location.search}</output>
      <button
        onClick={() =>
          void navigate(`/enviar?entrada=planilha&fonte=${sourceId}&casa=8`)
        }
      >
        Mudar endereço de teste
      </button>
    </>
  );
}
async function setup(
  fetcher: (r: Request) => Promise<Response> = async () => json({}, 404),
  path = '/enviar?entrada=planilha&estado=GREEN&apagadas=1',
  accessState: 'FULL_WRITE' | 'READ_ONLY' = 'FULL_WRITE',
) {
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
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
  });
  const service = createSession({
    baseUrl: settings.apiUrl,
    queryClient: queries,
    exclusive: async (_signal, work) => work(),
    transport: {
      read: async () => person,
      renew: async () => person,
      logout: async () => {},
    },
  });
  services.push(service);
  await service.resume();
  const client = api.createApiClient(settings, {
    captureSession: service.capture,
    fetcher: (r) =>
      new URL(r.url).pathname === '/api/v1/billing/status'
        ? Promise.resolve(json({ ...billingStatus, access: accessState }))
        : fetcher(r),
  });
  const access = createAccessController(service, queries);
  await queries.fetchQuery({
    queryKey: access.key(),
    queryFn: ({ signal }) => access.consult(client, signal),
  });
  cleanupAccess.push(() => {
    access.dispose();
    queries.clear();
  });
  vi.spyOn(api, 'getApiClient').mockReturnValue(client);
  const view = render(
    <ProvedorAuth service={service}>
      <QueryClientProvider client={queries}>
        <ProvedorAcesso controller={access} client={client}>
          <MemoryRouter initialEntries={[path]}>
            <EnviarPage />
            <Location />
          </MemoryRouter>
        </ProvedorAcesso>
      </QueryClientProvider>
    </ProvedorAuth>,
  );
  return { ...view, service };
}

const restored = `/enviar?entrada=planilha&fonte=${sourceId}&previa=${previewId}&casa=7&apagadas=1`;
function simulated(
  custom?: (request: Request) => Promise<Response | undefined>,
) {
  const fixture = sheetFixture();
  const writes: Request[] = [];
  const calls: Request[] = [];
  return {
    fixture,
    writes,
    calls,
    fetch: async (request: Request) => {
      calls.push(request);
      if (request.method !== 'GET') writes.push(request.clone());
      const override = await custom?.(request);
      if (override) return override;
      const url = new URL(request.url);
      const body = request.headers
        .get('content-type')
        ?.includes('application/json')
        ? await request.json()
        : undefined;
      const value = fixture.handle(
        request.method,
        url.pathname,
        url.searchParams,
        body,
      );
      return json(value.data, value.status);
    },
  };
}
async function ready() {
  await screen.findByRole('heading', { name: 'Prévia pronta para conferir' });
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Confirmar importação' }),
    ).toBeEnabled(),
  );
}
async function choose(name = 'apostas.xlsx', content = 'fake-xlsx') {
  await screen.findByLabelText('Arquivo XLSX');
  fireEvent.change(screen.getByLabelText('Arquivo XLSX'), {
    target: { files: [new File([content], name)] },
  });
}
async function map(label: string, name: string) {
  fireEvent.click(
    screen.getByRole('button', { name: new RegExp(`^${label}`) }),
  );
  fireEvent.click(screen.getByRole('button', { name }));
}
it('separa os três canais e cria fonte antes do PUT preservando filtros', async () => {
  const server = simulated();
  server.fixture.sources.clear();
  await setup(server.fetch);
  await screen.findByText(/Nenhuma fonte cadastrada/);
  expect(screen.getByRole('link', { name: 'Planilha' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  fireEvent.change(screen.getByLabelText('Nome da nova fonte'), {
    target: { value: 'Minha origem' },
  });
  fireEvent.submit(
    screen.getByLabelText('Nome da nova fonte').closest('form')!,
  );
  await screen.findByLabelText('Arquivo XLSX');
  expect(server.writes).toHaveLength(1);
  expect(server.writes[0]!.method).toBe('PUT');
  const url = screen.getByTestId('url').textContent!;
  expect(url).toContain('fonte=');
  expect(url).toContain('apagadas=1');
  expect(url).not.toContain('Minha');
  await choose();
  fireEvent.click(screen.getByRole('button', { name: 'Conferir planilha' }));
  await ready();
  fireEvent.click(screen.getByRole('button', { name: 'Próximas colunas' }));
  fireEvent.click(screen.getByRole('button', { name: 'Colunas anteriores' }));
  expect(server.writes).toHaveLength(2);
  expect(server.writes[1]!.headers.get('content-type')).toContain(
    'multipart/form-data',
  );
  expect(screen.getByTestId('url')).toHaveTextContent('previa=');
  expect(server.writes.every((r) => !r.url.includes('importar-planilha'))).toBe(
    true,
  );
});
it('mostra população integral, face de freebet, null e confirmação exata sem custo', async () => {
  const server = simulated();
  await setup(server.fetch, restored);
  await ready();
  expect(screen.getAllByText('Não informado')).not.toHaveLength(0);
  expect(screen.getAllByText(/R\$\s*40,00/)).not.toHaveLength(0);
  expect(
    screen.queryByText(/Autorizar|custo estimado/),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByText('Ver dados da linha 2'));
  expect(screen.getByText('Não')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar importação' }));
  await screen.findByRole('heading', { name: 'Importação concluída' });
  const request = server.writes[0]!;
  expect(await request.json()).toEqual({
    preview_id: previewId,
    preview_hash: 'a'.repeat(64),
  });
  expect(
    screen.getAllByRole('link', { name: 'Ver aposta' })[0],
  ).toHaveAttribute('href', expect.stringContaining('casa=7'));
  expect(
    screen.getByRole('link', { name: 'Abrir Revisão' }),
  ).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole('button', {
      name: 'Conferir outro arquivo da mesma fonte',
    }),
  );
  await waitFor(() =>
    expect(screen.getByTestId('url')).not.toHaveTextContent('previa='),
  );
  expect(screen.getByTestId('url')).toHaveTextContent(`fonte=${sourceId}`);
});
it('colunas e aba usam picker; alteração exige referência nova antes de confirmar', async () => {
  const server = simulated();
  await setup(server.fetch, restored);
  await ready();
  fireEvent.click(screen.getByText('Conferir ou corrigir colunas'));
  await map('Odd', 'Coluna 5 · stake_unidades');
  expect(
    screen.getByRole('button', { name: 'Confirmar importação' }),
  ).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Gerar nova prévia' }));
  await ready();
  expect(await server.writes[0]!.json()).toMatchObject({
    expected_revision: 1,
    sheet: 'Apostas',
    mapping: { odd: 5 },
  });
  expect(server.writes[0]!.url).not.toMatch(new RegExp(`${previewId}$`));
  await map('Aba da planilha', 'Outra aba · 1 linhas');
  await map('Freebet', 'Coluna 1 · linha_id');
  await map('Freebet', 'Não importar');
  expect(
    screen.getByRole('button', { name: 'Confirmar importação' }),
  ).toBeDisabled();
});
it.each(['invalid', 'obsolete'] as const)(
  'prévia %s preserva erros e não confirma',
  async (state) => {
    const server = simulated(async (r) =>
      new URL(r.url).pathname.endsWith(`/previas/${previewId}`)
        ? json(
            preview({
              state,
              mapping_errors: [
                { field: 'odd', code: 'missing_mapping' },
                { field: 'unknown', code: 'internal_secret' },
              ],
            }),
          )
        : undefined,
    );
    await setup(server.fetch, restored);
    await screen.findByText(/Escolha uma coluna para este campo/);
    expect(
      screen.getByRole('button', { name: 'Confirmar importação' }),
    ).toBeDisabled();
    expect(screen.queryByText('internal_secret')).not.toBeInTheDocument();
  },
);
it('linhas recusadas preservam dados inválidos e orientação local', async () => {
  const server = simulated(async (r) =>
    r.url.includes('/linhas')
      ? json(
          rows({
            data: [
              {
                ...rows().data[0]!,
                linha_id: null,
                consequence: 'refuse',
                errors: [{ field: 'odd', code: 'invalid_value' }],
                raw: [null, true, {}, 'errado'],
              },
            ],
          }),
        )
      : undefined,
  );
  await setup(server.fetch, restored);
  await ready();
  fireEvent.click(screen.getByText('Ver dados da linha 2'));
  expect(screen.getByText('Valor incompatível')).toBeInTheDocument();
  expect(screen.getByText('errado')).toBeInTheDocument();
  expect(screen.getByText(/Confira o valor na planilha/)).toBeInTheDocument();
});
it.each(['errado.csv', 'vazio.xlsx'])(
  'recusa arquivo %s sem POST',
  async (name) => {
    const server = simulated();
    await setup(server.fetch, `/enviar?entrada=planilha&fonte=${sourceId}`);
    await choose(name, name.startsWith('vazio') ? '' : 'x');
    await screen.findByRole('alert');
    expect(
      screen.getByRole('button', { name: 'Conferir planilha' }),
    ).toBeDisabled();
    expect(server.writes).toHaveLength(0);
  },
);
it('resultado desconhecido consulta mesma confirmação sem reenviar', async () => {
  let lost = true;
  const server = simulated(async (r) => {
    if (r.method === 'POST' && r.url.includes('/confirmacoes/')) {
      const id = new URL(r.url).pathname.split('/').at(-1)!;
      server.fixture.confirmations.set(id, result({ id }));
      if (lost) {
        lost = false;
        throw new TypeError('offline');
      }
    }
    return undefined;
  });
  await setup(server.fetch, restored);
  await ready();
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar importação' }));
  await screen.findByText('Confira o recebimento deste pedido');
  fireEvent.click(screen.getByRole('button', { name: 'Conferir recebimento' }));
  await screen.findByRole('heading', { name: 'Importação concluída' });
  expect(server.writes).toHaveLength(1);
});
it('404 não repete; gesto explícito usa mesma identidade e DTO', async () => {
  let attempts = 0;
  const server = simulated(async (r) => {
    if (
      r.method === 'POST' &&
      r.url.includes('/confirmacoes/') &&
      ++attempts === 1
    )
      throw new TypeError('offline');
    return undefined;
  });
  await setup(server.fetch, restored);
  await ready();
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar importação' }));
  await screen.findByText('Confira o recebimento deste pedido');
  fireEvent.click(screen.getByRole('button', { name: 'Conferir recebimento' }));
  const retry = await screen.findByRole('button', {
    name: 'Tentar o mesmo pedido explicitamente',
  });
  expect(server.writes).toHaveLength(1);
  fireEvent.click(retry);
  await screen.findByRole('heading', { name: 'Importação concluída' });
  expect(server.writes).toHaveLength(2);
  expect(server.writes[0]!.url).toBe(server.writes[1]!.url);
  expect(await server.writes[0]!.json()).toEqual(
    await server.writes[1]!.json(),
  );
});
it.each([402, 409, 410, 422, 429, 503])(
  'recusa %i preserva dados e não repete intenção',
  async (status) => {
    const server = simulated(async (r) =>
      r.method === 'POST'
        ? json({ detail: 'segredo interno' }, status, { 'Retry-After': '61' })
        : undefined,
    );
    await setup(server.fetch, restored);
    await ready();
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirmar importação' }),
    );
    await screen.findByRole('region', { name: /^Pedido de importação/ });
    expect(server.writes).toHaveLength(1);
    expect(screen.queryByText('segredo interno')).not.toBeInTheDocument();
    expect(screen.getByTestId('url')).toHaveTextContent(`fonte=${sourceId}`);
  },
);
it('GET atual detecta mudança da prévia antes do POST', async () => {
  let reads = 0;
  const server = simulated(async (r) =>
    r.url.endsWith(`/previas/${previewId}`) && ++reads > 1
      ? json(preview({ preview_hash: 'c'.repeat(64) }))
      : undefined,
  );
  await setup(server.fetch, restored);
  await ready();
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar importação' }));
  await screen.findByRole('region', { name: /^Pedido de importação/ });
  expect(server.writes).toHaveLength(0);
});
it('READ_ONLY consulta prévia e não cadastra, prepara ou confirma', async () => {
  const server = simulated();
  await setup(server.fetch, restored, 'READ_ONLY');
  await screen.findByRole('heading', { name: 'Prévia pronta para conferir' });
  expect(
    screen.getByRole('button', { name: 'Confirmar importação' }),
  ).toBeDisabled();
  expect(
    screen.getByRole('button', { name: 'Conferir planilha' }),
  ).toBeDisabled();
  expect(server.writes).toHaveLength(0);
});
it('recarga consulta resultado com UUID e não escreve', async () => {
  const server = simulated();
  server.fixture.confirmations.set(confirmationId, result());
  await setup(server.fetch, `${restored}&confirmacao=${confirmationId}`);
  await screen.findByRole('heading', { name: 'Importação concluída' });
  expect(server.writes).toHaveLength(0);
});
it('query inválida oferece recuperação sem API de importação', async () => {
  const server = simulated();
  await setup(server.fetch, '/enviar?entrada=planilha&fonte=bad&casa=7');
  await screen.findByRole('heading', {
    name: 'Endereço de importação inválido',
  });
  expect(server.calls).toHaveLength(0);
  fireEvent.click(screen.getByRole('button', { name: 'Escolher uma fonte' }));
  await screen.findByRole('button', { name: /Fonte cadastrada/ });
  expect(screen.getByTestId('url')).toHaveTextContent('casa=7');
});
it('páginas de fontes e linhas viajam na URL sem fingir população completa', async () => {
  const server = simulated();
  for (let i = 0; i < 21; i++) {
    const id = crypto.randomUUID();
    server.fixture.sources.set(id, source({ id }));
  }
  server.fixture.previews.set(previewId, preview({ total_rows: 21 }));
  await setup(server.fetch, restored);
  await ready();
  fireEvent.click(screen.getByRole('button', { name: 'Próximas linhas' }));
  await waitFor(() =>
    expect(screen.getByTestId('url')).toHaveTextContent('linhas_pagina=2'),
  );
  fireEvent.click(
    await screen.findByRole('button', { name: 'Linhas anteriores' }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Próximas fontes' }));
  await waitFor(() =>
    expect(screen.getByTestId('url')).toHaveTextContent('fontes_pagina=2'),
  );
  fireEvent.click(
    await screen.findByRole('button', { name: 'Fontes anteriores' }),
  );
});
it.each(['wrong_id', 'wrong_total', 'wrong_result'])(
  'rejeita resposta incompatível %s',
  async (kind) => {
    const server = simulated(async (r) =>
      kind === 'wrong_id' && r.url.endsWith(`/previas/${previewId}`)
        ? json(preview({ id: sourceId }))
        : kind === 'wrong_total' && r.url.includes('/linhas')
          ? json(rows({ total: 999 }))
          : kind === 'wrong_result' && r.url.includes('/confirmacoes/')
            ? json(result({ source_id: previewId }))
            : undefined,
    );
    await setup(
      server.fetch,
      kind === 'wrong_result'
        ? `${restored}&confirmacao=${confirmationId}`
        : restored,
    );
    await screen.findByRole('region', {
      name:
        kind === 'wrong_id'
          ? /^Prévia da planilha/
          : kind === 'wrong_total'
            ? /^Linhas da prévia/
            : /^Resultado da importação/,
    });
    expect(server.writes).toHaveLength(0);
  },
);
it('upload com status inesperado exige conferir recebimento', async () => {
  const server = simulated(async (r) =>
    r.method === 'POST'
      ? json(preview({ id: new URL(r.url).pathname.split('/').at(-1)! }), 200)
      : undefined,
  );
  await setup(server.fetch, `/enviar?entrada=planilha&fonte=${sourceId}`);
  await choose();
  fireEvent.click(screen.getByRole('button', { name: 'Conferir planilha' }));
  await screen.findByText('Confira o recebimento deste pedido');
  expect(server.writes).toHaveLength(1);
});
it('sair limpa bytes e descarta resposta tardia', async () => {
  let resolve!: (r: Response) => void;
  const server = simulated(async (r) =>
    r.method === 'POST'
      ? new Promise<Response>((r) => {
          resolve = r;
        })
      : undefined,
  );
  const view = await setup(
    server.fetch,
    `/enviar?entrada=planilha&fonte=${sourceId}`,
  );
  await choose();
  fireEvent.click(screen.getByRole('button', { name: 'Conferir planilha' }));
  await waitFor(() => expect(server.writes).toHaveLength(1));
  view.unmount();
  await act(async () => resolve(json(preview(), 201)));
  expect(
    screen.queryByText('Prévia pronta para conferir'),
  ).not.toBeInTheDocument();
});

it('upload sem resposta usa GET da mesma prévia e não repete bytes', async () => {
  const server = simulated(async (r) => {
    if (r.method === 'POST') {
      const id = new URL(r.url).pathname.split('/').at(-1)!;
      server.fixture.previews.set(id, preview({ id }));
      throw new TypeError('offline');
    }
    return undefined;
  });
  await setup(server.fetch, `/enviar?entrada=planilha&fonte=${sourceId}`);
  await choose();
  fireEvent.click(screen.getByRole('button', { name: 'Conferir planilha' }));
  await screen.findByText('Confira o recebimento deste pedido');
  fireEvent.click(screen.getByRole('button', { name: 'Conferir recebimento' }));
  await ready();
  expect(server.writes).toHaveLength(1);
});
it('fonte sem resposta consulta seu UUID sem cadastrar outra fonte', async () => {
  const server = simulated(async (r) => {
    if (r.method === 'PUT') {
      const id = new URL(r.url).pathname.split('/').at(-1)!;
      server.fixture.sources.set(id, source({ id, nome: 'Nova fonte' }));
      throw new TypeError('offline');
    }
    return undefined;
  });
  server.fixture.sources.clear();
  await setup(server.fetch);
  await screen.findByText(/Nenhuma fonte cadastrada/);
  fireEvent.change(screen.getByLabelText('Nome da nova fonte'), {
    target: { value: 'Nova fonte' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Registrar nova fonte' }));
  await screen.findByText('Confira o recebimento deste pedido');
  fireEvent.click(screen.getByRole('button', { name: 'Conferir recebimento' }));
  await screen.findByLabelText('Arquivo XLSX');
  expect(server.writes).toHaveLength(1);
});
it('aba vazia preserva a fonte e oferece corrigir arquivo ou aba', async () => {
  const server = simulated();
  server.fixture.previews.set(previewId, preview({ total_rows: 0 }));
  await setup(server.fetch, restored);
  await screen.findByText(/A aba não tem linhas/);
  expect(screen.getByLabelText('Arquivo XLSX')).toBeInTheDocument();
});
it('falha de fontes tem GET explícito sem descartar a escolha', async () => {
  let failed = true;
  const server = simulated(async (r) =>
    r.url.includes('/fontes?') && failed ? json({}, 500) : undefined,
  );
  await setup(server.fetch, `/enviar?entrada=planilha&fonte=${sourceId}`);
  const region = await screen.findByRole('region', {
    name: /^Fontes cadastradas/,
  });
  failed = false;
  fireEvent.click(
    within(region).getByRole('button', { name: 'Tentar novamente' }),
  );
  await screen.findByRole('button', { name: /Fonte cadastrada/ });
  expect(screen.getByTestId('url')).toHaveTextContent(`fonte=${sourceId}`);
});
it('limpa seleção ao trocar de fonte e cancela pedido em andamento', async () => {
  const other = '95118aaa-6b56-4d76-8fc8-a5e886bb4cde';
  let resolve!: (r: Response) => void;
  const server = simulated(async (r) =>
    r.method === 'POST'
      ? new Promise<Response>((done) => {
          resolve = done;
        })
      : undefined,
  );
  server.fixture.sources.set(other, source({ id: other, nome: 'Outra fonte' }));
  await setup(server.fetch, `/enviar?entrada=planilha&fonte=${other}`);
  await choose();
  fireEvent.click(screen.getByRole('button', { name: 'Conferir planilha' }));
  await waitFor(() => expect(server.writes).toHaveLength(1));
  fireEvent.click(
    screen.getByRole('button', { name: 'Mudar endereço de teste' }),
  );
  await screen.findByText('Apostas pessoais', { selector: 'strong' });
  await act(async () => resolve(json(preview(), 201)));
  expect(screen.queryByText('apostas.xlsx')).not.toBeInTheDocument();
  expect(
    screen.queryByRole('heading', { name: 'Prévia pronta para conferir' }),
  ).not.toBeInTheDocument();
});
it('logout elimina formulário, arquivo e retorno tardio', async () => {
  const server = simulated();
  const view = await setup(
    server.fetch,
    `/enviar?entrada=planilha&fonte=${sourceId}`,
  );
  await choose();
  await act(async () => view.service.logout());
  expect(screen.queryByText('apostas.xlsx')).not.toBeInTheDocument();
});
it('remapeamento com status inválido exige leitura antes de nova intenção', async () => {
  const server = simulated(async (r) =>
    r.method === 'POST' && r.url.includes('/remapear/')
      ? json(preview({ id: new URL(r.url).pathname.split('/').at(-1)! }), 200)
      : undefined,
  );
  await setup(server.fetch, restored);
  await ready();
  fireEvent.click(screen.getByText('Conferir ou corrigir colunas'));
  fireEvent.click(screen.getByRole('button', { name: 'Gerar nova prévia' }));
  await screen.findByText('Confira o recebimento deste pedido');
  expect(server.writes).toHaveLength(1);
});

it.each(['source', 'preview'])(
  'confirmação de outro %s é incerta e não mostra sucesso',
  async (kind) => {
    const server = simulated(async (r) =>
      r.method === 'POST' && r.url.includes('/confirmacoes/')
        ? json(
            result({
              id: new URL(r.url).pathname.split('/').at(-1)!,
              ...(kind === 'source'
                ? { source_id: confirmationId }
                : { preview_id: confirmationId }),
            }),
          )
        : undefined,
    );
    await setup(server.fetch, restored);
    await ready();
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirmar importação' }),
    );
    await screen.findByText('Confira o recebimento deste pedido');
    expect(
      screen.queryByRole('heading', { name: 'Importação concluída' }),
    ).not.toBeInTheDocument();
    expect(server.writes).toHaveLength(1);
  },
);

it('prévia expirada permite encerrar somente a consulta e preserva fonte e filtros', async () => {
  const server = simulated(async (r) =>
    r.method === 'POST' ? json({ detail: 'expired' }, 410) : undefined,
  );
  await setup(server.fetch, restored);
  await ready();
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar importação' }));
  await screen.findByText('Confira o recebimento deste pedido');
  fireEvent.click(
    screen.getByRole('button', { name: 'Encerrar consulta deste pedido' }),
  );
  await waitFor(() =>
    expect(screen.getByTestId('url')).not.toHaveTextContent('confirmacao='),
  );
  expect(screen.getByTestId('url')).not.toHaveTextContent('previa=');
  expect(screen.getByTestId('url')).toHaveTextContent(`fonte=${sourceId}`);
  expect(screen.getByTestId('url')).toHaveTextContent('apagadas=1');
  await choose();
  expect(
    screen.getByRole('button', { name: 'Conferir planilha' }),
  ).toBeEnabled();
  expect(server.writes).toHaveLength(1);
});
