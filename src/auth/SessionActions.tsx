import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from './ProvedorAuth';
import { ErroApi } from '../components/ErroApi';

// Temporary actions on existing routes; the complete hosted account screens are #12.
export function SessionActions() {
  const auth = useAuth();
  const location = useLocation();
  const service = auth?.service;
  const phase = auth?.state.phase;
  const pathname = location.pathname;
  useEffect(() => {
    if (pathname === '/login' && phase === 'checking') void service?.resume();
  }, [service, phase, pathname]);
  if (!auth) return null;
  if (location.pathname === '/sair')
    return (
      <div className="acoes">
        <button
          type="button"
          onClick={() => {
            void auth.service.logout();
          }}
        >
          Confirmar saída
        </button>
      </div>
    );
  if (location.pathname !== '/login') return null;
  const destination =
    new URLSearchParams(location.search).get('destino') ?? '/';
  return (
    <>
      {auth.state.error && (
        <ErroApi
          error={auth.state.error}
          intent="leitura"
          actions={{
            tentar: () => {
              void auth.service.resume();
            },
          }}
        />
      )}
      <div className="acoes">
        <button
          type="button"
          disabled={
            auth.state.phase === 'checking' ||
            auth.state.phase === 'ending' ||
            (!!auth.state.error && auth.state.error.kind !== 'invalid_request')
          }
          onClick={() => auth.service.login(destination)}
        >
          Entrar com minha conta
        </button>
      </div>
    </>
  );
}
