import { useState } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { createSession } from '../../auth/session';
import { sessionContext } from '../../auth/protocol';
import { ProvedorAuth } from '../../auth/ProvedorAuth';
import { createApiClient } from '../../api/client';
import { parseConfig } from '../../lib/config';
import { ApiError } from '../../api/error';
import { createAccessController } from './controller';
import { ProvedorAcesso, useAcesso } from './ProvedorAcesso';
import { AvisoAcesso } from './AvisoAcesso';
import { billingStatus } from '../../../tests/fixtures/acesso';

const cleanups: Array<() => void> = [];
afterEach(() => {
  cleanups.splice(0).forEach((fn) => fn());
  vi.restoreAllMocks();
});
function Tools({ client }: { client: ReturnType<typeof createApiClient> }) {
  const access = useAcesso()!;
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  return (
    <>
      <label>
        Descrição
        <input value={text} onChange={(event) => setText(event.target.value)} />
      </label>
      <button
        disabled={!access.can('POST /api/v1/apostas')}
        onClick={() => {
          void access
            .run('POST /api/v1/apostas', () =>
              client.POST('/api/v1/apostas', {
                body: {
                  casa: 'betano',
                  odd: 2,
                  stake_unidades: 1,
                  freebet: false,
                },
              }),
            )
            .catch((e: unknown) =>
              setError(e instanceof ApiError ? e.message : 'Falha'),
            );
        }}
      >
        Salvar aposta
      </button>
      <button
        disabled={!access.can('POST /api/v1/calculadoras/mercado-justo')}
        onClick={() => {
          void access.run(
            'POST /api/v1/calculadoras/mercado-justo',
            async () => {},
          );
        }}
      >
        Calcular
      </button>
      <button
        disabled={!access.can('GET /api/v1/usuario/me/export')}
        onClick={() => {
          void access
            .run('GET /api/v1/usuario/me/export', () =>
              client.GET('/api/v1/usuario/me/export'),
            )
            .catch(() => {});
        }}
      >
        Exportar dados
      </button>
      <p>{error}</p>
    </>
  );
}
async function open(initial: unknown = billingStatus, code = 200) {
  const queries = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  let person = 1;
  const transport = {
    read: vi.fn(async () =>
      sessionContext({
        usuario_id: person,
        nome: 'Sandbox',
        email: 'sandbox@example.org',
        session_version: `aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa:${person}`,
        csrf_token: crypto.randomUUID(),
        refresh_required: false,
        access_expires_at: '2030-01-01T00:00:00Z',
        session_expires_at: '2030-01-02T00:00:00Z',
      }),
    ),
    renew: vi.fn(),
    logout: vi.fn(),
  };
  const session = createSession({
    baseUrl: 'http://127.0.0.1:8000',
    queryClient: queries,
    transport,
    exclusive: async (_signal, work) => work(),
  });
  await session.resume();
  const controller = createAccessController(session, queries);
  let body = initial;
  let status = code;
  let headers: Record<string, string> = {};
  let mutation = false;
  const fetcher = vi.fn(async (request: Request) => {
    if (request.method === 'POST' && mutation)
      body = { ...billingStatus, access: 'READ_ONLY' };
    return new Response(
      JSON.stringify(
        request.method === 'POST' && mutation
          ? { detail: 'account_read_only' }
          : body,
      ),
      {
        status: request.method === 'POST' && mutation ? 402 : status,
        headers: { 'Content-Type': 'application/json', ...headers },
      },
    );
  });
  const client = createApiClient(
    parseConfig({ VITE_API_URL: 'http://127.0.0.1:8000' }),
    {
      fetcher,
      captureSession: session.capture,
      onAccessDenied: controller.denied,
      onUnauthorized: session.unauthorized,
    },
  );
  render(
    <ProvedorAuth service={session}>
      <QueryClientProvider client={queries}>
        <ProvedorAcesso controller={controller} client={client}>
          <MemoryRouter initialEntries={['/painel?casa=7&apagadas=1']}>
            <AvisoAcesso />
            <Tools client={client} />
          </MemoryRouter>
        </ProvedorAcesso>
      </QueryClientProvider>
    </ProvedorAuth>,
  );
  cleanups.push(() => {
    controller.dispose();
    session.dispose();
    queries.clear();
  });
  return {
    controller,
    session,
    queries,
    fetcher,
    transport,
    deny: () => {
      mutation = true;
    },
    reply: (value: unknown, newStatus = 200, extra = {}) => {
      body = value;
      status = newStatus;
      headers = extra;
    },
    switchPerson: (id: number) => {
      person = id;
    },
  };
}
it('mantém consultas e exceções POST em leitura; data pertence ao servidor e URL segue para assinatura', async () => {
  const s = await open({ ...billingStatus, access: 'READ_ONLY' });
  await screen.findByRole('heading', {
    name: 'Sua conta está em modo de leitura',
  });
  expect(screen.getByRole('button', { name: 'Salvar aposta' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Calcular' })).toBeEnabled();
  expect(screen.getByText(/Fim do período informado/)).toHaveTextContent(
    '08/10/2026, 09:00 (America/Sao_Paulo)',
  );
  expect(screen.getByRole('link', { name: 'Ver assinatura' })).toHaveAttribute(
    'href',
    '/assinatura?casa=7&apagadas=1',
  );
  await userEvent.click(screen.getByRole('button', { name: 'Exportar dados' }));
  await userEvent.click(screen.getByRole('button', { name: 'Calcular' }));
  await waitFor(() => expect(s.fetcher).toHaveBeenCalledTimes(2));
});
it('402 preserva formulário e sessão; reconfirmação de pagamento não repete a escrita', async () => {
  const s = await open();
  const save = screen.getByRole('button', { name: 'Salvar aposta' });
  await waitFor(() => expect(save).toBeEnabled());
  await userEvent.type(
    screen.getByLabelText('Descrição'),
    'entrada preservada',
  );
  s.deny();
  await userEvent.click(save);
  await screen.findByRole('heading', {
    name: 'Sua conta está em modo de leitura',
  });
  expect(save).toBeDisabled();
  expect(screen.getByLabelText('Descrição')).toHaveValue('entrada preservada');
  expect(s.session.getSnapshot().phase).toBe('authenticated');
  const mutations = () =>
    s.fetcher.mock.calls.filter(([r]) => r.method === 'POST').length;
  expect(mutations()).toBe(1);
  s.reply(billingStatus);
  await userEvent.click(
    screen.getByRole('button', { name: 'Conferir acesso' }),
  );
  await waitFor(() => expect(save).toBeEnabled());
  expect(mutations()).toBe(1);
});
it('falha de status fecha escrita mesmo com confirmação anterior; recuperação mantém entrada', async () => {
  const s = await open();
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Salvar aposta' })).toBeEnabled(),
  );
  await userEvent.type(screen.getByLabelText('Descrição'), 'não apagar');
  s.reply({}, 503);
  await act(async () => {
    s.controller.denied();
  });
  await screen.findByRole('heading', {
    name: 'Não foi possível conferir seu acesso',
  });
  expect(screen.getByRole('button', { name: 'Salvar aposta' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Exportar dados' })).toBeEnabled();
  s.reply({ ...billingStatus, access: 'READ_ONLY', trial_ends_at: null });
  await userEvent.click(
    screen.getByRole('button', { name: 'Conferir acesso' }),
  );
  await screen.findByRole('heading', {
    name: 'Sua conta está em modo de leitura',
  });
  expect(screen.queryByText(/Fim do período/)).toBeNull();
  expect(screen.getByLabelText('Descrição')).toHaveValue('não apagar');
});
it('prazo longo impede nova consulta manual, foco e concessão de escrita', async () => {
  const s = await open({}, 429);
  s.reply({}, 503, { 'Retry-After': '120' });
  await screen.findByRole('heading', {
    name: 'Não foi possível conferir seu acesso',
  });
  await userEvent.click(
    screen.getByRole('button', { name: 'Conferir acesso' }),
  );
  await screen.findByText(
    'Aguarde o prazo informado pelo serviço antes de conferir novamente.',
  );
  expect(
    screen.getByRole('button', { name: 'Conferir acesso' }),
  ).toBeDisabled();
  const calls = s.fetcher.mock.calls.length;
  await act(async () => {
    window.dispatchEvent(new Event('focus'));
  });
  expect(s.fetcher).toHaveBeenCalledTimes(calls);
});
it('troca de pessoa não herda confirmação; logout não concede consultas nem mantém avisos privados', async () => {
  const s = await open();
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Salvar aposta' })).toBeEnabled(),
  );
  s.reply({ ...billingStatus, access: 'READ_ONLY', trial_ends_at: null });
  s.switchPerson(2);
  await act(async () => {
    await s.session.resume();
  });
  await screen.findByRole('heading', {
    name: 'Sua conta está em modo de leitura',
  });
  expect(s.controller.key()[1]).toBe(2);
  await act(async () => {
    await s.session.logout();
  });
  expect(screen.getByRole('button', { name: 'Exportar dados' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Calcular' })).toBeDisabled();
  expect(screen.queryByText(/Fim do período/)).toBeNull();
});
it('sem provedor não inventa acesso nem apresenta confirmação', () => {
  render(
    <MemoryRouter>
      <AvisoAcesso />
    </MemoryRouter>,
  );
  expect(screen.queryByRole('region')).toBeNull();
});
