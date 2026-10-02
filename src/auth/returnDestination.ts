import { destinoInterno } from './destinoInterno';
import { clearProtocolParameters } from './protocolParameters';

export function sanitizeProtocolLocation(location: Location, history: History) {
  const current = location.pathname + location.search + location.hash;
  const url = new URL(current, 'https://destino.invalid');
  clearProtocolParameters(url);
  if (url.searchParams.has('destino'))
    url.searchParams.set(
      'destino',
      destinoInterno(url.searchParams.get('destino')),
    );
  const safe = url.pathname + url.search + url.hash;
  if (safe !== current) history.replaceState(history.state, '', safe);
}

const key = 'bancaemdia:retorno-fragmento';
export function loginDestination(value: string, storage?: Storage) {
  const safe = destinoInterno(value);
  const hashAt = safe.indexOf('#');
  const path = hashAt < 0 ? safe : safe.slice(0, hashAt);
  try {
    storage?.removeItem(key);
    if (hashAt >= 0)
      storage?.setItem(
        key,
        JSON.stringify({ path, hash: safe.slice(hashAt), at: Date.now() }),
      );
  } catch {
    /* Only the optional, non-secret fragment is lost without storage. */
  }
  return path;
}

export function restoreLoginFragment(
  location: Location,
  history: History,
  storage?: Storage,
) {
  let raw: string | null | undefined;
  try {
    raw = storage?.getItem(key);
    storage?.removeItem(key);
  } catch {
    return;
  }
  if (!raw) return;
  try {
    const pending: unknown = JSON.parse(raw);
    if (!pending || typeof pending !== 'object') return;
    const item = pending as Record<string, unknown>;
    const path = location.pathname + location.search;
    if (
      item.path !== path ||
      typeof item.hash !== 'string' ||
      !item.hash.startsWith('#') ||
      typeof item.at !== 'number' ||
      Date.now() - item.at < 0 ||
      Date.now() - item.at > 600_000 ||
      destinoInterno(path + item.hash) !== path + item.hash
    )
      return;
    history.replaceState(history.state, '', path + item.hash);
  } catch {
    /* Discard malformed/expired return state. */
  }
}
