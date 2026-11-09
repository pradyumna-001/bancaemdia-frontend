import type { components } from '../../api/schema';
import { ApiError } from '../../api/error';
import { dataHora, valorNativo } from '../../lib/format';
import { corresponde } from '../../api/readContract';
import { SITE_READ_CONTRACT } from '../../api/site-read.generated';
import { validar } from '../contas/protocol';

export const CONTAS_NATIVAS = '/api/v1/financeiro/nativo/contas';
export const APOSTAS_NATIVAS = '/api/v1/financeiro/nativo/apostas';
export const RESUMO_NATIVO = '/api/v1/financeiro/nativo/resumo';
export const POST_CONTA_NATIVA = `POST ${CONTAS_NATIVAS}` as const;
export type ContaNativa = components['schemas']['NativeAccountResponse'];
export type NovaContaNativa = components['schemas']['NativeAccountCreate'];
export type ApostaNativa = components['schemas']['NativeBetResponse'];
export type TotalMoeda = components['schemas']['CurrencyTotals'];
export type Moeda = ContaNativa['currency'];
export const MOEDAS: readonly Moeda[] = ['BRL', 'USDT'];
// Published limit of the list endpoints (docs/contracts/native-financials-115.md).
export const LIMITE_LISTA = 100;
export const APELIDO_MAXIMO = 120;

const FUSO = 'America/Sao_Paulo';

// The shared validator returns objects; these two endpoints answer a list.
function lista<T>(value: T[] | undefined, route: string): T[] {
  const regra = (
    SITE_READ_CONTRACT as Record<
      string,
      { response?: Parameters<typeof corresponde>[1] }
    >
  )[route]?.response;
  if (!regra || !Array.isArray(value) || !corresponde(value, regra))
    throw new ApiError('invalid_response');
  return value;
}
const id = (value: number) => Number.isSafeInteger(value) && value > 0;

export function instante(value: string): string {
  return dataHora(value, FUSO);
}

function conta(value: ContaNativa): void {
  if (
    !id(value.id) ||
    !id(value.casa_id) ||
    !value.label.trim() ||
    !MOEDAS.includes(value.currency)
  )
    throw new Error('conta');
  instante(value.valid_from);
  if (value.valid_to != null) {
    instante(value.valid_to);
    // A closed validity ends after it starts: [valid_from, valid_to).
    if (Date.parse(value.valid_to) <= Date.parse(value.valid_from))
      throw new Error('vigência');
  }
}

export function conferirContas(
  value: ContaNativa[] | undefined,
): ContaNativa[] {
  const contas = lista(value, CONTAS_NATIVAS);
  try {
    contas.forEach(conta);
  } catch {
    throw new ApiError('invalid_response');
  }
  if (new Set(contas.map((c) => c.id)).size !== contas.length)
    throw new ApiError('invalid_response');
  return contas;
}

// Every amount is exact decimal text in its own currency; none is converted.
function valores(
  value: { stake: string; returned: string; profit: string },
  moeda: Moeda,
) {
  valorNativo(value.stake, moeda);
  valorNativo(value.returned, moeda);
  valorNativo(value.profit, moeda);
}

export function conferirApostas(
  value: ApostaNativa[] | undefined,
  moeda?: Moeda,
): ApostaNativa[] {
  const apostas = lista(value, APOSTAS_NATIVAS);
  try {
    for (const aposta of apostas) {
      if (
        !id(aposta.id) ||
        (aposta.account_id !== null && !id(aposta.account_id)) ||
        (moeda !== undefined && aposta.currency !== moeda)
      )
        throw new Error('aposta');
      valores(aposta, aposta.currency);
      instante(aposta.game_at);
      instante(aposta.placed_at);
    }
  } catch {
    throw new ApiError('invalid_response');
  }
  return apostas;
}

export function conferirResumo(
  value: components['schemas']['NativeSummaryResponse'] | undefined,
): TotalMoeda[] {
  const resumo = validar(value, RESUMO_NATIVO);
  const moedas = resumo.totals_by_currency.map((t) => t.currency);
  try {
    // Currencies are never summed together: the combined total stays null.
    if (
      resumo.money_contract !== 2 ||
      resumo.combined_monetary_total != null ||
      new Set(moedas).size !== moedas.length
    )
      throw new Error('resumo');
    for (const total of resumo.totals_by_currency) {
      if (!Number.isSafeInteger(total.bets) || total.bets < 0)
        throw new Error('apostas');
      valores(total, total.currency);
    }
  } catch {
    throw new ApiError('invalid_response');
  }
  return resumo.totals_by_currency;
}

// The created account must be exactly the one requested.
export function conferirCriada(
  value: ContaNativa | undefined,
  pedido: NovaContaNativa,
): ContaNativa {
  const criada = validar(value, POST_CONTA_NATIVA);
  try {
    conta(criada);
    if (
      criada.casa_id !== pedido.casa_id ||
      criada.currency !== pedido.currency ||
      criada.label !== pedido.label ||
      Date.parse(criada.valid_from) !== Date.parse(pedido.valid_from) ||
      (pedido.valid_to == null
        ? criada.valid_to != null
        : Date.parse(criada.valid_to ?? '') !== Date.parse(pedido.valid_to))
    )
      throw new Error('pedido');
  } catch {
    throw new ApiError('invalid_response', { mutation: true });
  }
  return criada;
}
