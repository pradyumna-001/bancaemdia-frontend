import type { components } from '../../../api/schema';
import { ApiError } from '../../../api/error';
import { respostaPublicada } from '../../../api/readContract';
import { SITE_READ_CONTRACT } from '../../../api/site-read.generated';
import { MANUAL_POLICIES } from '../../../api/manual.generated';
import { centavosExatosDaEntrada, dataHora, moeda } from '../../../lib/format';
import { instanteDaEntrada } from '../../caixa/protocol';
export { uuidValido } from '../../revisao/protocol';

export const PATH = '/api/v1/apostas-manuais/operacoes/{intencao_id}';
export const POST = `POST ${PATH}` as const;
export type Pedido = components['schemas']['ManualCreationRequest'];
export type Recibo = components['schemas']['ManualCreationReceipt'];
export type Rascunho = {
  casa: string;
  odd: string;
  unidades: string;
  evento: string;
  descricao: string;
  mercado: string;
  aposta: string;
  jogo: string;
  comissao: string;
  freebet: boolean;
  conta?: string;
};
export const inicial: Rascunho = {
  casa: '',
  odd: '',
  unidades: '',
  evento: '',
  descricao: '',
  mercado: '',
  aposta: '',
  jogo: '',
  comissao: '',
  freebet: false,
};
function numero(
  value: string,
  label: string,
  minimum: number,
  maximum = Number.MAX_SAFE_INTEGER,
) {
  const text = value.trim();
  const n = /^(?:0|[1-9]\d*)(?:[,.]\d+)?$/.test(text)
    ? Number(text.replace(',', '.'))
    : NaN;
  if (!Number.isFinite(n) || n < minimum || n > maximum || n === 0)
    throw new Error(`Confira ${label}.`);
  return n;
}
export function pedido(form: Rascunho, casa: string): Pedido {
  if (!casa) throw new Error('Escolha a casa da aposta.');
  return {
    casa,
    odd: numero(form.odd, 'a odd (de 1,01 até 1.000)', 1.01, 1000),
    stake_unidades: numero(
      form.unidades,
      'o valor em unidades',
      Number.MIN_VALUE,
    ),
    freebet: form.freebet,
    evento: form.evento || null,
    descricao: form.descricao || null,
    mercado_bruto: form.mercado || null,
    data_aposta: form.aposta.trim() ? instanteDaEntrada(form.aposta) : null,
    data_jogo: form.jogo.trim() ? instanteDaEntrada(form.jogo) : null,
    comissao_centavos: form.comissao.trim()
      ? centavosExatosDaEntrada(form.comissao)
      : '0',
    conta_casa_id: form.conta ?? null,
  };
}
export function validarRecibo(value: Recibo | undefined, id: string): Recibo {
  respostaPublicada(value, SITE_READ_CONTRACT[POST]?.response);
  if (
    !value ||
    value.intencao_id.toLowerCase() !== id.toLowerCase() ||
    value.estado !== 'confirmada' ||
    !/^m:[a-f\d]{32}$/.test(value.aposta_chave) ||
    value.detalhe_url !== '/api/v1/apostas/' + value.aposta_chave ||
    MANUAL_POLICIES.automatic_retry !== false ||
    MANUAL_POLICIES.expired_identity_reusable !== false ||
    MANUAL_POLICIES.get_automatic_retry !== false
  )
    throw new ApiError('invalid_response');
  for (const date of [
    value.confirmado_em,
    value.recuperavel_ate,
    value.confirmacao_original.data_aposta,
  ])
    dataHora(date, 'America/Sao_Paulo');
  for (const amount of [
    value.confirmacao_original.stake_centavos,
    value.confirmacao_original.valor_aposta_centavos,
    value.confirmacao_original.valor_unidade_centavos,
    value.confirmacao_original.comissao_centavos,
  ])
    moeda(amount);
  return value;
}
export function destinoRecibo(recibo: Recibo, search: URLSearchParams) {
  const next = new URLSearchParams(search);
  next.set('manual_intencao', recibo.intencao_id);
  return (
    '/aposta/' + encodeURIComponent(recibo.aposta_chave) + '?' + next.toString()
  );
}
