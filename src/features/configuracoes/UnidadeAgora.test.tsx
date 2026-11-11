import { render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { createSession } from '../../auth/session';
import { sessionContext } from '../../auth/protocol';
import { ProvedorAuth } from '../../auth/ProvedorAuth';
import { createApiClient } from '../../api/client';
import { parseConfig } from '../../lib/config';
import { unidadePadrao } from '../../../tests/fixtures/unidade';
import { UnidadeAgora } from './UnidadeAgora';

const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).forEach((fn) => fn()));

async function show(response: () => Response) {
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
  const client = createApiClient(
    parseConfig({ VITE_API_URL: 'http://127.0.0.1:8000' }),
    { captureSession: session.capture, fetcher: async () => response() },
  );
  const view = render(
    <ProvedorAuth service={session}>
      <QueryClientProvider client={queries}>
        <MemoryRouter initialEntries={['/aposta/nova?casa=7']}>
          <UnidadeAgora client={client} />
        </MemoryRouter>
      </QueryClientProvider>
    </ProvedorAuth>,
  );
  cleanups.push(() => {
    view.unmount();
    session.dispose();
    queries.clear();
  });
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

it('mostra a unidade de agora e lembra que outra data usa a vigência do instante', async () => {
  await show(() =>
    json({
      ...unidadePadrao,
      vigente: { ...unidadePadrao.vigente, valor_centavos: 2550 },
    }),
  );
  expect(await screen.findByText('R$ 25,50')).toBeVisible();
  expect(
    screen.getByText('unidade vigente no instante da aposta', {
      exact: false,
    }),
  ).toBeVisible();
  // Links keep the current filters.
  expect(screen.getByRole('link', { name: 'Configurações' })).toHaveAttribute(
    'href',
    '/configuracoes?casa=7',
  );
});

it('falha na consulta não bloqueia o formulário nem inventa um valor', async () => {
  await show(() => json({ detail: 'erro_interno' }, 500));
  expect(
    await screen.findByText('Não foi possível consultar a unidade agora', {
      exact: false,
    }),
  ).toBeVisible();
  expect(screen.queryByText(/R\$/)).toBeNull();
});
