import type { components } from '../../api/schema';
import { SITE_READ_CONTRACT } from '../../api/site-read.generated';
import { respostaPublicada, type Regra } from '../../api/readContract';
import { ApiError } from '../../api/error';
import { jobIdValido } from '../enviar/job';

export type Source = components['schemas']['SourceView'];
export type Catalog = components['schemas']['FieldCatalog'];
export type Preview = components['schemas']['PreviewView'];
export type Rows = components['schemas']['PreviewPage'];
export type Result = components['schemas']['ConfirmationView'];
export const FIELDS = '/api/v1/planilhas/campos' as const;
export const SOURCES = '/api/v1/planilhas/fontes' as const;
export const SOURCE = '/api/v1/planilhas/fontes/{source_id}' as const;
export const UPLOAD =
  '/api/v1/planilhas/fontes/{source_id}/previas/{preview_id}' as const;
export const PREVIEW = '/api/v1/planilhas/previas/{preview_id}' as const;
export const ROWS = '/api/v1/planilhas/previas/{preview_id}/linhas' as const;
export const REMAP =
  '/api/v1/planilhas/previas/{preview_id}/remapear/{new_preview_id}' as const;
export const CONFIRM =
  '/api/v1/planilhas/confirmacoes/{confirmation_id}' as const;
export const STATES = {
  ready: 'Prévia pronta para conferir',
  invalid: 'Confira as linhas com erro',
  obsolete: 'Esta prévia precisa ser atualizada',
};
export const CONSEQUENCES = {
  create: 'Será criada',
  update: 'Será atualizada',
  ignore: 'Será ignorada',
  refuse: 'Precisa de correção',
};
export const ERROR_CODES: Record<string, string> = {
  missing_mapping: 'Escolha uma coluna para este campo.',
  invalid_mapping: 'Escolha uma coluna disponível.',
  duplicate_mapping: 'Cada coluna pode preencher apenas um campo.',
  duplicate_row_id: 'O identificador da linha está repetido.',
  invalid_value: 'Confira o valor na planilha.',
  formula_or_cell_error: 'Use um valor simples, sem fórmula ou erro de célula.',
  invalid_account_reference: 'Confira a conta e o dia do jogo.',
  financial_value_out_of_range: 'O valor está fora do intervalo aceito.',
};
export function validated<T>(data: T | undefined, operation: string): T {
  const descriptor = SITE_READ_CONTRACT as Record<string, { response?: Regra }>;
  respostaPublicada(data, descriptor[operation.replace(/^GET /, '')]?.response);
  return data!;
}
export function sameResource<T extends { id: string }>(data: T, id: string): T {
  if (data.id !== id) throw new ApiError('invalid_response');
  return data;
}
export function sameSource<T extends { source_id: string }>(
  data: T,
  id?: string,
): T {
  if (id && data.source_id !== id) throw new ApiError('invalid_response');
  return data;
}
export function pageNumber(value: string | null) {
  const n = value && /^\d+$/.test(value) ? Number(value) : 1;
  return Number.isSafeInteger(n) && Number(n) >= 1 ? Number(n) : 1;
}
export function address(params: URLSearchParams) {
  const ids = ['fonte', 'previa', 'confirmacao'].map((key) => {
    const all = params.getAll(key);
    return all.length === 1 ? jobIdValido(all[0]) : undefined;
  });
  return {
    source: ids[0],
    preview: ids[1],
    confirmation: ids[2],
    invalid: ['fonte', 'previa', 'confirmacao'].some(
      (key, i) => params.has(key) && !ids[i],
    ),
    sourcePage: pageNumber(params.get('fontes_pagina')),
    rowPage: pageNumber(params.get('linhas_pagina')),
  };
}
export function cell(value: unknown): string {
  return value === null || value === undefined
    ? '—'
    : typeof value === 'boolean'
      ? value
        ? 'Sim'
        : 'Não'
      : typeof value === 'number' || typeof value === 'string'
        ? String(value)
        : 'Valor incompatível';
}
