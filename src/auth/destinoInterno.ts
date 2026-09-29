import { matchPath } from 'react-router-dom';
import { ROTAS_PROTEGIDAS, ROTAS_PUBLICAS } from '../app/paths';

const allowedPaths = [...ROTAS_PROTEGIDAS, ...ROTAS_PUBLICAS];
const internalOrigin = 'https://destino.invalid';

function temControle(value: string): boolean {
  return Array.from(value).some(
    (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
  );
}

export function destinoInterno(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/';
  // Decodificar só para validar. O retorno preserva a codificação dos filtros.
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return '/';
  }
  if (
    value.includes(' ') ||
    value.includes('\\') ||
    decoded.includes('\\') ||
    temControle(value) ||
    temControle(decoded)
  )
    return '/';

  const url = new URL(value, internalOrigin);
  if (url.origin !== internalOrigin || url.pathname.startsWith('//'))
    return '/';
  // Não aceitar separadores/escapes escondidos no path, nem normalizar ../.
  const rawPath = value.split(/[?#]/, 1)[0];
  if (url.pathname !== rawPath || /%(?:2f|5c|25)/i.test(url.pathname))
    return '/';
  if (
    !allowedPaths.some(({ path }) =>
      matchPath({ path, end: true, caseSensitive: true }, url.pathname),
    )
  )
    return '/';
  return `${url.pathname}${url.search}${url.hash}`;
}
