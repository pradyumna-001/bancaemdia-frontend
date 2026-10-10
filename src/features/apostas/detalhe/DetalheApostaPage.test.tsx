import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Blob as NodeBlob } from 'node:buffer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { createSession } from '../../../auth/session';
import { sessionContext } from '../../../auth/protocol';
import { ProvedorAuth } from '../../../auth/ProvedorAuth';
import { RequireSession } from '../../../auth/RequireSession';
import { createApiClient } from '../../../api/client';
import { parseConfig } from '../../../lib/config';
import { createAccessController } from '../../acesso/controller';
import { ProvedorAcesso } from '../../acesso/ProvedorAcesso';
import { billingStatus } from '../../../../tests/fixtures/acesso';
import {
  detalheExemplo,
  matrizExemplo,
  revisaoDePar,
} from '../../../../tests/fixtures/detalhe';
import type { Correcao, Detalhe } from './protocol';
import { DetalheApostaPage } from './DetalheApostaPage';

const cleanups: Array<() => void> = [];
beforeEach(() => {
  HTMLDialogElement.prototype.showModal ??= function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});
afterEach(() => {
  cleanups.splice(0).forEach((fn) => fn());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
const json = (
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
async function open({
  access = 'FULL_WRITE',
  data = structuredClone(detalheExemplo),
  respond,
}: {
  access?: string;
  data?: Detalhe;
  respond?: (request: Request, data: Detalhe) => Promise<Response | undefined>;
} = {}) {
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
    exclusive: async (_s, fn) => fn(),
  });
  await session.resume();
  const controller = createAccessController(session, queries);
  const requests: Request[] = [];
  let handler = respond;
  const client = createApiClient(
    parseConfig({ VITE_API_URL: 'http://127.0.0.1:8000' }),
    {
      captureSession: session.capture,
      fetcher: async (req) => {
        if (req.url.endsWith('/billing/status'))
          return json({ ...billingStatus, access });
        requests.push(req.clone());
        const override = await handler?.(req, data);
        if (override) return override;
        const path = new URL(req.url).pathname;
        if (path === '/api/v1/revisao/8') return json(revisaoDePar);
        if (path === '/api/v1/titulares')
          return json({
            data: [matrizExemplo.titular],
            page: Number(new URL(req.url).searchParams.get('page')),
            page_size: 20,
            total: 1,
          });
        if (path === '/api/v1/titulares/1/matriz') return json(matrizExemplo);
        if (req.method === 'GET') return json(data);
        if (req.method === 'DELETE') data.aposta.apagada = true;
        else if (path.endsWith('/restaurar')) data.aposta.apagada = false;
        else if (path.endsWith('/resolver')) {
          data.revisao_pendente = null;
          const body = await req.json();
          return json({
            aposta: data.aposta,
            eventos_gravados: 1,
            acao: body.acao,
            revisao: { id: 8, resolvido_em: '2026-10-10T15:00:00Z' },
          });
        } else if (path.endsWith('/resultado'))
          data.aposta.estado = (await req.json()).estado;
        else {
          const body: Correcao = await req.json();
          if (body.evento !== undefined) data.aposta.evento = body.evento;
          if (body.descricao !== undefined)
            data.aposta.descricao = body.descricao;
          if (body.conta_casa_id !== undefined)
            data.aposta.conta_casa_id = body.conta_casa_id;
        }
        data.eventos.push({
          tipo: 'CORRECAO_MANUAL',
          fonte: 'manual',
          criado_em: '2026-10-10T15:00:00Z',
          confianca: null,
          payload: {},
        });
        return json({ aposta: data.aposta, eventos_gravados: 1 });
      },
    },
  );
  const router = createMemoryRouter(
    [
      {
        path: '/aposta/:chave',
        element: (
          <RequireSession>
            <DetalheApostaPage client={client} />
          </RequireSession>
        ),
      },
      { path: '/', element: <p>Lista de apostas</p> },
      { path: '/login', element: <p>Entrar</p> },
    ],
    { initialEntries: ['/aposta/exemplo-1?casa=7&visualizacao=lista'] },
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
  return {
    data,
    session,
    requests,
    router,
    respond: (next: typeof respond) => {
      handler = next;
    },
  };
}
async function editable() {
  await screen.findByRole('heading', { name: 'Flamengo × Palmeiras' });
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Corrigir aposta' }),
    ).toBeEnabled(),
  );
}
const writes = (requests: Request[]) =>
  requests.filter((req) => req.method !== 'GET');
