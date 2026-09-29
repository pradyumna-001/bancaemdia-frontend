import { useEffect } from 'react';
import {
  isRouteErrorResponse,
  Link,
  useLocation,
  useNavigate,
  useRouteError,
} from 'react-router-dom';

export function RouteError() {
  const error: unknown = useRouteError();
  const status = isRouteErrorResponse(error) ? error.status : 500;
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    // Diagnóstico estruturado, sem corpo de resposta, tokens ou stack na UI.
    console.error('Falha de rota', { status });
  }, [error, status]);
  return (
    <ErrorPage
      status={status}
      retry={() =>
        void navigate(
          `${location.pathname}${location.search}${location.hash}`,
          { replace: true },
        )
      }
    />
  );
}

export function ErrorPage({
  status = 404,
  retry,
}: {
  status?: number;
  retry?: () => void;
}) {
  const missing = status === 404;
  return (
    <main className="pagina pagina-erro">
      <p>bancaemdia</p>
      <p className="legenda">Erro {status}</p>
      <h1>{missing ? 'Não achei esta página' : 'Deu errado'}</h1>
      <p role="alert">
        {missing
          ? 'O endereço pode ter mudado ou não estar disponível.'
          : status === 405
            ? 'Esta ação não está disponível nesta página.'
            : 'Não foi possível abrir esta página. Tente novamente.'}
      </p>
      <div className="acoes">
        {!missing && retry && (
          <button type="button" onClick={retry}>
            Tentar novamente
          </button>
        )}
        <Link to="/">Voltar para Apostas</Link>
        <Link to="/tutorial">Abrir tutorial</Link>
      </div>
    </main>
  );
}
