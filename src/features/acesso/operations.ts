import type { ApiOperation } from '../../api/client';
import { OPERATION_POLICIES } from '../../api/policies.generated';

export type AccessOperation = ApiOperation;

const policies: Readonly<
  Record<string, { readonly access_modes: readonly string[] }>
> = OPERATION_POLICIES;

// Commercial permission comes from x-bancaemdia-policy in the pinned contract
// (rule 32), never from the HTTP verb. Unknown operations fail closed; the
// server remains authoritative.
export function operationNeedsWrite(operation: AccessOperation): boolean {
  const policy = policies[operation];
  return !policy || !policy.access_modes.includes('READ_ONLY');
}

// Writes the contract allows in READ_ONLY (session controls, calculators,
// billing, Telegram link, account closure and Coleta devices).
export const READ_ONLY_OPERATIONS: readonly AccessOperation[] = (
  Object.keys(policies) as AccessOperation[]
).filter(
  (operation) =>
    !operation.startsWith('GET ') && !operationNeedsWrite(operation),
);
