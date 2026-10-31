import type { components } from '../../../api/schema';
import { ApiError } from '../../../api/error';
import { validar, identificador } from '../protocol';
import { diaValido } from '../../../lib/datasFiltro';
import { dataHora } from '../../../lib/format';
export const PREVIEW = '/api/v1/titulares/trocas/preview';
export const APPLY = '/api/v1/titulares/trocas';
export const GET = '/api/v1/titulares/trocas/intencao';
export type Pedido = components['schemas']['TrocaContaEntrada'];
export type Recibo = components['schemas']['TrocaContaSaida'];
export type Intencao = components['schemas']['TrocaIntencaoSaida'];
export function instante(day: string, time: string, offset: string) {
  if (
    !diaValido(day) ||
    !/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(time) ||
    !/^[+-](?:0\d|1[0-3]):[0-5]\d$/.test(offset)
  )
    throw new Error('Confira a data, a hora e o deslocamento UTC.');
  return `${day}T${time.length === 5 ? time + ':00' : time}${offset}`;
}
export function conferir(
  value: Recibo | undefined,
  body: Pedido | undefined,
  applied: boolean,
): Recibo {
  const receipt = validar(value, 'POST ' + (applied ? APPLY : PREVIEW));
  if (
    receipt.aplicada !== applied ||
    [
      receipt.casa_id,
      receipt.conta_origem_id,
      receipt.conta_destino_id,
      ...receipt.apostas_afetadas_ids,
    ].some((id) => !identificador(String(id))) ||
    receipt.conta_origem_id === receipt.conta_destino_id ||
    new Set(receipt.apostas_afetadas_ids).size !==
      receipt.apostas_afetadas_ids.length
  )
    throw new ApiError('invalid_response', { mutation: true });
  dataHora(receipt.efetiva_em, 'America/Sao_Paulo');
  if (
    body &&
    (receipt.casa_id !== body.casa_id ||
      receipt.conta_origem_id !== body.conta_origem_id ||
      receipt.conta_destino_id !== body.conta_destino_id ||
      receipt.estado_origem !== body.estado_origem ||
      Date.parse(receipt.efetiva_em) !== Date.parse(body.efetiva_em))
  )
    throw new ApiError('invalid_response', { mutation: true });
  return receipt;
}
export function conferirIntencao(value: Intencao | undefined): Intencao {
  const intent = validar(value, GET);
  conferir(intent.previa, undefined, false);
  if ((intent.estado === 'APPLIED') !== (intent.recibo !== null))
    throw new ApiError('invalid_response');
  if (intent.recibo) conferir(intent.recibo, intent.previa, true);
  dataHora(intent.previa_expira_em, 'America/Sao_Paulo');
  return intent;
}
