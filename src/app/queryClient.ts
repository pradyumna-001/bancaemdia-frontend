import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/error';

export const MAX_AUTOMATIC_WAIT_MS = 60_000;

function statusDoErro(error: unknown): unknown {
  return typeof error === 'object' && error !== null && 'status' in error
    ? error.status
    : undefined;
}

// Apenas leituras GET idempotentes pertencem a queries. Escritas usam mutations.
export function retryConsulta(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError) {
    if (error.outcomeUnknown || error.kind === 'cancelled') return false;
    if ((error.retryAfterMs ?? 0) > MAX_AUTOMATIC_WAIT_MS) return false;
    if (error.kind === 'network' || error.kind === 'timeout')
      return failureCount < 1;
  }
  const status = statusDoErro(error);
  return (
    (status === 500 && failureCount < 1) ||
    (status === 503 && failureCount < 3) ||
    (status === 429 && failureCount < 2)
  );
}

export function atrasoConsulta(attempt: number, error?: unknown): number {
  const backoff = Math.min(1000 * 2 ** attempt + Math.random() * 250, 30_000);
  return error instanceof ApiError
    ? Math.max(backoff, error.retryAfterMs ?? 0)
    : backoff;
}

export function createAppQueryClient(): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: retryConsulta,
        retryDelay: atrasoConsulta,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
      mutations: { retry: false },
    },
  });
  client.setQueryDefaults(['painel'], { staleTime: 60_000 });
  client.setQueryDefaults(['metricas'], { staleTime: 60_000 });
  client.setQueryDefaults(['revisao'], { staleTime: 0 });
  return client;
}
