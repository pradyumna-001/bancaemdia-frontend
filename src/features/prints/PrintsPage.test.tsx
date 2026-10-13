import { webcrypto } from 'node:crypto';
import {
  printItem,
  printIntent,
  printIntentId,
  printItemId,
} from '../../../tests/fixtures/prints';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
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
import { acceptedUpload } from '../../../tests/fixtures/api/responses';
import { EnviarPage } from '../enviar/EnviarPage';

const settings = parseConfig({ VITE_API_URL: 'https://site.example.org' });
const services: SessionService[] = [];
const cleanupAccess: Array<() => void> = [];
beforeEach(() => {
  vi.spyOn(config, 'getConfig').mockReturnValue(settings);
  vi.stubGlobal('crypto', webcrypto);
  URL.createObjectURL = vi.fn(() => `blob:${crypto.randomUUID()}`);
  URL.revokeObjectURL = vi.fn();
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
          void navigate(
            `/enviar?entrada=prints&prints=${printIntentId}&item=${printItemId}&casa=8`,
          )
        }
      >
        Mudar endereço de teste
      </button>
    </>
  );
}
async function setup(
  fetcher: (r: Request) => Promise<Response> = async () =>
    json(acceptedUpload, 202),
  path = '/enviar?entrada=prints&estado=GREEN&apagadas=1',
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

function choose(names = ['print.png']) {
  const files = names.map((name) => {
    const file = new File([name], name, { type: 'image/png' });
    Object.defineProperty(file, 'arrayBuffer', {
      value: async () => new TextEncoder().encode(name).buffer,
    });
    return file;
  });
  fireEvent.change(screen.getByLabelText('Imagens dos bilhetes'), {
    target: { files },
  });
  return files;
}
const restored = `/enviar?entrada=prints&prints=${printIntentId}&item=${printItemId}&casa=7`;
function ids(request: Request) {
  const parts = new URL(request.url).pathname.split('/');
  return { intent_id: parts[5]!, item_id: parts[7]! };
}
async function selected(names = ['print.png']) {
  choose(names);
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Enviar prints selecionados' }),
    ).toBeEnabled(),
  );
}
function send() {
  fireEvent.click(
    screen.getByRole('button', { name: 'Enviar prints selecionados' }),
  );
}

it('seleciona sem enviar, guarda só UUIDs na URL e confirma cada multipart', async () => {
  const writes: Request[] = [];
  const received = new Map<string, ReturnType<typeof printItem>>();
  await setup(async (request) => {
    const identity = ids(request);
    if (request.method === 'POST') {
      writes.push(request);
      const remote = printItem({
        ...identity,
        status: 'completed',
        outcome: 'materialized',
        progress_percent: 100,
        results: [
          { type: 'materialized', bet_key: 'real-key', review_ids: [] },
        ],
      });
      received.set(identity.item_id, remote);
      return json(remote, 202);
    }
    if (new URL(request.url).pathname.includes('/itens/'))
      return json({ detail: 'missing' }, 404);
    return received.size
      ? json(
          printIntent([...received.values()], {
            intent_id: identity.intent_id,
            state: 'complete',
          }),
        )
      : json({ detail: 'missing' }, 404);
  });
  await selected(['first.png', 'second.png']);
  expect(writes).toHaveLength(0);
  await waitFor(() =>
    expect(screen.getByTestId('url').textContent).toContain('prints='),
  );
  const params = new URLSearchParams(
    screen.getByTestId('url').textContent!.split('?')[1],
  );
  expect(params.get('estado')).toBe('GREEN');
  expect(params.getAll('item')).toHaveLength(2);
  expect(params.get('prints')).toBeTruthy();
  expect(params.toString()).not.toContain('first.png');
  send();
  await screen.findAllByText('Apostas registradas');
  await waitFor(() => expect(writes).toHaveLength(2));
  for (const write of writes) {
    expect(write.body).not.toBeNull();
    expect(write.headers.get('content-type')).toContain('multipart/form-data');
  }
  expect(
    screen.getAllByRole('link', { name: 'Ver aposta 1' })[0],
  ).toHaveAttribute('href', expect.stringContaining('real-key'));
  fireEvent.click(
    screen.getByRole('button', { name: 'Pausar acompanhamento' }),
  );
  expect(await screen.findByText(/Acompanhamento pausado/)).toBeVisible();
  fireEvent.click(
    screen.getByRole('button', { name: 'Continuar acompanhamento' }),
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Escolher novos prints' }),
  );
  expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
  await waitFor(() =>
    expect(screen.getByTestId('url').textContent).not.toContain('prints='),
  );
});

