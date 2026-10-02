import { ApiError, httpError } from '../api/error';

// Memory-only control projection, not a handwritten SessionStatus response shape.
// The domain OpenAPI stays pinned to the integrated version; no PR schema is merged.
export type SessionContext = Readonly<{
  person: Readonly<{ id: number; name: string; email: string }>;
  version: string;
  proof: string;
  needsRenewal: boolean;
}>;

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new ApiError('invalid_response');
  return value as Record<string, unknown>;
}

export function sessionContext(value: unknown): SessionContext {
  const body = object(value);
  const id = body.usuario_id;
  const name = body.nome;
  const email = body.email;
  const version = body.session_version;
  const proof = body.csrf_token;
  const needsRenewal = body.refresh_required;
  const date = (v: unknown) =>
    typeof v === 'string' &&
    /^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(v) &&
    Number.isFinite(Date.parse(v));
  if (
    typeof id !== 'number' ||
    !Number.isSafeInteger(id) ||
    id < 1 ||
    typeof name !== 'string' ||
    typeof email !== 'string' ||
    typeof version !== 'string' ||
    !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}:\d+$/.test(version) ||
    typeof proof !== 'string' ||
    !/^[A-Za-z0-9_-]{20,256}$/.test(proof) ||
    typeof needsRenewal !== 'boolean' ||
    !date(body.access_expires_at) ||
    !date(body.session_expires_at)
  )
    throw new ApiError('invalid_response');
  return Object.freeze({
    person: Object.freeze({ id, name, email }),
    version,
    proof,
    needsRenewal,
  });
}

export function createIdentityTransport(
  baseUrl: string,
  fetcher = globalThis.fetch,
) {
  const call = async (
    path: '/auth/session' | '/auth/refresh' | '/auth/logout',
    signal: AbortSignal,
    proof?: string,
    all = false,
  ): Promise<unknown> => {
    const mutation = path !== '/auth/session';
    const controller = new AbortController();
    let rejectAbort: (error: ApiError) => void = () => {};
    const aborted = new Promise<never>((_resolve, reject) => {
      rejectAbort = reject;
    });
    const stop = (kind: 'cancelled' | 'timeout') => {
      rejectAbort(new ApiError(kind, { mutation }));
      controller.abort();
    };
    if (signal.aborted) throw new ApiError('cancelled');
    const cancel = () => stop('cancelled');
    signal.addEventListener('abort', cancel, { once: true });
    const timer = setTimeout(() => stop('timeout'), mutation ? 15_000 : 10_000);
    try {
      return await Promise.race([
        aborted,
        (async () => {
          const response = await fetcher(
            new URL(path + (all ? '?all_sessions=true' : ''), baseUrl),
            {
              method: mutation ? 'POST' : 'GET',
              signal: controller.signal,
              credentials: 'include',
              cache: 'no-store',
              redirect: 'error',
              headers: proof ? { 'X-CSRF-Token': proof } : {},
            },
          );
          const content = await response.text();
          let body: unknown;
          try {
            body = JSON.parse(content);
          } catch {
            /* Never retain the response text. */
          }
          if (!response.ok) throw httpError(response, body, mutation);
          if (
            !response.headers
              .get('Content-Type')
              ?.includes('application/json') ||
            body === undefined
          )
            throw new ApiError('invalid_response', { mutation });
          if (signal.aborted) throw new ApiError('cancelled', { mutation });
          return body;
        })(),
      ]);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('network', { mutation });
    } finally {
      clearTimeout(timer);
      signal.removeEventListener('abort', cancel);
    }
  };
  return {
    read: async (signal: AbortSignal) =>
      sessionContext(await call('/auth/session', signal)),
    renew: async (signal: AbortSignal, proof: string) =>
      sessionContext(await call('/auth/refresh', signal, proof)),
    logout: async (signal: AbortSignal, proof: string, all = false) => {
      const body = object(await call('/auth/logout', signal, proof, all));
      if (body.logged_out !== true)
        throw new ApiError('invalid_response', { mutation: true });
    },
  };
}
