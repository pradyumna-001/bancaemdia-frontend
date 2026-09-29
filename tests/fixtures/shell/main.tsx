// Entrada exclusiva do servidor de testes. Nunca importada pelo aplicativo.
import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router-dom';
import createClient from 'openapi-fetch';
import type { paths } from '../../../src/api/schema';
import { App } from '../../../src/app/App';
import { createAppRoutes } from '../../../src/app/routes';
import { createAppQueryClient } from '../../../src/app/queryClient';
import '../../../src/styles/base.css';

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
createRoot(document.getElementById('root')!).render(
  <App
    router={createBrowserRouter(createAppRoutes(() => true, consultar))}
    queryClient={createAppQueryClient()}
    ambiente={ambiente}
  />,
);
