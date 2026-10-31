import { ApiError } from '../../api/error';
import type { components } from '../../api/schema';
import { fusoReconhecido } from '../../lib/format';

export type PreferenciaFuso = components['schemas']['FusoEntrada'];

export const FUSOS_RAPIDOS = [
  'America/Sao_Paulo',
  'America/Manaus',
  'America/Rio_Branco',
  'America/Noronha',
  'UTC',
];

export function fusoValido(value: unknown): value is string {
  if (typeof value !== 'string' || !value || value.length > 64) return false;
  return fusoReconhecido(value);
}

export function preferenciaFuso(
  value: unknown,
  mutation = false,
): PreferenciaFuso {
  if (
    !value ||
    typeof value !== 'object' ||
    !('fuso_horario' in value) ||
    !fusoValido(value.fuso_horario)
  )
    throw new ApiError('invalid_response', { mutation });
  return { fuso_horario: value.fuso_horario };
}

export function fusosDisponiveis(current: string): string[] {
  const fallback = FUSOS_RAPIDOS;
  const intl = Intl as typeof Intl & {
    supportedValuesOf?: (key: 'timeZone') => string[];
  };
  let values = fallback;
  try {
    values = intl.supportedValuesOf?.('timeZone') ?? fallback;
  } catch {
    /* Browsers without an IANA catalogue retain the public fallback. */
  }
  return [
    ...new Set([...(fusoValido(current) ? [current] : []), 'UTC', ...values]),
  ].sort();
}

export function nomeFuso(value: string): string {
  return value === 'UTC'
    ? 'UTC'
    : value.replaceAll('_', ' ').replaceAll('/', ' / ');
}
