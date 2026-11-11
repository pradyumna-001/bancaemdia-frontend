import type { components } from '../../api/schema';
import { ApiError } from '../../api/error';
import { dataHora, moeda } from '../../lib/format';
import { validar } from '../contas/protocol';

export const UNIDADE = '/api/v1/unidade';
export const VIGENCIAS = '/api/v1/unidade/vigencias';
export const INTENCAO = '/api/v1/unidade/vigencias/intencao';
export type Unidade = components['schemas']['UnidadeSaida'];
export type Vigencia = components['schemas']['VigenciaSaida'];
export type Recibo = components['schemas']['ReciboVigenciaSaida'];
export type Pedido = components['schemas']['VigenciaNova'];

function centavos(value: number): void {
  if (!Number.isSafeInteger(value) || value <= 0)
    throw new ApiError('invalid_response');
  moeda(value);
}

function vigencia(value: Vigencia, fuso: string): void {
  centavos(value.valor_centavos);
  if (value.origem === 'usuario' && value.id === null)
    throw new ApiError('invalid_response');
  for (const instante of [value.vigente_de, value.vigente_ate])
    if (instante !== null) dataHora(instante, fuso);
}

export function conferirUnidade(value: Unidade | undefined): Unidade {
  const unidade = validar(value, UNIDADE);
  centavos(unidade.padrao_centavos);
  centavos(unidade.limite_centavos);
  vigencia(unidade.vigente, unidade.fuso_horario);
  unidade.historico.forEach((item) => vigencia(item, unidade.fuso_horario));
  // The unit in force now is open-ended.
  if (unidade.vigente.vigente_ate !== null)
    throw new ApiError('invalid_response');
  return unidade;
}

export function conferirRecibo(
  value: Recibo | undefined,
  route: 'POST' | 'GET',
  body?: Pedido,
): Recibo {
  const recibo = validar(
    value,
    route === 'POST' ? `POST ${VIGENCIAS}` : INTENCAO,
  );
  vigencia(recibo.vigencia, recibo.fuso_horario);
  vigencia(recibo.anterior, recibo.fuso_horario);
  dataHora(recibo.vale_a_partir_de, recibo.fuso_horario);
  if (
    recibo.vigencia.origem !== 'usuario' ||
    recibo.vigencia.vigente_ate !== null ||
    recibo.apostas_existentes_alteradas !== 0 ||
    (body && recibo.vigencia.valor_centavos !== body.valor_centavos)
  )
    throw new ApiError('invalid_response', { mutation: route === 'POST' });
  return recibo;
}