it('detecta duplicação local, permite remover e adicionar por drop sem perder filtros', async () => {
  await setup(async () => json({ detail: 'missing' }, 404));
  const files = choose(['same.png', 'same.png']);
  await screen.findByText(/Imagem repetida na seleção/);
  expect(screen.getAllByRole('img')).toHaveLength(2);
  fireEvent.error(screen.getAllByRole('img')[0]!);
  expect(screen.getAllByAltText('Prévia de same.png')[0]).toHaveAttribute(
    'hidden',
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Remover print 1 da seleção' }),
  );
  expect(URL.revokeObjectURL).toHaveBeenCalled();
  fireEvent.dragOver(screen.getByRole('region', { name: 'Seleção de prints' }));
  fireEvent.drop(screen.getByRole('region', { name: 'Seleção de prints' }), {
    dataTransfer: { files: [files[0]] },
  });
  await waitFor(() => expect(screen.getAllByText('same.png')).toHaveLength(2));
});

it.each([400, 413, 422])(
  'recusa arquivo %i sem impedir que o próximo seja enviado',
  async (status) => {
    let writes = 0;
    await setup(async (request) =>
      request.method === 'POST'
        ? ++writes === 1
          ? json({ detail: 'PRIVATE' }, status)
          : json(
              printItem({
                ...ids(request),
                status: 'completed',
                outcome: 'no_bet',
                results: [],
                progress_percent: 100,
              }),
              202,
            )
        : json({ detail: 'missing' }, 404),
    );
    await selected(['bad.png', 'good.png']);
    send();
    await screen.findByText('Nenhuma aposta encontrada');
    expect(writes).toBe(2);
    expect(screen.getByText('Arquivo não aceito')).toBeVisible();
    expect(screen.queryByText('PRIVATE')).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Remover print 1 da seleção' }),
    );
  },
);

it.each([429, 402, 503])(
  'preserva os demais arquivos após %i e não repete POST',
  async (status) => {
    let writes = 0;
    await setup(async (request) =>
      request.method === 'POST'
        ? (++writes,
          json({ detail: 'PRIVATE' }, status, { 'Retry-After': '120' }))
        : json({ detail: 'missing' }, 404),
    );
    await selected(['first.png', 'second.png']);
    send();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Enviar prints selecionados' }),
      ).toBeDisabled(),
    );
    expect(writes).toBe(1);
    expect(screen.getByText('second.png')).toBeVisible();
    expect(screen.queryByText('PRIVATE')).not.toBeInTheDocument();
  },
);

