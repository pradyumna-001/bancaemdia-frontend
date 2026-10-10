import type { ReactNode } from 'react';
import {
  Outlet,
  type LoaderFunctionArgs,
  type RouteObject,
} from 'react-router-dom';
import { destinoInterno } from '../auth/destinoInterno';
import { exigirSessao, semSessao, type ConsultarSessao } from '../auth/guard';
import { RequireSession } from '../auth/RequireSession';
import { Placeholder } from './Placeholder';
import { ErrorPage, RouteError } from './RouteError';
import { ROTAS_AUTH, ROTAS_PROTEGIDAS, ROTAS_PUBLICAS } from './paths';
import { Shell } from './Shell';
import { SistemaPage } from '../features/sistema/SistemaPage';
import type { ConsultarRevisao } from '../features/revisao/estatisticas';
import { AccountPage } from '../features/conta/AccountPage';
import { EnviarPage } from '../features/enviar/EnviarPage';
import { TelegramPage } from '../features/conexoes/TelegramPage';
import { AssinaturaPage } from '../features/assinatura/AssinaturaPage';
import { ConfiguracoesPage } from '../features/configuracoes/ConfiguracoesPage';
import { ApostasPage } from '../features/apostas/ApostasPage';

export function loginLoader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  return { destino: destinoInterno(url.searchParams.get('destino')) };
}

export function createAppRoutes(
  consultarSessao: ConsultarSessao = semSessao,
  consultarRevisao?: ConsultarRevisao,
  billingReturning = false,
): RouteObject[] {
  const guard = exigirSessao(consultarSessao);
  let billingReturnPending = billingReturning;
  const protectedRoute = (path: string, element: ReactNode): RouteObject => ({
    path,
    caseSensitive: true,
    loader: guard,
    // Changing the list's URL selectors is a query, not a new protected page.
    // RequireSession and every API read still enforce the current identity.
    shouldRevalidate: ({
      currentUrl,
      nextUrl,
      formMethod,
      defaultShouldRevalidate,
    }) =>
      path === '/' &&
      currentUrl.pathname === nextUrl.pathname &&
      currentUrl.search !== nextUrl.search &&
      !formMethod
        ? false
        : defaultShouldRevalidate,
    hydrateFallbackElement: (
      <main className="pagina">
        <p role="status">Abrindo página…</p>
      </main>
    ),
    element: (
      <RequireSession>
        <Shell consultarRevisao={consultarRevisao}>
          <Outlet />
        </Shell>
      </RequireSession>
    ),
    // A failed guard has no proven private context. Child failures keep the guarded shell.
    errorElement: <RouteError />,
    children: [{ index: true, element, errorElement: <RouteError internal /> }],
  });
  return [
    ...ROTAS_PROTEGIDAS.map(({ path, title }) =>
      protectedRoute(
        path,
        path === '/' ? (
          <ApostasPage />
        ) : path === '/configuracoes' ? (
          <ConfiguracoesPage />
        ) : path === '/assinatura' ? (
          <AssinaturaPage
            returning={() => billingReturnPending}
            onReturnHandled={() => {
              billingReturnPending = false;
            }}
          />
        ) : path === '/configuracoes/conexoes' ? (
          <TelegramPage />
        ) : path === '/enviar' ? (
          <EnviarPage />
        ) : path === '/sistema' ? (
          <SistemaPage />
        ) : (
          <Placeholder title={title} interna />
        ),
      ),
    ),
    ...ROTAS_PUBLICAS.map(({ path, title }) => ({
      path,
      caseSensitive: true,
      element: <Placeholder title={title} />,
      errorElement: <RouteError />,
    })),
    ...ROTAS_AUTH.map(({ path, protected: isProtected }) =>
      isProtected
        ? protectedRoute(path, <AccountPage path={path} />)
        : {
            hydrateFallbackElement: (
              <main className="pagina">
                <p role="status">Abrindo página…</p>
              </main>
            ),
            path,
            caseSensitive: true,
            loader: path === '/login' ? loginLoader : undefined,
            element: <AccountPage path={path} />,
            errorElement: <RouteError />,
          },
    ),
    { path: '*', element: <ErrorPage />, errorElement: <RouteError /> },
  ];
}
