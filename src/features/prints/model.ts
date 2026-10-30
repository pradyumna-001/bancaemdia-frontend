import type { components } from '../../api/schema';
import { ApiError } from '../../api/error';
import { jobIdValido } from '../enviar/job';

export type PrintItem = components['schemas']['PrintItemResponse'];
export type PrintIntent = components['schemas']['PrintIntentResponse'];
export const PRINT_LIMITS = {
  items: 20,
  file: 20 * 1024 * 1024,
  total: 100 * 1024 * 1024,
} as const;
export const PRINT_PATH =
  '/api/v1/prints/intencoes/{intent_id}/itens/{item_id}' as const;
export const RETRY_PATH =
  '/api/v1/prints/intencoes/{intent_id}/itens/{item_id}/retry' as const;
export const INTENT_PATH = '/api/v1/prints/intencoes/{intent_id}' as const;
export const PRINT_STATUS = {
  accepted: 'Recebido',
  processing: 'Lendo print',
  completed: 'Concluído',
  failed: 'Não foi possível concluir',
};
export const PRINT_OUTCOME = {
  materialized: 'Apostas registradas',
  review: 'Precisa de Revisão',
  no_bet: 'Nenhuma aposta encontrada',
  duplicate: 'Print já recebido',
  failed: 'Processamento com falha',
};

export function printAddress(params: URLSearchParams) {
  const intents = params.getAll('prints');
  const intent = intents.length === 1 ? jobIdValido(intents[0]) : undefined;
  const raw = params.getAll('item');
  const items = raw.map((id) => jobIdValido(id));
  const valid =
    !!intent &&
    raw.length <= PRINT_LIMITS.items &&
    items.every(Boolean) &&
    new Set(items).size === items.length;
  return {
    intent: valid ? intent : undefined,
    items: valid ? (items as string[]) : [],
    invalid: (intents.length > 0 || raw.length > 0) && !valid,
  };
}

export function validateFiles(
  files: readonly File[],
  existing: readonly File[],
) {
  if (files.length + existing.length > PRINT_LIMITS.items)
    return 'Escolha até 20 prints por envio. Nenhum arquivo desta seleção foi adicionado.';
  if (
    files.some(
      (file) =>
        !['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(
          file.type,
        ) || !file.size,
    )
  )
    return 'Escolha imagens JPEG, PNG, GIF ou WebP que não estejam vazias.';
  if (files.some((file) => file.size > PRINT_LIMITS.file))
    return 'Cada print pode ter até 20 MiB.';
  if (
    [...files, ...existing].reduce((sum, file) => sum + file.size, 0) >
    PRINT_LIMITS.total
  )
    return 'O envio pode ter até 100 MiB de imagens.';
  return '';
}

export function validateItem(
  item: PrintItem | undefined,
  intent: string,
  id: string,
): PrintItem {
  if (
    !item ||
    item.intent_id !== intent ||
    item.item_id !== id ||
    !Object.hasOwn(PRINT_STATUS, item.status) ||
    (item.outcome !== null && !Object.hasOwn(PRINT_OUTCOME, item.outcome)) ||
    !Number.isSafeInteger(item.attempt) ||
    item.attempt < 1 ||
    item.attempt > 3 ||
    typeof item.retryable !== 'boolean' ||
    typeof item.duplicate !== 'boolean' ||
    (item.progress_percent !== null &&
      (!Number.isInteger(item.progress_percent) ||
        item.progress_percent < 0 ||
        item.progress_percent > 100)) ||
    (item.results !== null &&
      (!Array.isArray(item.results) ||
        item.results.some(
          (result) =>
            !['materialized', 'review'].includes(result.type) ||
            (result.bet_key !== null &&
              (typeof result.bet_key !== 'string' || !result.bet_key)) ||
            !Array.isArray(result.review_ids) ||
            result.review_ids.some(
              (review) => !Number.isSafeInteger(review) || review <= 0,
            ),
        )))
  )
    throw new ApiError('invalid_response');
  return item;
}

export function validateIntent(
  data: PrintIntent | undefined,
  intent: string,
): PrintIntent {
  if (
    !data ||
    data.intent_id !== intent ||
    !Array.isArray(data.items) ||
    data.items.length > PRINT_LIMITS.items ||
    !['processing', 'complete', 'partial', 'failed'].includes(data.state) ||
    !Number.isSafeInteger(data.received_items) ||
    data.received_items !== data.items.length ||
    !Number.isSafeInteger(data.terminal_items) ||
    data.terminal_items < 0 ||
    data.terminal_items > data.received_items ||
    new Set(data.items.map((item) => item.item_id)).size !== data.items.length
  )
    throw new ApiError('invalid_response');
  data.items.forEach((item) => validateItem(item, intent, item.item_id));
  return data;
}
