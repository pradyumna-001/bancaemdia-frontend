import { isCancelledError, type QueryClient } from '@tanstack/react-query';
import type { SessionService } from '../../auth/session';
import type { createApiClient } from '../../api/client';
import { ApiError } from '../../api/error';
import { operationNeedsWrite, type AccessOperation } from './operations';

export function createAccessController(
  session: SessionService,
  queries: QueryClient,
) {
  let revision = 0;
  let retryUntil = 0;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());
  const unregister = session.registerCleanup(() => {
    revision = 0;
    retryUntil = 0;
    notify();
  });
  const key = () => {
    const state = session.getSnapshot();
    return ['acesso', state.person?.id, state.privateEpoch, revision] as const;
  };
  const consult = async (
    client: ReturnType<typeof createApiClient>,
    signal: AbortSignal,
  ) => {
    const remaining = retryUntil - Date.now();
    if (remaining > 0)
      throw new ApiError('http', {
        status: 429,
        headers: new Headers({
          'Retry-After': String(Math.ceil(remaining / 1000)),
        }),
      });
    try {
      return await session.read(async () => {
        const { data } = await client.GET('/api/v1/billing/status', { signal });
        if (!data || !['FULL_WRITE', 'READ_ONLY'].includes(data.access))
          throw new ApiError('invalid_response');
        return data;
      });
    } catch (error) {
      if (error instanceof ApiError && error.retryAfterMs)
        retryUntil = Date.now() + error.retryAfterMs;
      throw error;
    }
  };
  return {
    key,
    consult,
    getSnapshot: () => revision,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    denied: () => {
      if (session.getSnapshot().phase !== 'authenticated') return;
      revision++;
      void queries.cancelQueries({ queryKey: ['acesso'] });
      notify();
    },
    async run<T>(
      client: ReturnType<typeof createApiClient>,
      operation: AccessOperation,
      work: () => Promise<T>,
    ): Promise<T> {
      const context = session.capture();
      const currentRevision = revision;
      if (operationNeedsWrite(operation)) {
        const data = await queries
          .fetchQuery({
            queryKey: key(),
            staleTime: 0,
            queryFn: ({ signal }) => consult(client, signal),
          })
          .catch((error: unknown) => {
            if (isCancelledError(error))
              throw currentRevision !== revision && context.isCurrent()
                ? new ApiError('http', {
                    status: 402,
                    code: 'account_read_only',
                  })
                : new ApiError('cancelled');
            throw error;
          });
        if (currentRevision !== revision || data.access !== 'FULL_WRITE')
          throw new ApiError('http', {
            status: 402,
            code: 'account_read_only',
          });
      }
      if (!context.isCurrent()) throw new ApiError('cancelled');
      // No replay after payment, refresh, timeout or a 402: one explicit intent only.
      return work();
    },
    dispose: () => {
      unregister();
      listeners.clear();
      retryUntil = 0;
      revision = 0;
    },
  };
}
export type AccessController = ReturnType<typeof createAccessController>;
