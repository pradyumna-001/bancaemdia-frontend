import type { ApiOperation } from '../../api/client';

// Explicit exceptions verified in backend b916f54: deps.py and calculators.py.
// Unknown operations fail closed; the server remains authoritative.
const exceptions = {
  // Session controls use SessionService/Web Locks, and never depend on billing.
  'POST /auth/logout': true,
  'POST /auth/refresh': true,
  'POST /api/v1/calculadoras/mercado-justo': true,
  'POST /api/v1/calculadoras/distribuir-entre-resultados': true,
  'POST /api/v1/calculadoras/cobertura-ao-vivo': true,
  'POST /api/v1/calculadoras/percentual-banca': true,
  'POST /api/v1/billing/subscribe': true,
  'POST /api/v1/billing/portal': true,
  'POST /api/v1/billing/cancel': true,
  'POST /api/v1/telegram/link-codes': true,
  'DELETE /api/v1/telegram/link': true,
  'DELETE /api/v1/usuario/me': true,
  'POST /api/v1/coleta/pairing-codes': true,
  'POST /api/v1/coleta/installations/{instalacao_id}/rotate': true,
  'DELETE /api/v1/coleta/installations/{instalacao_id}': true,
} as const satisfies Partial<Record<AccessOperation, boolean>>;

export type AccessOperation = ApiOperation;
// Generated schema policies are insufficient to infer commercial permission from verbs.
export function operationNeedsWrite(operation: AccessOperation): boolean {
  if (Object.hasOwn(exceptions, operation)) return false;
  return !operation.startsWith('GET ');
}
// Compile-time check that every exception exists in the pinned contract.
export const READ_ONLY_OPERATIONS: readonly AccessOperation[] = Object.keys(
  exceptions,
) as Array<keyof typeof exceptions>;
