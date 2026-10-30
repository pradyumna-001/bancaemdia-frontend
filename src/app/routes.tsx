import { lazy, Suspense, type ReactNode } from 'react';
import {
  Outlet,
  type LoaderFunctionArgs,
  type RouteObject,
} from 'react-router-dom';
import { destinoInterno } from '../auth/destinoInterno';
import { exigirSessao, semSessao, type ConsultarSessao } from '../auth/guard';
import { RequireSession } from '../auth/RequireSession';
import type { ConsultarRevisao } from '../features/revisao/estatisticas';
import { AccountPage } from '../features/conta/AccountPage';
import { Placeholder } from './Placeholder';
import { ErrorPage, RouteError } from './RouteError';
import { ROTAS_AUTH, ROTAS_PROTEGIDAS, ROTAS_PUBLICAS } from './paths';
import { Shell } from './Shell';
import { paginaCarregavel } from './paginaCarregavel';
const SistemaPage = paginaCarregavel(
  () => import('../features/sistema/SistemaPage'),
  (m) => m.SistemaPage,
);
const EnviarPage = paginaCarregavel(
  () => import('../features/enviar/EnviarPage'),
  (m) => m.EnviarPage,
);
const TelegramPage = paginaCarregavel(
  () => import('../features/conexoes/TelegramPage'),
  (m) => m.TelegramPage,
);
const AssinaturaPage = paginaCarregavel(
  () => import('../features/assinatura/AssinaturaPage'),
  (m) => m.AssinaturaPage,
);
const ConfiguracoesPage = paginaCarregavel(
  () => import('../features/configuracoes/ConfiguracoesPage'),
  (m) => m.ConfiguracoesPage,
);
const PainelPage = paginaCarregavel(
  () => import('../features/painel/PainelPage'),
  (m) => m.PainelPage,
);
const ApostasPage = paginaCarregavel(
  () => import('../features/apostas/ApostasPage'),
  (m) => m.ApostasPage,
);
const DetalheApostaPage = paginaCarregavel(
  () => import('../features/apostas/detalhe/DetalheApostaPage'),
  (m) => m.DetalheApostaPage,
);
const FotoPage = paginaCarregavel(
  () => import('../features/midia/FotoPage'),
  (m) => m.FotoPage,
);
const ContasPage = paginaCarregavel(
  () => import('../features/contas/ContasPage'),
  (m) => m.ContasPage,
);
const ResultadosPage = paginaCarregavel(
  () => import('../features/resultados/ResultadosPage'),
  (m) => m.ResultadosPage,
);
const CaixaPage = paginaCarregavel(
  () => import('../features/caixa/CaixaPage'),
  (m) => m.CaixaPage,
);

const CalculadorasPage = paginaCarregavel(
  () => import('../features/calculadoras/CalculadorasPage'),
  (m) => m.CalculadorasPage,
);
const HipoteticaPage = paginaCarregavel(
  () => import('../features/hipotetica/HipoteticaPage'),
  (m) => m.HipoteticaPage,
);
const RevisaoPage = paginaCarregavel(
  () => import('../features/revisao/RevisaoPage'),
  (m) => m.RevisaoPage,
);
const PrivacidadePage = paginaCarregavel(
  () => import('../features/configuracoes/privacidade/PrivacidadePage'),
  (m) => m.PrivacidadePage,
);

export function loginLoader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  return { destino: destinoInterno(url.searchParams.get('destino')) };
}

const NovaApostaPage = paginaCarregavel(
  () => import('../features/apostas/nova/NovaApostaPage'),
  (m) => m.NovaApostaPage,
);

