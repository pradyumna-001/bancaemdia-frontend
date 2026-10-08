import type { components } from '../../api/schema';
import { ApiError } from '../../api/error';
import { dataHora } from '../../lib/format';

export type LinkStatus = components['schemas']['LinkStatusResponse'];
export type LinkCode = components['schemas']['LinkCodeResponse'];
export const TELEGRAM_POLL_LIMIT_MS = 120_000;

function invalid(): never {
  throw new ApiError('invalid_response');
}
export function telegramDate(value: string | null): string {
  try {
    return dataHora(value, 'America/Sao_Paulo');
  } catch {
    return invalid();
  }
}
export function linkStatus(value: LinkStatus | undefined): LinkStatus {
  if (!value || typeof value.linked !== 'boolean') return invalid();
  for (const field of [
    'linked_at',
    'last_inbound_at',
    'last_outbound_at',
  ] as const) {
    if (value[field] !== null && typeof value[field] !== 'string')
      return invalid();
    telegramDate(value[field]);
  }
  if (
    !value.linked &&
    [value.linked_at, value.last_inbound_at, value.last_outbound_at].some(
      (v) => v !== null,
    )
  )
    return invalid();
  if (value.linked && value.linked_at === null) return invalid();
  return value;
}
export function linkCode(value: LinkCode | undefined): LinkCode {
  if (
    !value ||
    typeof value.code !== 'string' ||
    !/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/.test(value.code) ||
    typeof value.expires_at !== 'string'
  )
    throw new ApiError('invalid_response', { mutation: true });
  try {
    telegramDate(value.expires_at);
  } catch {
    throw new ApiError('invalid_response', { mutation: true });
  }
  return value;
}
export function pollDelay(started: number, now: number): number | false {
  const elapsed = now - started;
  return elapsed >= TELEGRAM_POLL_LIMIT_MS
    ? false
    : elapsed < 30_000
      ? 5000
      : 10_000;
}
