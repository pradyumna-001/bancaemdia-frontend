import type { components } from '../../../api/schema';
import { ApiError } from '../../../api/error';
import { corresponde, respostaPublicada } from '../../../api/readContract';
import { SITE_READ_CONTRACT } from '../../../api/site-read.generated';
import {
  dataCivil,
  decimal,
  decimalDaEntrada,
  decimalEditavel,
  moedaDecimalCentavos,
  percentualDecimal,
} from '../../../lib/format';

export type Meta = components['schemas']['MetaSaida'];
export type Entrada = components['schemas']['MetaEntrada'];
export const LIST = '/api/v1/painel/metas';
export const ITEM = '/api/v1/painel/metas/{meta_id}';
export const METRICAS = {
  lucro_centavos: 'Lucro',
  giro_centavos: 'Giro',
  roi: 'ROI',
  win_rate: 'Taxa de acerto',
  total_apostas: 'Quantidade de apostas',
} as const;
export const STATUS = {
  ativa: 'Ativa',
  concluida: 'Concluída',
  arquivada: 'Arquivada',
} as const;
export function metrica(value: string): value is Meta['metrica'] {
  return Object.hasOwn(METRICAS, value);
}
export function percentual(value: Meta['metrica']) {
  return value === 'roi' || value === 'win_rate';
}
function escala(value: Meta['metrica']) {
  return percentual(value) ? 2 : value.endsWith('_centavos') ? -2 : 0;
}
export function apresentar(value: string, kind: Meta['metrica']) {
  return kind.endsWith('_centavos')
    ? moedaDecimalCentavos(value)
    : percentual(kind)
      ? percentualDecimal(value)
      : decimal(decimalEditavel(value).replace(',', '.'));
}
export function editarValor(value: string, kind: Meta['metrica']) {
  return decimalEditavel(value, escala(kind));
}
export function entradaValor(value: string, kind: Meta['metrica']) {
  return decimalDaEntrada(value, -escala(kind));
}
export function conferir(value: Meta | undefined, mutation = false): Meta {
  try {
    respostaPublicada(value, SITE_READ_CONTRACT[ITEM].response);
    if (!value || !Number.isSafeInteger(value.id) || value.id < 1)
      throw new Error();
    dataCivil(value.inicio);
    dataCivil(value.fim);
    apresentar(value.alvo, value.metrica);
    apresentar(value.linha_base, value.metrica);
    apresentar(value.valor_atual, value.metrica);
    percentualDecimal(value.progresso);
    return value;
  } catch {
    throw new ApiError('invalid_response', { mutation });
  }
}
export function conferirLista(value: Meta[] | undefined): Meta[] {
  if (!corresponde(value, SITE_READ_CONTRACT[LIST].response))
    throw new ApiError('invalid_response');
  const ids = new Set<number>();
  return value!.map((item) => {
    conferir(item);
    if (ids.has(item.id)) throw new ApiError('invalid_response');
    ids.add(item.id);
    return item;
  });
}
export function statusLista(value: string | null) {
  return value && Object.hasOwn(STATUS, value)
    ? (value as Meta['status'])
    : 'todas';
}
