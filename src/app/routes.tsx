import { lazy, Suspense, type ReactNode } from 'react';
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
import { PainelPage } from '../features/painel/PainelPage';
import { ApostasPage } from '../features/apostas/ApostasPage';
import { DetalheApostaPage } from '../features/apostas/detalhe/DetalheApostaPage';
import { FotoPage } from '../features/midia/FotoPage';
import { ContasPage } from '../features/contas/ContasPage';
import { ResultadosPage } from '../features/resultados/ResultadosPage';
import { CaixaPage } from '../features/caixa/CaixaPage';

const RevisaoPage = lazy(() =>
  import('../features/revisao/RevisaoPage').then((m) => ({
    default: m.RevisaoPage,
  })),
);
const PrivacidadePage = lazy(() =>
  import('../features/configuracoes/privacidade/PrivacidadePage').then((m) => ({
    default: m.PrivacidadePage,
  })),
);

export function loginLoader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  return { destino: destinoInterno(url.searchParams.get('destino')) };
}

const NovaApostaPage = lazy(() =>
  import('../features/apostas/nova/NovaApostaPage').then((m) => ({
    default: m.NovaApostaPage,
  })),
);

const AjudaPage = lazy(() =>
  import('../features/ajuda/AjudaPage').then((m) => ({ default: m.AjudaPage })),
);
const ColetaPage = lazy(() =>
  import('../features/coleta/ColetaPage').then((m) => ({
    default: m.ColetaPage,
  })),
);
const AnalisesPage = lazy(() =>
  import('../features/painel/analises/AnalisesPage').then((m) => ({
    default: m.AnalisesPage,
  })),
);
const TrocaContaPage = lazy(() =>
  import('../features/contas/troca/TrocaContaPage').then((m) => ({
    default: m.TrocaContaPage,
  })),
);
const MetasPage = lazy(() =>
  import('../features/painel/metas/MetasPage').then((m) => ({
    default: m.MetasPage,
  })),
);
const InicioPage = lazy(() =>
  import('../features/inicio/InicioPage').then((m) => ({
    default: m.InicioPage,
  })),
);

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
    shouldRevalidate: ({
      currentUrl,
      nextUrl,
      formMethod,
      defaultShouldRevalidate,
    }) =>
      (path === '/' ||
        path === '/aposta/nova' ||
        path === '/enviar' ||
        path === '/resultados' ||
        path === '/banca' ||
        path === '/painel/analises' ||
        path === '/painel/metas' ||
        path === '/revisao') &&
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
        ) : path === '/aposta/nova' ? (
          <Suspense
            fallback={
              <main className="pagina">
                <h1>Nova aposta</h1>
                <p role="status">Abrindo formulário…</p>
              </main>
            }
          >
            <NovaApostaPage />
          </Suspense>
        ) : path === '/aposta/:chave' ? (
          <DetalheApostaPage />
        ) : path === '/aposta/:chave/foto' ? (
          <FotoPage />
        ) : path === '/painel' ? (
          <PainelPage />
        ) : path === '/painel/analises' ? (
          <Suspense
            fallback={
              <main className="pagina">
                <h1>Análises</h1>
                <p role="status">Abrindo análises…</p>
              </main>
            }
          >
            <AnalisesPage />
          </Suspense>
        ) : path === '/painel/metas' ? (
          <Suspense
            fallback={
              <main className="pagina">
                <h1>Metas</h1>
                <p role="status">Abrindo metas…</p>
              </main>
            }
          >
            <MetasPage />
          </Suspense>
        ) : path === '/contas/trocar' ? (
          <Suspense
            fallback={
              <main className="pagina">
                <h1>Trocar conta em uso</h1>
                <p role="status">Abrindo troca…</p>
              </main>
            }
          >
            <TrocaContaPage />
          </Suspense>
        ) : path === '/contas' || path === '/contas/:titularId' ? (
          <ContasPage />
        ) : path === '/configuracoes' ? (
          <ConfiguracoesPage />
        ) : path === '/inicio' ? (
          <Suspense
            fallback={
              <main className="pagina">
                <h1>Primeiro uso</h1>
                <p role="status">Abrindo primeiros passos…</p>
              </main>
            }
          >
            <InicioPage />
          </Suspense>
        ) : path === '/configuracoes/privacidade' ? (
          <Suspense
            fallback={
              <main className="pagina">
                <h1>Privacidade</h1>
                <p role="status">Abrindo privacidade…</p>
              </main>
            }
          >
            <PrivacidadePage />
          </Suspense>
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
        ) : path === '/resultados' ? (
          <ResultadosPage />
        ) : path === '/revisao' ? (
          <Suspense
            fallback={
              <main className="pagina">
                <h1>Revisão</h1>
                <p role="status">Abrindo revisão…</p>
              </main>
            }
          >
            <RevisaoPage />
          </Suspense>
        ) : path === '/coleta' ? (
          <Suspense
            fallback={
              <main className="pagina">
                <h1>Coleta</h1>
                <p role="status">Abrindo Coleta…</p>
              </main>
            }
          >
            <ColetaPage />
          </Suspense>
        ) : path === '/banca' ? (
          <CaixaPage />
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
      element: (
        <Suspense
          fallback={
            <main className="pagina">
              <h1>{title}</h1>
              <p role="status">Abrindo ajuda…</p>
            </main>
          }
        >
          <AjudaPage extensao={path === '/extensao'} />
        </Suspense>
      ),
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
