import { ABAS } from './nav';
import { ROTAS_AUTH } from './paths';
import { destinoInterno } from '../auth/destinoInterno';
import { clearProtocolParameters } from '../auth/protocolParameters';

// The catalog chooses a fixed destination; an unrecognized address is never a redirect.
export function errorContext(pathname: string, search: string, hash: string) {
  const url = new URL(`/${search}${hash}`, 'https://destino.invalid');
  clearProtocolParameters(url);
  const account = ROTAS_AUTH.some(
    ({ path }) => pathname === path || pathname.startsWith(`${path}/`),
  );
  if (account) {
    const destination = destinoInterno(
      url.searchParams.get('destino') ?? `/${url.search}${url.hash}`,
    );
    const target = new URL(destination, url.origin);
    return {
      label: 'Voltar para entrar',
      to: `/login?${new URLSearchParams({ destino: destination })}`,
      helpTo: destinoInterno(`/tutorial${target.search}${target.hash}`),
    };
  }
  const area = ABAS.find(
    ({ path }) =>
      path !== '/' && (pathname === path || pathname.startsWith(`${path}/`)),
  );
  if (url.searchParams.has('destino')) url.searchParams.delete('destino');
  return {
    label: `Voltar para ${area?.title ?? 'Apostas'}`,
    to: destinoInterno(`${area?.path ?? '/'}${url.search}${url.hash}`),
    helpTo: destinoInterno(`/tutorial${url.search}${url.hash}`),
  };
}
