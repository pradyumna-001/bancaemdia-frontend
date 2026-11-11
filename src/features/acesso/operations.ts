import type { ApiOperation } from '../../api/client';
import { ACCESS_EXCEPTIONS } from '../../api/operations.generated';

export type AccessOperation = ApiOperation;

// Generated from x-bancaemdia-policy of the pinned contract (rule 32): only the
// operations whose commercial permission differs from the HTTP verb. The
// generator refuses any operation without a valid policy; the server remains
// authoritative.
const readOnlyWrites = new Set<string>(ACCESS_EXCEPTIONS.readOnlyWrites);
const fullWriteReads = new Set<string>(ACCESS_EXCEPTIONS.fullWriteReads);

export function operationNeedsWrite(operation: AccessOperation): boolean {
  return operation.startsWith('GET ')
    ? fullWriteReads.has(operation)
    : !readOnlyWrites.has(operation);
}

// Writes the contract allows in READ_ONLY (session controls, calculators,
// billing, Telegram link, account closure and Coleta devices).
export const READ_ONLY_OPERATIONS = ACCESS_EXCEPTIONS.readOnlyWrites;