const AjudaPage = lazy(() =>
  import('../features/ajuda/AjudaPage').then((m) => ({ default: m.AjudaPage })),
);
const ColetaPage = paginaCarregavel(
  () => import('../features/coleta/ColetaPage'),
  (m) => m.ColetaPage,
);
const AnalisesPage = paginaCarregavel(
  () => import('../features/painel/analises/AnalisesPage'),
  (m) => m.AnalisesPage,
);
const TrocaContaPage = paginaCarregavel(
  () => import('../features/contas/troca/TrocaContaPage'),
  (m) => m.TrocaContaPage,
);
const MetasPage = paginaCarregavel(
  () => import('../features/painel/metas/MetasPage'),
  (m) => m.MetasPage,
);
const InicioPage = paginaCarregavel(
  () => import('../features/inicio/InicioPage'),
  (m) => m.InicioPage,
);

// Each protected path's page module starts loading with its session read.
const PAGINAS: Readonly<Record<string, { carregar: () => void }>> = {
  '/': ApostasPage,
  '/aposta/nova': NovaApostaPage,
  '/aposta/:chave': DetalheApostaPage,
  '/aposta/:chave/foto': FotoPage,
  '/calculadoras': CalculadorasPage,
  '/e-se': HipoteticaPage,
  '/painel': PainelPage,
  '/painel/analises': AnalisesPage,
  '/painel/metas': MetasPage,
  '/contas/trocar': TrocaContaPage,
  '/contas': ContasPage,
  '/contas/:titularId': ContasPage,
  '/configuracoes': ConfiguracoesPage,
  '/inicio': InicioPage,
  '/configuracoes/privacidade': PrivacidadePage,
  '/assinatura': AssinaturaPage,
  '/configuracoes/conexoes': TelegramPage,
  '/enviar': EnviarPage,
  '/resultados': ResultadosPage,
  '/revisao': RevisaoPage,
  '/coleta': ColetaPage,
  '/banca': CaixaPage,
  '/sistema': SistemaPage,
};

export function createAppRoutes(
  consultarSessao: ConsultarSessao = semSessao,
  consultarRevisao?: ConsultarRevisao,
  billingReturning = false,
  antecipar?: (path: string, search: URLSearchParams) => void,
): RouteObject[] {
  const guard = exigirSessao(consultarSessao);
  let billingReturnPending = billingReturning;
  const protectedRoute = (path: string, element: ReactNode): RouteObject => ({
    path,
    caseSensitive: true,
    loader: async ({ request }: LoaderFunctionArgs) => {
      if (Object.hasOwn(PAGINAS, path)) PAGINAS[path]!.carregar();
      const autorizado = await guard();
      // Only after the session is confirmed: the page's first read starts
      // without waiting for the page to render.
      if (autorizado) antecipar?.(path, new URL(request.url).searchParams);
      return autorizado;
    },
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
      <main className="pagina pagina-interna rota-carregando">
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
    children: [
      {
        index: true,
        element: (
          <Suspense
            fallback={
              <main className="pagina pagina-interna rota-carregando">
                <p role="status">Abrindo página…</p>
              </main>
            }
          >
            {element}
          </Suspense>
        ),
        errorElement: <RouteError internal />,
      },
    ],
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
              <main className="pagina pagina-interna rota-carregando">
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
        ) : path === '/calculadoras' || path === '/e-se' ? (
          <Suspense
            fallback={
              <main className="pagina pagina-interna rota-carregando">
                <p role="status">Abrindo página…</p>
              </main>
            }
          >
            {path === '/calculadoras' ? (
              <CalculadorasPage />
            ) : (
              <HipoteticaPage />
            )}
          </Suspense>
        ) : path === '/painel' ? (
          <PainelPage />
        ) : path === '/painel/analises' ? (
          <Suspense
            fallback={
              <main className="pagina pagina-interna rota-carregando">
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
              <main className="pagina pagina-interna rota-carregando">
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
              <main className="pagina pagina-interna rota-carregando">
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
              <main className="pagina pagina-interna rota-carregando">
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
              <main className="pagina pagina-interna rota-carregando">
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
              <main className="pagina pagina-interna rota-carregando">
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
              <main className="pagina pagina-interna rota-carregando">
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
            <main className="pagina pagina-interna rota-carregando">
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
              <main className="pagina pagina-interna rota-carregando">
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
