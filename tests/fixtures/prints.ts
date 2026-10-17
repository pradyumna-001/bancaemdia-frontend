import type { PrintItem, PrintIntent } from '../../src/features/prints/model';

export const printIntentId = '6f18733c-b913-4cb0-9a24-f4b82429cdb9';
export const printItemId = 'cc8aebaf-bdbe-4509-9f1c-68ea626776ab';
export function printItem(values: Partial<PrintItem> = {}): PrintItem {
  return {
    intent_id: printIntentId,
    item_id: printItemId,
    status: 'accepted',
    outcome: null,
    duplicate: false,
    attempt: 1,
    last_retry_id: null,
    retryable: false,
    error_code: null,
    progress_percent: null,
    results: null,
    media_expires_at: '2030-01-08T00:00:00Z',
    reconciliation_expires_at: '2030-04-01T00:00:00Z',
    ...values,
  };
}
export function printIntent(
  items: PrintItem[] = [],
  values: Partial<PrintIntent> = {},
): PrintIntent {
  return {
    intent_id: printIntentId,
    state: 'processing',
    items,
    received_items: items.length,
    terminal_items: items.filter((item) =>
      ['completed', 'failed'].includes(item.status),
    ).length,
    reconciliation_expires_at: '2030-04-01T00:00:00Z',
    ...values,
  };
}
