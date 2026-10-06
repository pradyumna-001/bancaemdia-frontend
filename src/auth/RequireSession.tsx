import { type ReactNode } from 'react';
import { Navigate, useLoaderData, useLocation } from 'react-router-dom';
import { destinoInterno } from './destinoInterno';

export function RequireSession({ children }: { children: ReactNode }) {
  const hasSession: unknown = useLoaderData();
  const location = useLocation();
  if (hasSession !== true) {
    // Requests dos loaders omitem o fragmento; location preserva a URL inteira.
    const destino = destinoInterno(
      `${location.pathname}${location.search}${location.hash}`,
    );
    return (
      <Navigate replace to={`/login?${new URLSearchParams({ destino })}`} />
    );
  }
  return children;
}
