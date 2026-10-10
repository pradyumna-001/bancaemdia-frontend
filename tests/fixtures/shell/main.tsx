// Entrada exclusiva do servidor de testes. Nunca importada pelo aplicativo.
import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router-dom';
import createClient from 'openapi-fetch';
import type { paths } from '../../../src/api/schema';
import { App } from '../../../src/app/App';
import { createAppRoutes } from '../../../src/app/routes';
import { createAppQueryClient } from '../../../src/app/queryClient';
import '../../../src/styles/base.css';
import { RecoveryPage } from './RecoveryPage';
import { routeFailures } from './routeFailures';
import { initializeConfig } from '../../../src/lib/config';
import { initializeApiClient } from '../../../src/api/client';
import { createSession } from '../../../src/auth/session';
import { sessionContext } from '../../../src/auth/protocol';
import { ProvedorAuth } from '../../../src/auth/ProvedorAuth';
import { createAccessController } from '../../../src/features/acesso/controller';

const client = createClient<paths>({ baseUrl: location.origin });
const consultar = async () => {
  const { data, error, response } = await client.GET('/api/v1/revisao/stats');
  if (error || !data)
    throw Object.assign(new Error('Consulta indisponível'), {
      status: response.status,
    });
  return data;
};
const params = new URLSearchParams(location.search);
const ambiente =
  params.get('ambiente') === 'production' ? 'production' : 'staging';
async function bootstrapFixture() {
  await initializeConfig();
  const queries = createAppQueryClient();
  const context = sessionContext({
    usuario_id: 1,
    nome: 'Demonstração isolada',
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
  const access = createAccessController(session, queries);
  initializeApiClient({
    captureSession: session.capture,
    onAccessDenied: access.denied,
  });
  createRoot(document.getElementById('root')!).render(
    <ProvedorAuth service={session}>
      <App
        router={createBrowserRouter([
          { path: '/testes/recuperacao', element: <RecoveryPage /> },
          ...routeFailures(createAppRoutes(session.resume, consultar)),
        ])}
        queryClient={queries}
        access={access}
        ambiente={ambiente}
      />
    </ProvedorAuth>,
  );
}
void bootstrapFixture();