it('resposta perdida exige GET da mesma identidade; nova tentativa é explícita', async () => {
  let writes = 0;
  const requestIds: string[] = [];
  await setup(async (request) => {
    if (request.method === 'POST') {
      writes++;
      requestIds.push(new URL(request.url).pathname);
      if (writes === 1) throw new Error('connection lost');
      return json(
        printItem({
          ...ids(request),
          status: 'completed',
          outcome: 'no_bet',
          results: [],
        }),
        202,
      );
    }
    return json({ detail: 'missing' }, 404);
  });
  await selected();
  send();
  await screen.findByText('Confira se o print foi recebido');
  expect(writes).toBe(1);
  expect(
    screen.queryByRole('button', { name: 'Tentar envio do print 1' }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Conferir print 1' }));
  await screen.findByText('Recebimento não encontrado');
  fireEvent.click(
    screen.getByRole('button', { name: 'Tentar envio do print 1' }),
  );
  await screen.findByText('Nenhuma aposta encontrada');
  expect(writes).toBe(2);
  expect(requestIds[0]).toBe(requestIds[1]);
});

it('reconcilia resposta perdida já admitida sem reenviar', async () => {
  let writes = 0;
  let remote: ReturnType<typeof printItem> | undefined;
  await setup(async (request) => {
    if (request.method === 'POST') {
      writes++;
      remote = printItem({
        ...ids(request),
        status: 'completed',
        outcome: 'duplicate',
        duplicate: true,
        results: [],
      });
      throw new Error('lost');
    }
    if (new URL(request.url).pathname.includes('/itens/') && remote)
      return json(remote);
    return json({ detail: 'missing' }, 404);
  });
  await selected();
  send();
  await screen.findByText('Confira se o print foi recebido');
  fireEvent.click(screen.getByRole('button', { name: 'Conferir print 1' }));
  await screen.findByText('Print já recebido');
  expect(writes).toBe(1);
});

it('restaura apenas leitura e permite retry explícito da falha elegível', async () => {
  let retries = 0;
  let remote = printItem({
    status: 'failed',
    outcome: 'failed',
    retryable: true,
    error_code: 'unavailable',
    progress_percent: 100,
    results: null,
  });
  await setup(async (request) => {
    if (request.method === 'POST') {
      retries++;
      const body = await request.json();
      expect(body.expected_attempt).toBe(1);
      expect(body.retry_id).toMatch(/^[\da-f-]{36}$/);
      remote = printItem({
        status: 'completed',
        outcome: 'review',
        attempt: 2,
        last_retry_id: body.retry_id,
        progress_percent: 100,
        results: [{ type: 'review', bet_key: null, review_ids: [12] }],
      });
      return json(remote, 202);
    }
    return json(printIntent([remote]));
  }, restored);
  await screen.findByText('Processamento com falha');
  expect(retries).toBe(0);
  fireEvent.click(
    screen.getByRole('button', { name: 'Tentar processamento do print 1' }),
  );
  await screen.findByText('Precisa de Revisão');
  expect(screen.getByRole('link', { name: 'Abrir Revisão' })).toHaveAttribute(
    'href',
    expect.stringContaining('casa=7'),
  );
  expect(retries).toBe(1);
});

it('READ_ONLY consulta resultados e impede admissão/retry, preservando a seleção', async () => {
  await setup(
    async () =>
      json(
        printIntent([
          printItem({ status: 'failed', outcome: 'failed', retryable: true }),
        ]),
      ),
    restored,
    'READ_ONLY',
  );
  await screen.findByText('Processamento com falha');
  expect(
    screen.getByRole('button', { name: 'Tentar processamento do print 1' }),
  ).toBeDisabled();
  choose();
  await screen.findByText('print.png');
  expect(
    screen.getByRole('button', { name: 'Enviar prints selecionados' }),
  ).toBeDisabled();
});

it.each([409, 410, 401])(
  'escrita %i não permite repetição antes da consulta',
  async (status) => {
    await setup(async (request) =>
      request.method === 'POST'
        ? json({ detail: 'no' }, status)
        : json({ detail: 'missing' }, 404),
    );
    await selected();
    send();
    await screen.findByRole('button', { name: 'Conferir print 1' });
    expect(
      screen.queryByRole('button', { name: 'Tentar envio do print 1' }),
    ).not.toBeInTheDocument();
  },
);

it('payload 202 ilegível ou de outro recurso deixa resultado desconhecido', async () => {
  await setup(async (request) =>
    request.method === 'POST'
      ? json(printItem(), 202)
      : json({ detail: 'missing' }, 404),
  );
  await selected();
  send();
  await screen.findByText('Confira se o print foi recebido');
  expect(screen.queryByText('Recebido')).not.toBeInTheDocument();
});

it('endereço inválido não consulta dados privados e pode ser removido explicitamente', async () => {
  const fetcher = vi.fn(async () => json({ detail: 'missing' }, 404));
  await setup(fetcher, '/enviar?entrada=prints&prints=wrong&casa=7');
  expect(
    screen.getByText('Não foi possível identificar este envio'),
  ).toBeVisible();
  expect(fetcher).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole('button', { name: 'Escolher novos prints' }),
  );
  await screen.findByLabelText('Imagens dos bilhetes');
  expect(screen.getByTestId('url').textContent).toContain('casa=7');
});

it('formato inválido e falha de leitura local não descartam a seleção anterior', async () => {
  await setup(async () => json({ detail: 'missing' }, 404));
  await selected();
  fireEvent.change(screen.getByLabelText('Imagens dos bilhetes'), {
    target: { files: [new File(['x'], 'html.svg', { type: 'image/svg+xml' })] },
  });
  expect(screen.getByRole('alert')).toHaveTextContent(/JPEG/);
  expect(screen.getByText('print.png')).toBeVisible();
  const bad = new File(['x'], 'bad.png', { type: 'image/png' });
  Object.defineProperty(bad, 'arrayBuffer', {
    value: async () => {
      throw new Error('read failed');
    },
  });
  fireEvent.change(screen.getByLabelText('Imagens dos bilhetes'), {
    target: { files: [bad] },
  });
  await screen.findByText(/Não foi possível preparar/);
  expect(screen.getByText('print.png')).toBeVisible();
});

it('logout limpa bytes/prévias e descarta uma resposta tardia', async () => {
  let finish!: (response: Response) => void;
  const waiting = new Promise<Response>((resolve) => {
    finish = resolve;
  });
  const { service } = await setup(async (request) =>
    request.method === 'POST' ? waiting : json({ detail: 'missing' }, 404),
  );
  await selected();
  send();
  await screen.findByText('Enviando arquivo…');
  await act(() => service.logout());
  expect(URL.revokeObjectURL).toHaveBeenCalled();
  expect(screen.queryByText('print.png')).not.toBeInTheDocument();
  await act(async () =>
    finish(
      json(printItem({ status: 'completed', outcome: 'materialized' }), 202),
    ),
  );
  expect(screen.queryByText('Apostas registradas')).not.toBeInTheDocument();
});

it('falha de GET apresenta erro próprio e recuperação só de leitura', async () => {
  let reads = 0;
  await setup(
    async () =>
      ++reads === 1
        ? json({ detail: 'PRIVATE' }, 403)
        : json(
            printIntent([
              printItem({
                status: 'completed',
                outcome: 'no_bet',
                results: [],
              }),
            ]),
          ),
    restored,
  );
  await screen.findByRole('region', {
    name: /Acompanhamento dos prints/,
  });
  expect(screen.queryByText('PRIVATE')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Conferir print 1' }));
});

it('mudar a identidade no endereço limpa prévias e consulta somente o novo recurso', async () => {
  await setup(async (request) =>
    new URL(request.url).pathname.includes(printIntentId)
      ? json(
          printIntent([
            printItem({ status: 'completed', outcome: 'no_bet', results: [] }),
          ]),
        )
      : json({ detail: 'missing' }, 404),
  );
  await selected();
  expect(screen.getByText('print.png')).toBeVisible();
  fireEvent.click(
    screen.getByRole('button', { name: 'Mudar endereço de teste' }),
  );
  await screen.findByText('Nenhuma aposta encontrada');
  expect(screen.queryByText('print.png')).not.toBeInTheDocument();
  expect(URL.revokeObjectURL).toHaveBeenCalled();
});

it('o polling termina após 15 minutos e retomar é somente uma leitura explícita', async () => {
  vi.useFakeTimers();
  let reads = 0;
  await setup(async () => {
    reads++;
    return json(printIntent([printItem()]));
  }, restored);
  await act(async () => {
    await Promise.resolve();
  });
  await act(() => vi.advanceTimersByTimeAsync(16 * 60_000));
  expect(reads).toBeGreaterThan(1);
  expect(reads).toBeLessThan(60);
  expect(screen.getByText(/Acompanhamento pausado/)).toBeVisible();
  const ended = reads;
  await act(() => vi.advanceTimersByTimeAsync(60_000));
  expect(reads).toBe(ended);
  fireEvent.click(
    screen.getByRole('button', { name: 'Continuar acompanhamento' }),
  );
  await act(async () => {
    await Promise.resolve();
  });
  expect(reads).toBeGreaterThan(ended);
});

it('Retry-After acima de 60 segundos interrompe GET automático sem antecipar consulta manual', async () => {
  vi.useFakeTimers();
  let reads = 0;
  await setup(async () => {
    reads++;
    return json({ detail: 'limited' }, 429, { 'Retry-After': '120' });
  }, restored);
  await act(async () => {
    await Promise.resolve();
  });
  expect(
    screen.getByRole('button', { name: 'Conferir print 1' }),
  ).toBeDisabled();
  await act(() => vi.advanceTimersByTimeAsync(61_000));
  expect(reads).toBe(1);
  expect(
    screen.getByRole('button', { name: 'Conferir print 1' }),
  ).toBeDisabled();
  await act(() => vi.advanceTimersByTimeAsync(60_000));
  expect(reads).toBe(1);
  expect(
    screen.getByRole('button', { name: 'Conferir print 1' }),
  ).toBeEnabled();
});
