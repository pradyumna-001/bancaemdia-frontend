import type { components } from '../../api/schema';
import { ApiError } from '../../api/error';
import { respostaPublicada } from '../../api/readContract';
import { SITE_READ_CONTRACT } from '../../api/site-read.generated';
import { RESULTADOS_POLICIES } from '../../api/resultados.generated';
import { centavosDaEntrada, dataHora, moeda, odd } from '../../lib/format';

export type ApostaResultado = components['schemas']['ResultBet'];
export type Fila = components['schemas']['QueuePage'];
export type Recibo = components['schemas']['ResultReceipt'];
export type Pedido = components['schemas']['ResultInput'];
export type Reversao = components['schemas']['UndoInput'];
export const REGISTRAR = 'POST /api/v1/resultados/operacoes/{intention_id}';
export const DESFAZER =
  'POST /api/v1/resultados/operacoes/{intention_id}/desfazer';
const UUID = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
export const identidadeValida = (value: string | null): value is string =>
  !!value && UUID.test(value);

export function validarAposta(
  value: ApostaResultado | undefined,
  chave?: string,
): ApostaResultado {
  respostaPublicada(
    value,
    SITE_READ_CONTRACT['/api/v1/resultados/apostas/{chave}'].response,
  );
  return conferirAposta(value, chave);
}
/** Rules beyond the published schema; the caller has already checked it. */
function conferirAposta(
  value: ApostaResultado | undefined,
  chave?: string,
): ApostaResultado {
  if (
    !value ||
    !identidadeValida(value.revisao) ||
    !value.chave ||
    (chave !== undefined && value.chave !== chave)
  )
    throw new ApiError('invalid_response');
  dataHora(value.antiguidade, 'America/Sao_Paulo');
  for (const field of [
    'stake_centavos',
    'valor_aposta_centavos',
    'retorno_centavos',
    'comissao_centavos',
    'lucro_centavos',
  ] as const)
    moeda(value[field]);
  odd(value.odd);
  return value;
}
export function validarFila(value: Fila | undefined): Fila {
  const policy = RESULTADOS_POLICIES['GET /api/v1/resultados/fila'];
  if (
    policy.pagination !== 'keyset_cursor' ||
    policy.read_source !== 'primary_snapshot'
  )
    throw new ApiError('invalid_response');
  respostaPublicada(
    value,
    SITE_READ_CONTRACT['/api/v1/resultados/fila'].response,
  );
  if (!value) throw new ApiError('invalid_response');
  dataHora(value.observado_em, 'America/Sao_Paulo');
  dataHora(value.fronteira_iniciada_em, 'America/Sao_Paulo');
  // The page schema already checks each item with the same schema as a single
  // bet (a test keeps them equal); items only need the remaining rules.
  for (const item of value.data) {
    conferirAposta(item);
    if (
      !item.elegivel ||
      item.estado !== 'PENDENTE' ||
      item.conta_atribuicao !== 'ASSIGNED'
    )
      throw new ApiError('invalid_response');
  }
  return value;
}
export function validarRecibo(
  value: Recibo | undefined,
  id: string,
  expected?: { chave: string; tipo: Recibo['tipo']; alvo?: string },
): Recibo {
  respostaPublicada(
    value,
    SITE_READ_CONTRACT['/api/v1/resultados/operacoes/{intention_id}'].response,
  );
  if (
    !value ||
    value.id !== id ||
    (expected &&
      (value.aposta.chave !== expected.chave ||
        value.tipo !== expected.tipo ||
        (expected.alvo !== undefined &&
          value.operacao_desfeita !== expected.alvo)))
  )
    throw new ApiError('invalid_response', { mutation: true });
  validarAposta(value.aposta);
  dataHora(value.confirmado_em, 'America/Sao_Paulo');
  dataHora(value.consultar_ate, 'America/Sao_Paulo');
  if (value.desfazer_ate) dataHora(value.desfazer_ate, 'America/Sao_Paulo');
  return value;
}
export function pedidoResultado(
  item: ApostaResultado,
  estado: Pedido['estado'],
  cashout = '',
  retorno = '',
  comissao = '',
): Pedido {
  if (!item.elegivel || !identidadeValida(item.revisao))
    throw new Error('Consulte a aposta atual antes de registrar.');
  const body: Pedido = {
    chave: item.chave,
    revisao_esperada: item.revisao,
    estado,
  };
  if (estado === 'CASHOUT')
    body.cashout_valor_centavos = centavosDaEntrada(cashout);
  else {
    if (retorno.trim()) body.retorno_centavos = centavosDaEntrada(retorno);
    if (comissao.trim()) body.comissao_centavos = centavosDaEntrada(comissao);
  }
  return body;
}
export function unirFila(
  pages: readonly Fila[],
  concluidas: ReadonlySet<string>,
) {
  const items = new Map<string, ApostaResultado>();
  for (const page of pages)
    for (const item of page.data)
      if (!concluidas.has(item.chave)) items.set(item.chave, item);
  return [...items.values()];
}
export function contextoConta(item: ApostaResultado) {
  const value = item.conta_contexto?.apelido;
  return typeof value === 'string' && value ? value : 'Conta atribuída';
}
