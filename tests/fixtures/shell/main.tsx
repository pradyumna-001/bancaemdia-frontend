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
import { ValoresPage } from './ValoresPage';
import { routeFailures } from './routeFailures';
import { initializeConfig } from '../../../src/lib/config';
import { ProvedorAuth } from '../../../src/auth/ProvedorAuth';
import { createSession, browserExclusive } from '../../../src/auth/session';
import { initializeApiClient } from '../../../src/api/client';
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
const root = createRoot(document.getElementById('root')!);
void initializeConfig().then(() => {
  const queryClient = createAppQueryClient();
  const auth = createSession({
    baseUrl: location.origin,
    queryClient,
    exclusive: browserExclusive(),
  });
  const access = createAccessController(auth, queryClient);
  const api = initializeApiClient({
    captureSession: auth.capture,
    onUnauthorized: auth.unauthorized,
    onAccessDenied: access.denied,
    beforeMutation: (operation) => access.run(api, operation, async () => {}),
  });
  root.render(
    <ProvedorAuth service={auth}>
      <App
        router={createBrowserRouter([
          { path: '/testes/recuperacao', element: <RecoveryPage /> },
          { path: '/testes/valores', element: <ValoresPage /> },
          ...routeFailures(createAppRoutes(auth.resume, consultar)),
        ])}
        queryClient={queryClient}
        ambiente={ambiente}
        access={access}
      />
    </ProvedorAuth>,
  );
});
