import type { createApiClient } from '../../api/client';
import { ApiError } from '../../api/error';
import { SITE_READ_CONTRACT } from '../../api/site-read.generated';
import { respostaPublicada } from '../../api/readContract';

// An overview of presence, never an onboarding flag or a financial summary.
// All three populations are global to the owner and include archived/deleted items.
export async function consultarInicio(
  client: ReturnType<typeof createApiClient>,
  signal: AbortSignal,
) {
  const pending = [
    client.GET('/api/v1/apostas', {
      signal,
      params: { query: { page: 1, page_size: 1, incluir_apagadas: true } },
    }),
    client.GET('/api/v1/titulares', {
      signal,
      params: { query: { page: 1, page_size: 1, include_archived: true } },
    }),
    client.GET('/api/v1/filtros/{dimensao}', {
      signal,
      params: {
        path: { dimensao: 'contas' },
        query: { page: 1, page_size: 1, incluir_inativas: true },
      },
    }),
  ] as const;
  // Consultations are independent. A quick 500 must not hide another GET's
  // longer Retry-After and cause the aggregate query to repeat too early.
  const results = await Promise.allSettled(pending);
  const errors = results
    .filter((result) => result.status === 'rejected')
    .map((result) => result.reason as unknown);
  const deadline = (error: unknown) =>
    error instanceof ApiError ? (error.retryAfterDeadline ?? 0) : 0;
  if (errors.length) throw errors.sort((a, b) => deadline(b) - deadline(a))[0];
  const [bets, holders, accounts] = await Promise.all(pending);
  respostaPublicada(bets.data, SITE_READ_CONTRACT['/api/v1/apostas'].response);
  respostaPublicada(
    holders.data,
    SITE_READ_CONTRACT['/api/v1/titulares'].response,
  );
  respostaPublicada(
    accounts.data,
    SITE_READ_CONTRACT['/api/v1/filtros/{dimensao}'].response,
  );
  const pages = [
    bets.data!.pagination,
    holders.data!,
    accounts.data!.pagination,
  ];
  if (
    accounts.data!.dimensao !== 'contas' ||
    pages.some(
      (page) =>
        page.page !== 1 ||
        page.page_size !== 1 ||
        !Number.isSafeInteger(page.total) ||
        page.total < 0,
    )
  )
    throw new ApiError('invalid_response');
  return {
    apostas: bets.data!.pagination.total > 0,
    titulares: holders.data!.total > 0,
    contas: accounts.data!.pagination.total > 0,
  };
}
