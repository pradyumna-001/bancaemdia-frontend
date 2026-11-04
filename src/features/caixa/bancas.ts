import type { components } from '../../api/schema';
import { ApiError } from '../../api/error';
import { dataHora } from '../../lib/format';
import { validar } from '../contas/protocol';

export const BANCAS = '/api/v1/bancas';
export const BANCA = '/api/v1/bancas/{banca_id}';
export const ARQUIVAR = '/api/v1/bancas/{banca_id}/arquivar';
export const INTENCAO_BANCA = '/api/v1/bancas/intencao';
export const OPERACOES = {
  CRIAR: `POST ${BANCAS}`,
  ALTERAR: `PATCH ${BANCA}`,
  ARQUIVAR: `POST ${ARQUIVAR}`,
} as const;
export type Banca = components['schemas']['BancaSaida'];
export type BancaNova = components['schemas']['BancaNova'];
export type BancaAlteracao = components['schemas']['BancaAlteracao'];
type Intencao =
  components['schemas']['bancaemdia__api__v1__bancas__IntencaoSaida'];
export type OperacaoBanca = Intencao['operacao'];
// URL identity of the pending intent: not a secret, never authorization.
export const PARAM_BANCA = 'banca_intencao';
// Published validation limits (docs/contracts/bancas-cadastro.md of the API).
export const NOME_MAXIMO = 80;
export const CAPITAL_MAXIMO_CENTAVOS = 100_000_000_000;

const FUSO = 'America/Sao_Paulo';
const id = (value: number) => Number.isSafeInteger(value) && value > 0;

export function instante(value: string): string {
  return dataHora(value, FUSO);
}

function conferir(banca: Banca): void {
  if (
    !id(banca.id) ||
    !banca.nome.trim() ||
    (banca.saldo_inicial_centavos !== null &&
      (!Number.isSafeInteger(banca.saldo_inicial_centavos) ||
        banca.saldo_inicial_centavos < 0)) ||
    // Archived and its instant travel together.
    (banca.estado === 'arquivada') !== (banca.arquivada_em !== null) ||
    banca.contas.some((conta) => !id(conta.id) || !id(conta.casa_id))
  )
    throw new Error('banca');
  if (banca.arquivada_em !== null) instante(banca.arquivada_em);
}

export function conferirBancas(
  value: components['schemas']['BancasSaida'] | undefined,
): Banca[] {
  const lista = validar(value, BANCAS).bancas;
  try {
    lista.forEach(conferir);
  } catch {
    throw new ApiError('invalid_response');
  }
  if (new Set(lista.map((banca) => banca.id)).size !== lista.length)
    throw new ApiError('invalid_response');
  return lista;
}

export type Pedido =
  | { operacao: 'CRIAR'; body: BancaNova }
  | { operacao: 'ALTERAR'; bancaId: number; body: BancaAlteracao }
  | { operacao: 'ARQUIVAR'; bancaId: number };

// The answer must be the requested change, exactly as published.
export function conferirBanca(
  value: Banca | undefined,
  pedido: Pedido,
  route: string | undefined,
  mutation = false,
): Banca {
  const banca = route === undefined ? value! : validar(value, route);
  try {
    conferir(banca);
    if (pedido.operacao !== 'CRIAR' && banca.id !== pedido.bancaId)
      throw new Error('alvo');
    if (pedido.operacao === 'ARQUIVAR' && banca.estado !== 'arquivada')
      throw new Error('estado');
    if (pedido.operacao !== 'ARQUIVAR') {
      const body = pedido.body;
      if (pedido.operacao === 'CRIAR' && banca.estado !== 'ativa')
        throw new Error('estado');
      if (
        body.nome !== undefined &&
        body.nome !== null &&
        banca.nome !== body.nome.trim()
      )
        throw new Error('nome');
      if (
        'saldo_inicial_centavos' in body &&
        banca.saldo_inicial_centavos !== (body.saldo_inicial_centavos ?? null)
      )
        throw new Error('capital');
    }
  } catch {
    throw new ApiError('invalid_response', { mutation });
  }
  return banca;
}

export function conferirIntencaoBanca(
  value: Intencao | undefined,
  pedido: Pedido | undefined,
  operacao?: OperacaoBanca,
): { operacao: OperacaoBanca; banca: Banca } {
  const intencao = validar(value, INTENCAO_BANCA);
  const esperada = pedido?.operacao ?? operacao;
  if (
    (esperada !== undefined && intencao.operacao !== esperada) ||
    intencao.status_code !== (intencao.operacao === 'CRIAR' ? 201 : 200)
  )
    throw new ApiError('invalid_response');
  // After reload only the key is known: the operation comes from the API,
  // and the answer is still checked for consistency.
  const banca = pedido
    ? conferirBanca(intencao.resposta, pedido, undefined)
    : conferirBanca(
        intencao.resposta,
        intencao.operacao === 'ARQUIVAR'
          ? { operacao: 'ARQUIVAR', bancaId: intencao.resposta.id }
          : intencao.operacao === 'ALTERAR'
            ? { operacao: 'ALTERAR', bancaId: intencao.resposta.id, body: {} }
            : { operacao: 'CRIAR', body: { nome: intencao.resposta.nome } },
        undefined,
      );
  return { operacao: intencao.operacao, banca };
}

export const UUID =
  /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
export function chaveDaUrl(search: URLSearchParams): string | undefined {
  const values = search.getAll(PARAM_BANCA);
  return values.length === 1 && UUID.test(values[0]!) ? values[0] : undefined;
}
