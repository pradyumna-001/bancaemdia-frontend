import type { components } from '../../api/schema';
import { ApiError } from '../../api/error';
import { dataHora } from '../../lib/format';
import { validar } from '../contas/protocol';

export const PREVIA = '/api/v1/apostas/lotes/previa-apagar';
export const LOTES = '/api/v1/apostas/lotes';
export const LOTE = '/api/v1/apostas/lotes/{lote_id}';
export const RESTAURAR = '/api/v1/apostas/lotes/{lote_id}/restaurar';
export const INTENCAO_LOTE = '/api/v1/apostas/lotes/intencao';
export const POST_APAGAR = `POST ${LOTES}` as const;
export const POST_RESTAURAR = `POST ${RESTAURAR}` as const;
export type Previa = components['schemas']['PreviaSaida'];
export type Lote = components['schemas']['LoteSaida'];
export type PedidoLote = components['schemas']['LoteNovo'];
type Intencao =
  components['schemas']['bancaemdia__api__v1__apostas_lotes__IntencaoSaida'];
export type Operacao = Intencao['operacao'];

// URL identities: not secrets, never authorization (rule 45).
export const PARAM_APAGAR = 'lote_apagar';
export const PARAM_RESTAURAR = 'lote_restaurar';
export const PARAM_LOTE = 'lote';

const FUSO = 'America/Sao_Paulo';
const UUID = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
export const uuidValido = (value: string | undefined): value is string =>
  !!value && UUID.test(value);

function contagem(value: number | null, positive = false): void {
  if (value === null) return;
  if (!Number.isSafeInteger(value) || value < (positive ? 1 : 0))
    throw new ApiError('invalid_response');
}

export function instante(value: string): string {
  return dataHora(value, FUSO);
}

export function conferirPrevia(value: Previa | undefined): Previa {
  const previa = validar(value, PREVIA);
  try {
    contagem(previa.total);
    instante(previa.expira_em);
  } catch {
    throw new ApiError('invalid_response');
  }
  if (
    previa.escopo !== 'apostas' ||
    !previa.frase.trim() ||
    !previa.confirmacao
  )
    throw new ApiError('invalid_response');
  return previa;
}

// route undefined: nested in an answer already checked against its schema.
export function conferirLote(
  value: Lote | undefined,
  route: string | undefined,
  mutation = false,
): Lote {
  const lote = route === undefined ? value! : validar(value, route);
  const restored = lote.restaurado_em !== null;
  try {
    if (lote.escopo !== 'apostas' || !uuidValido(lote.lote_id))
      throw new ApiError('invalid_response');
    contagem(lote.apostas_afetadas, true);
    contagem(lote.apostas_restauradas);
    instante(lote.criado_em);
    if (lote.restaurado_em !== null) instante(lote.restaurado_em);
    // Restored and restored count travel together.
    if (restored !== (lote.apostas_restauradas !== null))
      throw new ApiError('invalid_response');
  } catch {
    throw new ApiError('invalid_response', { mutation });
  }
  return lote;
}

// The original answer of the same key: only a recorded success settles it.
export function conferirIntencao(
  value: Intencao | undefined,
  operacao: Operacao,
): Lote {
  const intencao = validar(value, INTENCAO_LOTE);
  const lote = conferirLote(intencao.resposta, undefined);
  if (
    intencao.operacao !== operacao ||
    intencao.status_code !== (operacao === 'APAGAR' ? 201 : 200) ||
    // The original answer of a delete is never restored; of a restore, always.
    (operacao === 'RESTAURAR') !== (lote.restaurado_em !== null)
  )
    throw new ApiError('invalid_response');
  return lote;
}

// Same comparison the server publishes: trimmed ends, any letter case.
export function fraseConfere(digitada: string, frase: string): boolean {
  return digitada.trim().toLowerCase() === frase.trim().toLowerCase();
}

export function paramValido(search: URLSearchParams, name: string) {
  const values = search.getAll(name);
  return values.length === 1 && uuidValido(values[0]!) ? values[0]! : undefined;
}
