// Session injection exists exclusively in this isolated exercise, never public dist/.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Outlet } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ProvedorAuth } from '../../../src/auth/ProvedorAuth';
import { createSession } from '../../../src/auth/session';
import { sessionContext } from '../../../src/auth/protocol';
import { createAppQueryClient } from '../../../src/app/queryClient';
import { Shell } from '../../../src/app/Shell';
import { parseConfig } from '../../../src/lib/config';
import { createApiClient } from '../../../src/api/client';
import { createAccessController } from '../../../src/features/acesso/controller';
import {
  ProvedorAcesso,
  useAcesso,
} from '../../../src/features/acesso/ProvedorAcesso';
import { RouterProvider } from 'react-router-dom';
import { ErroApi } from '../../../src/components/ErroApi';
import '../../../src/styles/base.css';
import '../../../src/app/pages.css';

const queries = createAppQueryClient();
const context = sessionContext({
  usuario_id: 1,
  nome: 'Demonstração',
  email: 'sandbox@example.org',
  session_version: `${crypto.randomUUID()}:1`,
  csrf_token: crypto.randomUUID(),
  refresh_required: false,
  access_expires_at: '2030-01-01T00:00:00Z',
  session_expires_at: '2030-01-02T00:00:00Z',
});
const session = createSession({
  baseUrl: location.origin,
  queryClient: queries,
  transport: {
    read: async () => context,
    renew: async () => context,
    logout: async () => {},
  },
  exclusive: async (_signal, work) => work(),
});
const controller = createAccessController(session, queries);
const client = createApiClient(parseConfig({ VITE_API_URL: location.origin }), {
  captureSession: session.capture,
  onAccessDenied: controller.denied,
});
function Exercise() {
  const access = useAcesso()!;
  const [description, setDescription] = useState('');
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  return (
    <main className="pagina">
      <p className="legenda">Demonstração isolada • sessão e dados simulados</p>
      <h1>Acesso à conta</h1>
      <p>
        O aviso acima é o componente que aparece nas áreas protegidas do site.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setBusy(true);
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
            .catch(setError)
            .finally(() => setBusy(false));
        }}
      >
        <label htmlFor="descricao">Descrição de teste</label>
        <input
          id="descricao"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <div className="acoes">
          <button disabled={busy || !access.can('POST /api/v1/apostas')}>
            {busy ? 'Enviando…' : 'Salvar aposta de teste'}
          </button>
        </div>
      </form>
      {error !== undefined && (
        <ErroApi
          error={error}
          intent="gravacao"
          destination={location.pathname + location.search}
        />
      )}
    </main>
  );
}
const router = createBrowserRouter([
  {
    path: '*',
    loader: session.resume,
    element: (
      <Shell>
        <Outlet />
      </Shell>
    ),
    children: [{ path: '*', element: <Exercise /> }],
  },
]);
createRoot(document.getElementById('root')!).render(
  <ProvedorAuth service={session}>
    <QueryClientProvider client={queries}>
      <ProvedorAcesso controller={controller} client={client}>
        <RouterProvider router={router} />
      </ProvedorAcesso>
    </QueryClientProvider>
  </ProvedorAuth>,
);
