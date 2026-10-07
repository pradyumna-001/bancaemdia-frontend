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
import { initializeConfig, getConfig } from '../../../src/lib/config';
import { createSession } from '../../../src/auth/session';
import { ProvedorAuth } from '../../../src/auth/ProvedorAuth';
import { initializeApiClient } from '../../../src/api/client';

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
if (location.pathname === '/enviar') {
  void initializeConfig().then(() => {
    const queryClient = createAppQueryClient();
    const auth = createSession({
      baseUrl: getConfig().apiUrl,
      queryClient,
      exclusive: async (_signal, work) => work(),
    });
    initializeApiClient({
      captureSession: auth.capture,
      onUnauthorized: auth.unauthorized,
    });
    root.render(
      <ProvedorAuth service={auth}>
        <App
          router={createBrowserRouter(createAppRoutes(auth.resume, consultar))}
          queryClient={queryClient}
        />
      </ProvedorAuth>,
    );
  });
} else
  root.render(
    <App
      router={createBrowserRouter([
        { path: '/testes/recuperacao', element: <RecoveryPage /> },
        ...routeFailures(createAppRoutes(() => true, consultar)),
      ])}
      queryClient={createAppQueryClient()}
      ambiente={ambiente}
    />,
  );
