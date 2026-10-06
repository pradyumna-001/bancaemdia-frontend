import { QueryClient } from '@tanstack/react-query';

function statusDoErro(error: unknown): unknown {
  return typeof error === 'object' && error !== null && 'status' in error
    ? error.status
    : undefined;
}

// Apenas leituras GET idempotentes pertencem a queries. Escritas usam mutations.
export function retryConsulta(failureCount: number, error: unknown): boolean {
  const status = statusDoErro(error);
  return (
    (status === 500 && failureCount < 1) || (status === 503 && failureCount < 3)
  );
}

export function atrasoConsulta(attempt: number): number {
  return Math.min(1000 * 2 ** attempt + Math.random() * 250, 30_000);
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
