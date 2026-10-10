import { destinoInterno } from '../../auth/destinoInterno';

const KEY = 'bancaemdia:retorno-assinatura';
const filters = new Set([
  'casa',
  'tipster',
  'mercado',
  'competicao',
  'titular',
  'conta',
  'grupo',
  'banca',
  'estado',
  'origem',
  'revisao',
  'apagadas',
  'periodo',
  'desde',
  'ate',
  'page',
  'page_size',
]);
const protocol = [
  'session_id',
  'checkout_session_id',
  'client_secret',
  'payment_intent',
  'payment_intent_client_secret',
  'redirect_status',
  'success',
  'canceled',
];

function destination(raw: string): string | undefined {
  const safe = destinoInterno(raw);
  const url = new URL(safe, 'https://local.invalid');
  if (url.pathname !== '/assinatura') return undefined;
  for (const key of [...url.searchParams.keys()])
    if (!filters.has(key)) url.searchParams.delete(key);
  return url.pathname + url.search + url.hash;
}

/** Only a short-lived non-secret destination; no URL from Stripe or payment proof. */
export function rememberBillingReturn(raw: string, storage?: Storage): void {
  const safe = destination(raw);
  if (!safe) return;
  try {
    storage?.setItem(
      KEY,
      JSON.stringify({ destination: safe, saved: Date.now() }),
    );
  } catch {
    /* Optional context. */
  }
}

export function clearBillingReturn(storage?: Storage): void {
  try {
    storage?.removeItem(KEY);
  } catch {
    /* Optional context. */
  }
}

export function sanitizeBillingLocation(
  location: Location,
  history: History,
): void {
  if (location.pathname !== '/assinatura') return;
  const url = new URL(location.href);
  let changed = false;
  for (const key of protocol) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  }
  if (changed)
    history.replaceState(
      history.state,
      '',
      url.pathname + url.search + url.hash,
    );
}

export function restoreBillingReturn(
  location: Location,
  history: History,
  storage?: Storage,
): boolean {
  if (location.pathname !== '/assinatura') return false;
  try {
    const raw = storage?.getItem(KEY);
    clearBillingReturn(storage);
    if (!raw || raw.length > 4000) return false;
    const value: unknown = JSON.parse(raw);
    if (
      !value ||
      typeof value !== 'object' ||
      !('destination' in value) ||
      !('saved' in value) ||
      typeof value.destination !== 'string' ||
      typeof value.saved !== 'number' ||
      !Number.isFinite(value.saved) ||
      Date.now() < value.saved ||
      Date.now() - value.saved > 30 * 60_000
    )
      return false;
    const safe = destination(value.destination);
    if (!safe) return false;
    history.replaceState(history.state, '', safe);
    return true;
  } catch {
    return false;
  }
}
