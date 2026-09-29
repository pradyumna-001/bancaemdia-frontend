import { type LoaderFunctionArgs, type RouteObject } from 'react-router-dom';
import { destinoInterno } from '../auth/destinoInterno';
import { exigirSessao, semSessao, type ConsultarSessao } from '../auth/guard';
import { RequireSession } from '../auth/RequireSession';
import { Placeholder } from './Placeholder';
import { ErrorPage, RouteError } from './RouteError';
import { ROTAS_AUTH, ROTAS_PROTEGIDAS, ROTAS_PUBLICAS } from './paths';

export function loginLoader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  return { destino: destinoInterno(url.searchParams.get('destino')) };
}

export function createAppRoutes(
  consultarSessao: ConsultarSessao = semSessao,
): RouteObject[] {
  const guard = exigirSessao(consultarSessao);
  return [
    ...ROTAS_PROTEGIDAS.map(({ path, title }) => ({
      path,
      caseSensitive: true,
      loader: guard,
      hydrateFallbackElement: (
        <main className="pagina">
          <p role="status">Abrindo página…</p>
        </main>
      ),
      element: (
        <RequireSession>
          <Placeholder title={title} />
        </RequireSession>
      ),
      errorElement: <RouteError />,
    })),
    ...ROTAS_PUBLICAS.map(({ path, title }) => ({
      path,
      caseSensitive: true,
      element: <Placeholder title={title} />,
      errorElement: <RouteError />,
    })),
    ...ROTAS_AUTH.map(({ path, title, protected: protectedRoute }) => ({
      hydrateFallbackElement: (
        <main className="pagina">
          <p role="status">Abrindo página…</p>
        </main>
      ),
      path,
      caseSensitive: true,
      loader: protectedRoute
        ? guard
        : path === '/login'
          ? loginLoader
          : undefined,
      element: protectedRoute ? (
        <RequireSession>
          <Placeholder title={title} />
        </RequireSession>
      ) : (
        <Placeholder title={title} />
      ),
      errorElement: <RouteError />,
    })),
    { path: '*', element: <ErrorPage />, errorElement: <RouteError /> },
  ];
}