it('detalhe conserva retorno à lista, contexto e campos financeiros prontos', async () => {
  const app = await open();
  await editable();
  expect(
    screen.getByRole('link', {
      name: /Voltar à lista de apostas/,
    }),
  ).toHaveAttribute('href', '/?casa=7&visualizacao=lista#aposta-exemplo-1');
  expect(screen.getByText('Conta principal (inativa)')).toBeVisible();
  expect(screen.getByText('Ana (arquivado)')).toBeVisible();
  expect(screen.getByText('+R$ 15,00')).toBeVisible();
  expect(
    screen.getByText('Nenhuma mídia foi informada para esta aposta.', {
      exact: false,
    }),
  ).toBeVisible();
  fireEvent.click(screen.getByText('Histórico da aposta (2)'));
  expect(
    screen.getByRole('heading', { name: 'Resultado registrado' }),
  ).toBeVisible();
  expect(writes(app.requests)).toHaveLength(0);
});
it('corrige somente evento e descrição; exige GET confirmando e não soma valores', async () => {
  const app = await open();
  await editable();
  fireEvent.click(screen.getByRole('button', { name: 'Corrigir aposta' }));
  fireEvent.change(screen.getByLabelText('Evento'), {
    target: { value: 'Evento corrigido' },
  });
  fireEvent.change(screen.getByLabelText('Descrição'), {
    target: { value: '' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
  await screen.findByRole('heading', { name: 'Evento corrigido' });
  await waitFor(() =>
    expect(
      screen.queryByRole('button', { name: 'Salvar alterações' }),
    ).not.toBeInTheDocument(),
  );
  expect(await writes(app.requests)[0]!.json()).toEqual({
    evento: 'Evento corrigido',
    descricao: null,
  });
  expect(screen.getByText('+R$ 15,00')).toBeVisible();
  expect(app.requests.filter((r) => r.method === 'GET')).toHaveLength(2);
});
it('sem alteração ou entrada inválida não envia e cancelar devolve foco', async () => {
  const app = await open();
  await editable();
  fireEvent.click(screen.getByRole('button', { name: 'Corrigir aposta' }));
  fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
  expect(screen.getByText('Nenhum campo foi alterado.')).toBeVisible();
  fireEvent.change(screen.getByLabelText('Odd'), { target: { value: 'zero' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
  expect(
    screen.getByText('Confira os números e as datas.', { exact: false }),
  ).toBeVisible();
  expect(writes(app.requests)).toHaveLength(0);
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar correção' }));
  expect(screen.getByRole('button', { name: 'Corrigir aposta' })).toHaveFocus();
});
it('apagar/restaurar requer confirmação e respeita respostas do servidor', async () => {
  const app = await open();
  await editable();
  fireEvent.click(screen.getByRole('button', { name: 'Apagar aposta' }));
  expect(screen.getByRole('dialog', { name: 'Apagar aposta?' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Agora não' }));
  expect(writes(app.requests)).toHaveLength(0);
  fireEvent.click(screen.getByRole('button', { name: 'Apagar aposta' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
  await screen.findByText('Apagada — fora da apuração.', { exact: false });
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Restaurar aposta' }),
    ).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Restaurar aposta' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
  await waitFor(() =>
    expect(
      screen.queryByText('Apagada — fora da apuração.', { exact: false }),
    ).not.toBeInTheDocument(),
  );
  expect(writes(app.requests).map((r) => r.method)).toEqual(['DELETE', 'POST']);
});
it.each([409, 500])(
  'falha %s bloqueia escrita até GET explícito, preserva formulário e não repete',
  async (status) => {
    const app = await open({
      respond: async (req) =>
        req.method === 'PATCH'
          ? json({ detail: 'segredo' }, status)
          : undefined,
    });
    await editable();
    fireEvent.click(screen.getByRole('button', { name: 'Corrigir aposta' }));
    fireEvent.change(screen.getByLabelText('Evento'), {
      target: { value: 'Minha entrada' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    await screen.findByRole('button', {
      name: 'Consultar estado atual da aposta',
    });
    expect(
      screen.getByRole('button', { name: 'Salvar alterações' }),
    ).toBeDisabled();
    expect(screen.getByLabelText('Evento')).toHaveValue('Minha entrada');
    expect(writes(app.requests)).toHaveLength(1);
    expect(screen.queryByText('segredo')).not.toBeInTheDocument();
    app.respond(undefined);
    fireEvent.click(
      screen.getByRole('button', { name: 'Consultar estado atual da aposta' }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Salvar alterações' }),
      ).toBeEnabled(),
    );
    expect(writes(app.requests)).toHaveLength(1);
    expect(screen.getByLabelText('Evento')).toHaveValue('Minha entrada');
  },
);
it('402 mantém formulário/leitura sem replay, 422 só expõe label local', async () => {
  const app = await open({
    respond: async (req) =>
      req.method === 'PATCH'
        ? json({ code: 'account_read_only' }, 402)
        : undefined,
  });
  await editable();
  fireEvent.click(screen.getByRole('button', { name: 'Corrigir aposta' }));
  fireEvent.change(screen.getByLabelText('Evento'), {
    target: { value: 'Preservado' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
  await screen.findByText('Este pedido foi bloqueado para escrita');
  expect(screen.getByLabelText('Evento')).toHaveValue('Preservado');
  expect(writes(app.requests)).toHaveLength(1);
  app.respond(async (req) =>
    req.method === 'PATCH'
      ? json(
          {
            detail: [
              {
                loc: ['body', 'evento'],
                msg: 'segredo',
                input: 'privado',
                ctx: { token: 'nunca' },
              },
            ],
          },
          422,
        )
      : undefined,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
  await screen.findByRole('button', { name: 'Confira Evento' });
  fireEvent.click(screen.getByRole('button', { name: 'Confira Evento' }));
  expect(screen.getByLabelText('Evento')).toHaveFocus();
  expect(screen.queryByText(/segredo|privado|nunca/)).not.toBeInTheDocument();
});
it('READ_ONLY consulta e conserva valor de face/custo zero sem escolher conta', async () => {
  await open({
    access: 'READ_ONLY',
    data: {
      ...detalheExemplo,
      aposta: { ...detalheExemplo.aposta, freebet: true, stake_centavos: 0 },
      fonte_contextual: true,
      consolidacoes: [
        { estado: 'active' },
        { estado: 'rejected' },
        { estado: 'unlinked' },
        { estado: 'novo' },
      ],
    },
  });
  await screen.findByRole('heading', { name: 'Flamengo × Palmeiras' });
  expect(
    screen.getByRole('button', { name: 'Corrigir aposta' }),
  ).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Escolher conta' })).toBeDisabled();
  expect(screen.getByText('Valor de face da freebet')).toBeVisible();
  expect(screen.getByText('R$ 0,00')).toBeVisible();
  expect(
    screen.getByText('Esta é a fonte de contexto de uma aposta vinculada.', {
      exact: false,
    }),
  ).toBeVisible();
  expect(screen.getByText('Fontes vinculadas')).toBeVisible();
});
it('resultado usa endpoint próprio; cashout sem valor é recusado na entrada', async () => {
  const app = await open();
  await editable();
  fireEvent.click(screen.getByText('Registrar resultado'));
  fireEvent.click(screen.getByLabelText('Cashout'));
  fireEvent.click(screen.getByRole('button', { name: 'Salvar resultado' }));
  expect(writes(app.requests)).toHaveLength(0);
  fireEvent.change(screen.getByLabelText('Valor pago pela casa (R$)'), {
    target: { value: '12,34' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar resultado' }));
  await screen.findByText('Alteração confirmada.', { exact: false });
  expect(await writes(app.requests)[0]!.json()).toEqual({
    estado: 'CASHOUT',
    cashout_valor_centavos: 1234,
  });
});
it('conta histórica exige escolha explícita; servidor decide o intervalo', async () => {
  const app = await open();
  await editable();
  fireEvent.click(screen.getByRole('button', { name: 'Escolher conta' }));
  await screen.findByRole('button', { name: 'Ana (arquivado)' });
  expect(
    screen.getByRole('button', { name: 'Confirmar conta' }),
  ).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Ana (arquivado)' }));
  await screen.findByLabelText('Conta histórica — Betano (inativa)', {
    exact: false,
  });
  fireEvent.click(
    screen.getByLabelText('Conta histórica — Betano (inativa)', {
      exact: false,
    }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar conta' }));
  await screen.findByText('Alteração confirmada.', { exact: false });
  expect(await writes(app.requests)[0]!.json()).toEqual({ conta_casa_id: 4 });
});
it.each(['É a mesma aposta', 'São apostas distintas'])(
  'par legado: %s só usa resolver e confirmação',
  async (label) => {
    const app = await open({
      data: {
        ...structuredClone(detalheExemplo),
        revisao_pendente: {
          id: 8,
          motivo: 'duvida_de_par',
          midia_hash: null,
          criado_em: '2026-10-10T12:00:00Z',
        },
      },
      respond: async (req) =>
        req.url.endsWith('/revisao/8')
          ? json({ ...revisaoDePar, midia_hash: null })
          : undefined,
    });
    await editable();
    await screen.findByRole('button', { name: label });
    expect(
      screen.getByRole('link', {
        name: 'Consultar a outra aposta (em outra aba)',
      }),
    ).toHaveAttribute('href', '/aposta/exemplo-2?casa=7&visualizacao=lista');
    fireEvent.click(screen.getByRole('button', { name: label }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await screen.findByText('Alteração confirmada.', { exact: false });
    expect(await writes(app.requests)[0]!.json()).toEqual(
      label.startsWith('É')
        ? { acao: 'MESMA' }
        : { acao: 'CORRIGIR', aposta_corrigida: {} },
    );
  },
);
it.each([404, 405, 503])(
  'leitura %s tem erro estilizado, contexto e repetição somente quando cabível',
  async (status) => {
    const app = await open({
      respond: async () => json({ detail: 'cru' }, status),
    });
    await screen.findByRole('alert');
    expect(
      screen.getByRole('link', {
        name: /Voltar à lista de apostas/,
      }),
    ).toBeVisible();
    expect(screen.queryByText('cru')).not.toBeInTheDocument();
    if (status === 503) {
      app.respond(undefined);
      fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
      await editable();
    } else
      expect(
        screen.queryByRole('button', { name: 'Tentar novamente' }),
      ).not.toBeInTheDocument();
  },
);
it('logout descarta dados e resposta atrasada de escrita', async () => {
  let resolve: (r: Response) => void = () => {};
  const app = await open({
    respond: async (req) =>
      req.method === 'DELETE'
        ? new Promise<Response>((r) => {
            resolve = r;
          })
        : undefined,
  });
  await editable();
  fireEvent.click(screen.getByRole('button', { name: 'Apagar aposta' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
  await waitFor(() => expect(writes(app.requests)).toHaveLength(1));
  await act(() => app.session.logout());
  await screen.findByText('Entrar');
  await act(async () =>
    resolve(
      json({
        aposta: { ...detalheExemplo.aposta, apagada: true },
        eventos_gravados: 1,
      }),
    ),
  );
  expect(
    screen.queryByText('Alteração confirmada.', { exact: false }),
  ).not.toBeInTheDocument();
});

it('foto privada é carregada sob gesto e revogada ao sair, com espaço reservado', async () => {
  const originalURL = URL;
  const create = vi.fn(() => 'blob:foto-privada');
  const revoke = vi.fn();
  vi.stubGlobal(
    'URL',
    class extends originalURL {
      static createObjectURL = create;
      static revokeObjectURL = revoke;
    },
  );
  vi.stubGlobal('Blob', NodeBlob);
  const app = await open({
    data: {
      ...structuredClone(detalheExemplo),
      revisao_pendente: {
        id: 8,
        motivo: 'duvida_de_par',
        midia_hash: 'imagem-de-teste',
        criado_em: '2026-10-10T12:00:00Z',
      },
    },
    respond: async (req) =>
      req.url.endsWith('/foto')
        ? new Response(new Uint8Array([137, 80, 78, 71]), {
            headers: { 'Content-Type': 'image/png' },
          })
        : undefined,
  });
  await editable();
  await screen.findByRole('button', { name: 'Abrir foto da revisão' });
  expect(app.requests.filter((r) => r.url.endsWith('/foto'))).toHaveLength(0);
  fireEvent.click(
    screen.getByRole('button', { name: 'Abrir foto da revisão' }),
  );
  const img = await screen.findByRole('img', {
    name: 'Evidência da revisão desta aposta',
  });
  expect(img).toHaveAttribute('width', '800');
  expect(img).toHaveAttribute('height', '600');
  expect(img).toHaveAttribute('loading', 'lazy');
  expect(create).toHaveBeenCalledTimes(1);
  fireEvent.error(img);
  expect(
    screen.getByText('Não foi possível exibir esta imagem.'),
  ).toBeVisible();
  await act(() => app.session.logout());
  expect(revoke).toHaveBeenCalledWith('blob:foto-privada');
});
it.each([404, 503, 200])(
  'foto %s: autorização/recuperação e MIME real são obrigatórios',
  async (status) => {
    await open({
      data: {
        ...structuredClone(detalheExemplo),
        revisao_pendente: {
          id: 8,
          motivo: 'duvida_de_par',
          midia_hash: 'imagem-de-teste',
          criado_em: '2026-10-10T12:00:00Z',
        },
      },
      respond: async (req) =>
        req.url.endsWith('/foto')
          ? new Response('conteudo privado', {
              status,
              headers: {
                'Content-Type':
                  status === 200 ? 'text/html' : 'application/json',
              },
            })
          : undefined,
    });
    await editable();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Abrir foto da revisão' }),
    );
    await screen.findByRole('alert');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByText('conteudo privado')).not.toBeInTheDocument();
    if (status === 404)
      expect(
        screen.getByRole('button', { name: 'Abrir foto da revisão' }),
      ).toBeDisabled();
  },
);
it('GET de revisão recusado não cria decisões nem mídia e permite recuperação segura', async () => {
  const app = await open({
    data: {
      ...structuredClone(detalheExemplo),
      revisao_pendente: {
        id: 8,
        motivo: 'duvida_de_par',
        midia_hash: null,
        criado_em: '2026-10-10T12:00:00Z',
      },
    },
    respond: async (req) =>
      req.url.endsWith('/revisao/8') ? json({}, 503) : undefined,
  });
  await editable();
  await screen.findByRole('alert');
  expect(
    screen.queryByRole('button', { name: 'É a mesma aposta' }),
  ).not.toBeInTheDocument();
  app.respond(undefined);
  fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  await screen.findByRole('button', { name: 'É a mesma aposta' });
});
it('matriz incompleta não permite conta inventada; sem conta é escolha explícita', async () => {
  const app = await open({
    respond: async (req) =>
      req.url.includes('/matriz') ? json({}, 503) : undefined,
  });
  await editable();
  fireEvent.click(screen.getByRole('button', { name: 'Escolher conta' }));
  fireEvent.click(
    await screen.findByRole('button', { name: 'Ana (arquivado)' }),
  );
  await screen.findByRole('alert');
  expect(
    screen.queryByLabelText('Conta histórica — Betano (inativa)', {
      exact: false,
    }),
  ).not.toBeInTheDocument();
  app.respond(undefined);
  fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  await screen.findByLabelText('Conta histórica — Betano (inativa)', {
    exact: false,
  });
  fireEvent.click(screen.getByLabelText('Deixar sem conta atribuída'));
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar conta' }));
  await screen.findByText('Alteração confirmada.', { exact: false });
  expect(await writes(app.requests)[0]!.json()).toEqual({
    conta_casa_id: null,
  });
});
it('páginas/ausência de titulares e contas têm recuperação, sem escolha automática', async () => {
  const app = await open({
    respond: async (req) => {
      const url = new URL(req.url);
      if (url.pathname === '/api/v1/titulares')
        return json({
          data:
            Number(url.searchParams.get('page')) === 1
              ? [matrizExemplo.titular]
              : [],
          page: Number(url.searchParams.get('page')),
          page_size: 20,
          total: 21,
        });
      if (url.pathname.endsWith('/matriz'))
        return json({ ...matrizExemplo, contas: [] });
      return undefined;
    },
  });
  await editable();
  fireEvent.click(screen.getByRole('button', { name: 'Escolher conta' }));
  fireEvent.click(
    await screen.findByRole('button', { name: 'Ana (arquivado)' }),
  );
  await screen.findByText('Este titular não possui contas cadastradas.');
  fireEvent.click(screen.getByRole('button', { name: 'Próximos titulares' }));
  await screen.findByText('Não há titulares nesta página.', { exact: false });
  fireEvent.click(screen.getByRole('button', { name: 'Titulares anteriores' }));
  await screen.findByRole('button', { name: 'Ana (arquivado)' });
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(screen.getByRole('button', { name: 'Escolher conta' })).toHaveFocus();
  expect(writes(app.requests)).toHaveLength(0);
});
it('erro de titulares se recupera e intervalos nulos são explícitos', async () => {
  const app = await open({
    respond: async (req) =>
      new URL(req.url).pathname === '/api/v1/titulares'
        ? json({}, 503)
        : undefined,
  });
  await editable();
  fireEvent.click(screen.getByRole('button', { name: 'Escolher conta' }));
  await screen.findByRole('alert');
  app.respond(async (req) =>
    req.url.endsWith('/matriz')
      ? json({
          ...matrizExemplo,
          contas: [
            { ...matrizExemplo.contas[0]!, ativa: true, historico_uso: [] },
            {
              ...matrizExemplo.contas[0]!,
              conta_casa_id: 5,
              apelido: 'Conta em uso',
              ativa: true,
              historico_uso: [
                { origem: 'LEGADO', vigente_de: null, vigente_ate: null },
              ],
            },
          ],
        })
      : undefined,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  fireEvent.click(
    await screen.findByRole('button', { name: 'Ana (arquivado)' }),
  );
  await screen.findByText('Sem intervalo de uso informado');
  expect(screen.getByText('Não informado até intervalo aberto')).toBeVisible();
});
it('sucesso de escrita com GET falho conserva dados e exige consulta, sem replay', async () => {
  let changed = false;
  const app = await open({
    respond: async (req) => {
      if (req.method === 'PATCH') {
        changed = true;
        return json({ aposta: detalheExemplo.aposta, eventos_gravados: 1 });
      }
      return changed ? json({}, 503) : undefined;
    },
  });
  await editable();
  fireEvent.click(screen.getByRole('button', { name: 'Corrigir aposta' }));
  fireEvent.change(screen.getByLabelText('Evento'), {
    target: { value: 'Meu ajuste' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
  await screen.findByText('Alteração confirmada.', { exact: false });
  await screen.findByRole('button', {
    name: 'Consultar estado atual da aposta',
  });
  expect(screen.getByLabelText('Evento')).toHaveValue('Meu ajuste');
  app.respond(undefined);
  fireEvent.click(
    screen.getByRole('button', { name: 'Consultar estado atual da aposta' }),
  );
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Salvar alterações' }),
    ).toBeEnabled(),
  );
  expect(writes(app.requests)).toHaveLength(1);
});
it('mídia sem revisão, histórico vazio e nulidade permanecem explícitos', async () => {
  const app = await open({
    data: {
      ...structuredClone(detalheExemplo),
      eventos: [],
      aposta: {
        ...detalheExemplo.aposta,
        midia_hash: 'antiga',
        conta_contexto: null,
        conta_atribuicao: 'UNASSIGNED',
        banca_contexto: null,
      },
    },
  });
  await editable();
  expect(screen.getByText('Conta não atribuída')).toBeVisible();
  expect(
    screen.getByText('A mídia desta aposta não possui um caminho autorizado', {
      exact: false,
    }),
  ).toBeVisible();
  fireEvent.click(screen.getByText('Histórico da aposta (0)'));
  expect(
    screen.getByText('Nenhum evento foi informado pelo serviço.', {
      exact: false,
    }),
  ).toBeVisible();
  expect(writes(app.requests)).toHaveLength(0);
});
it('404/405 de escrita não reativam o pedido depois de consultar', async () => {
  const app = await open({
    respond: async (req) =>
      req.method === 'DELETE' ? json({}, 405) : undefined,
  });
  await editable();
  fireEvent.click(screen.getByRole('button', { name: 'Apagar aposta' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
  await screen.findByRole('button', {
    name: 'Consultar estado atual da aposta',
  });
  app.respond(undefined);
  fireEvent.click(
    screen.getByRole('button', { name: 'Consultar estado atual da aposta' }),
  );
  await screen.findByText('Estado atual consultado.', { exact: false });
  expect(screen.getByRole('button', { name: 'Apagar aposta' })).toBeDisabled();
  expect(writes(app.requests)).toHaveLength(1);
});
