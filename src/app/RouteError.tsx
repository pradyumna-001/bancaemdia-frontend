import { useEffect, useRef } from 'react';
import { PreferenciaTema } from '../components/PreferenciaTema';
import { Logo } from '../components/Logo';
import {
  isRouteErrorResponse,
  Link,
  useLocation,
  useRevalidator,
  useNavigation,
  useRouteError,
} from 'react-router-dom';
import { ApiError } from '../api/error';
import { useRetryAfter } from '../lib/useRetryAfter';
import { errorContext } from './errorContext';
import './RouteError.css';

export function RouteError({ internal = false }: { internal?: boolean }) {
  const error: unknown = useRouteError();
  const status = isRouteErrorResponse(error)
    ? error.status
    : error instanceof ApiError && error.status
      ? error.status
      : 500;
  const revalidator = useRevalidator();
  useEffect(() => {
    // Only a fixed event and status: no response data, URL, credentials or stack.
    console.error('Falha de rota', { status });
  }, [error, status]);
  return (
    <ErrorPage
      status={status}
      internal={internal}
      resource
      error={error}
      retry={() => {
        // Revalidate reads loaders with GET, including when the current URL has a hash.
        // It never resubmits a route action or adds a history entry.
        void revalidator.revalidate();
      }}
    />
  );
}

export function ErrorPage({
  status = 404,
  retry,
  internal = false,
  resource = false,
  error,
}: {
  status?: number;
  retry?: () => void;
  internal?: boolean;
  resource?: boolean;
  error?: unknown;
}) {
  const location = useLocation();
  const navigation = useNavigation();
  const revalidation = useRevalidator();
  const busy = navigation.state !== 'idle' || revalidation.state !== 'idle';
  const heading = useRef<HTMLHeadingElement>(null);
  const waiting = useRetryAfter(error);
  const uncertain = error instanceof ApiError && error.outcomeUnknown;
  const unavailable = status === 403 || (status === 404 && resource);
  const missing = status === 404 && !resource;
  const unsupported = status === 405;
  const limited = status === 429;
  const temporary = status === 503;
  const returnLink = errorContext(
    location.pathname,
    location.search,
    location.hash,
  );
  const title = missing
    ? 'Não achei esta página'
    : unavailable
      ? 'Este recurso não está disponível'
      : unsupported
        ? 'Esta ação não está disponível'
        : uncertain
          ? 'Confira se o pedido foi concluído'
          : limited
            ? 'Aguarde para tentar novamente'
            : temporary
              ? 'O serviço está temporariamente indisponível'
              : 'Não foi possível abrir esta página';
  const description = missing
    ? 'O endereço pode ter mudado. Volte para a área que você estava usando ou consulte o tutorial.'
    : unavailable
      ? 'Não foi possível acessar o que você procurou. Volte para a área de origem para continuar.'
      : unsupported
        ? 'Este caminho não permite concluir a ação. Volte para a área de origem e confira o que deseja fazer.'
        : uncertain
          ? 'O serviço pode ter recebido o pedido. Volte para a área de origem e confira o resultado antes de repetir.'
          : limited
            ? 'Muitas tentativas em pouco tempo. Aguarde o prazo informado antes de abrir esta página novamente.'
            : temporary
              ? 'Aguarde um pouco e tente abrir a página novamente. Você também pode continuar em outra área.'
              : 'A página encontrou um problema. Tente abri-la novamente ou volte para a área de origem.';
  const canRetry =
    retry &&
    !missing &&
    !unavailable &&
    !unsupported &&
    !uncertain &&
    (status >= 500 || limited);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [location.key, title]);
  return (
    <main className={`pagina pagina-erro${internal ? ' pagina-interna' : ''}`}>
      {!internal && (
        <header className="cabecalho-marca">
          <Logo />
        </header>
      )}
      <svg
        className="erro-ilustracao"
        width="112"
        height="64"
        viewBox="0 0 112 64"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M12 40h28c8 0 8-24 16-24h16M88 16h12M56 48h32" />
        <circle cx="12" cy="40" r="5" />
        <circle cx="100" cy="16" r="5" />
        <path d="m80 12-4 8m12 24 4 4-4 4" />
      </svg>
      <p className="legenda">
        {missing ? 'Página não encontrada' : 'Não foi possível continuar'}
      </p>
      <h1 ref={heading} tabIndex={-1}>
        {title}
      </h1>
      <p role="alert">{description}</p>
      {waiting && canRetry && (
        <p className="erro-espera">
          Aguarde o prazo informado pelo serviço antes de tentar novamente.
        </p>
      )}
      <div className="acoes">
        {canRetry && (
          <button
            className="erro-principal"
            type="button"
            disabled={waiting || busy}
            onClick={retry}
          >
            {busy ? 'Abrindo página…' : 'Tentar novamente'}
          </button>
        )}
        <Link
          className={canRetry ? undefined : 'erro-principal'}
          to={returnLink.to}
        >
          {returnLink.label}
        </Link>
        <Link to={returnLink.helpTo}>Abrir tutorial</Link>
      </div>
      {!internal && <PreferenciaTema />}
    </main>
  );
}
