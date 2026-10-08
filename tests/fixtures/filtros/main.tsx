// Authenticated exercise only: real session provider/client, never an entry in dist/.
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { App } from '../../../src/app/App';
import { createAppRoutes } from '../../../src/app/routes';
import { ConfigFailure } from '../../../src/app/ConfigFailure';
import { createAppQueryClient } from '../../../src/app/queryClient';
import { initializeConfig, getConfig } from '../../../src/lib/config';
import { adaptarFiltros, trocarPagina } from '../../../src/lib/params';
import { initializeApiClient, getApiClient } from '../../../src/api/client';
import { ApiError } from '../../../src/api/error';
import { browserExclusive, createSession } from '../../../src/auth/session';
import { RequireSession } from '../../../src/auth/RequireSession';
import { ProvedorAuth, useAuth } from '../../../src/auth/ProvedorAuth';
import { FiltrosDaApi } from '../../../src/components/filtros/FiltrosDaApi';
import { useFiltros } from '../../../src/components/filtros/Filtros';
import { PreferenciaTema } from '../../../src/components/PreferenciaTema';
import '../../../src/styles/base.css';

function Exercicio() {
  const auth = useAuth()!;
  const { visao, adapter } = useFiltros('apostas');
  const painel = adaptarFiltros(visao, 'painel');
  const [, setSearch] = useSearchParams();
  const client = getApiClient();
  const scope = [auth.state.person?.id, auth.state.privateEpoch, visao.busca];
  const lista = useQuery({
    queryKey: ['exercicio-lista', ...scope],
    enabled: !!adapter.apostas && auth.state.phase === 'authenticated',
    queryFn: ({ signal }) =>
      auth.service.read(async () => {
        const result = await client.GET('/api/v1/apostas', {
          params: { query: adapter.apostas },
          signal,
        });
        if (!result.data) throw new ApiError('invalid_response');
        return result.data;
      }),
  });
  const resumo = useQuery({
    queryKey: ['exercicio-resumo', ...scope],
    enabled: !!painel.painel && auth.state.phase === 'authenticated',
    queryFn: ({ signal }) =>
      auth.service.read(async () => {
        const result = await client.GET('/api/v1/painel/filtrado', {
          params: { query: painel.painel },
          signal,
        });
        if (!result.data) throw new ApiError('invalid_response');
        return result.data;
      }),
  });
  return (
    <main className="pagina">
      <h1>Exercício de filtros autenticados</h1>
      <p>
        Componentes da #17. As páginas de Apostas e Painel pertencem às #18 e
        #20.
      </p>
      <PreferenciaTema />
      <FiltrosDaApi recurso="apostas" />
      <div className="acoes">
        <button
          type="button"
          onClick={() =>
            setSearch((current) => trocarPagina(current, visao.page + 1))
          }
        >
          Próxima página
        </button>
        <Link to="/sair">Sair do exercício</Link>
      </div>
      <output aria-label="Consulta normalizada">
        {JSON.stringify(adapter.apostas ?? null)}
      </output>
      <output aria-label="Resposta da lista">
        {JSON.stringify(lista.data ?? null)}
      </output>
      <output aria-label="Resposta do resumo">
        {JSON.stringify(resumo.data ?? null)}
      </output>
      {(lista.isError || resumo.isError) && (
        <p role="alert">
          Não foi possível consultar os dados. Os filtros foram preservados.
        </p>
      )}
    </main>
  );
}
const root = createRoot(document.getElementById('root')!);
initializeConfig().then(
  () => {
    const queryClient = createAppQueryClient();
    const auth = createSession({
      baseUrl: getConfig().apiUrl,
      queryClient,
      exclusive: browserExclusive(),
    });
    const api = initializeApiClient({
      captureSession: auth.capture,
      onUnauthorized: auth.unauthorized,
    });
    const router = createBrowserRouter([
      {
        path: '/testes/filtros-autenticados',
        loader: () => auth.resume(),
        element: (
          <RequireSession>
            <Exercicio />
          </RequireSession>
        ),
      },
      ...createAppRoutes(auth.resume, (signal) =>
        auth.read(async () => {
          const result = await api.GET('/api/v1/revisao/stats', { signal });
          if (!result.data) throw new ApiError('invalid_response');
          return result.data;
        }),
      ),
    ]);
    root.render(
      <ProvedorAuth service={auth}>
        <App router={router} queryClient={queryClient} />
      </ProvedorAuth>,
    );
  },
  (error) => root.render(<ConfigFailure error={error} />),
);
