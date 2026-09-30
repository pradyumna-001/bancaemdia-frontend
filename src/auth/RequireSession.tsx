import { useEffect, useRef, type ReactNode } from 'react';
import { Navigate, useLoaderData, useLocation } from 'react-router-dom';
import { destinoInterno } from './destinoInterno';
import { useAuth } from './ProvedorAuth';
import { useRetryAfter } from '../lib/useRetryAfter';

export function RequireSession({ children }: { children: ReactNode }) {
  const hasSession: unknown = useLoaderData();
  const location = useLocation();
  const auth = useAuth();
  const waiting = useRetryAfter(auth?.state.error);
  const errorRegion = useRef<HTMLElement>(null);
  useEffect(() => {
    if (auth?.state.phase === 'error') errorRegion.current?.focus();
  }, [auth?.state.phase, auth?.state.error]);
  const active = auth ? auth.state.phase !== 'anonymous' : hasSession === true;
  if (!active) {
    // Requests dos loaders omitem o fragmento; location preserva a URL inteira.
    const destino = destinoInterno(
      `${location.pathname}${location.search}${location.hash}`,
    );
    return (
      <Navigate replace to={`/login?${new URLSearchParams({ destino })}`} />
    );
  }
  if (auth) {
    const usable = auth.state.phase === 'authenticated';
    return (
      <>
        {!usable && (
          <main className="pagina">
            {auth.state.phase === 'error' ? (
              <section className="erro-api" ref={errorRegion} tabIndex={-1}>
                <h1>
                  {auth.state.logoutUnconfirmed
                    ? 'A saída ainda não foi confirmada'
                    : 'Não foi possível conferir sua sessão'}
                </h1>
                <p role="alert">
                  {auth.state.logoutUnconfirmed
                    ? 'Os dados desta página foram removidos. Confira a sessão antes de continuar.'
                    : auth.state.error?.message}
                </p>
                <div className="acoes">
                  <button
                    type="button"
                    disabled={waiting}
                    onClick={() => {
                      void (auth.state.logoutUnconfirmed
                        ? auth.service.logout()
                        : auth.service.resume());
                    }}
                  >
                    {auth.state.logoutUnconfirmed
                      ? 'Conferir saída'
                      : 'Conferir sessão'}
                  </button>
                  <a
                    href={`/login?destino=${encodeURIComponent(destinoInterno(location.pathname + location.search + location.hash))}`}
                    target="_blank"
                    rel="noopener"
                  >
                    Entrar novamente (em outra aba)
                  </a>
                </div>
              </section>
            ) : (
              <>
                <p role="status">
                  {auth.state.phase === 'ending'
                    ? 'Encerrando sessão…'
                    : 'Conferindo sessão…'}
                </p>
                {auth.state.logoutUnconfirmed && (
                  <button
                    type="button"
                    onClick={() => {
                      void auth.service.logout();
                    }}
                  >
                    Conferir saída
                  </button>
                )}
              </>
            )}
          </main>
        )}
        {auth.state.person && (
          <div key={auth.state.privateEpoch} hidden={!usable}>
            {children}
          </div>
        )}
      </>
    );
  }
  return children;
}
