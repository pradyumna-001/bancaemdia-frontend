import type { components } from '../../../api/schema';
import { ApiError } from '../../../api/error';
import { respostaPublicada } from '../../../api/readContract';
import { SITE_READ_CONTRACT } from '../../../api/site-read.generated';
import {
  dataCivil,
  dataHora,
  decimal,
  moeda,
  porcentagem,
} from '../../../lib/format';
import { lerFiltros, PERIODOS } from '../../../lib/params';
import { validarLegado } from '../protocol';

export type Analises = components['schemas']['AnalisesSaida'];
export type Bucket = components['schemas']['BucketAnaliseSaida'];
export type Evolucao = components['schemas']['EvolucaoSaida'];
export const ANALISES = '/api/v1/painel/analises';
export const DIMENSOES_ANALISES = ['casa', 'tipster', 'mercado'] as const;
export function consultaAnalises(params: URLSearchParams) {
  const visao = lerFiltros(params);
  const raw = params.getAll('periodo');
  const periodo =
    raw.length === 1 && Object.hasOwn(PERIODOS, raw[0]!)
      ? (raw[0]! as keyof typeof PERIODOS)
      : '30d';
  const query: Record<string, string> = { periodo };
  for (const name of DIMENSOES_ANALISES) {
    if (visao.valores[name]) query[name + '_id'] = visao.valores[name]!;
  }
  return {
    visao,
    query,
    periodo,
    preservados: Object.keys(visao.valores).filter(
      (k) => !['casa', 'tipster', 'mercado', 'periodo'].includes(k),
    ),
  };
}
export function sinal(valor: number) {
  return valor < 0 ? 'perda' : valor > 0 ? 'lucro' : '';
}
function inteiro(value: number, nonnegative = false) {
  if (!Number.isSafeInteger(value) || (nonnegative && value < 0))
    throw new Error('Inteiro inválido');
}
function resumo(value: Analises['total_filtrado']) {
  for (const field of [
    'total_apostas',
    'pendentes',
    'greens',
    'reds',
    'resultado_nao_aplicavel',
  ] as const)
    inteiro(value[field], true);
  for (const field of [
    'giro_centavos',
    'base_roi_centavos',
    'lucro_centavos',
  ] as const)
    moeda(value[field]);
  porcentagem(value.roi);
  porcentagem(value.hit_rate);
}
export function validarAnalises(value: Analises | undefined): Analises {
  try {
    respostaPublicada(value, SITE_READ_CONTRACT[ANALISES].response);
    const data = value!;
    dataHora(data.respondido_em, data.fuso_horario);
    dataHora(data.atualizado_em, data.fuso_horario);
    decimal(data.idade_mv_segundos);
    decimal(data.replica_atraso_segundos);
    decimal(data.odd_media);
    decimal(data.profit_factor);
    inteiro(data.odds_desconhecidas, true);
    inteiro(data.odds_nao_aplicaveis, true);
    resumo(data.total_filtrado);
    for (const group of [
      data.faixas_odds,
      data.heatmap,
      data.por_esporte,
      data.quartis_stake,
      data.por_banca_progressao,
    ]) {
      if (new Set(group.map((b) => b.chave)).size !== group.length)
        throw new Error('Categoria repetida');
      group.forEach((b) => {
        resumo(b);
        porcentagem(b.progressao ?? null);
        for (const field of [
          'capital_banca_centavos',
          'valor_face_min_centavos',
          'valor_face_max_centavos',
        ] as const)
          moeda(b[field] ?? null);
      });
    }
    return data;
  } catch {
    throw new ApiError('invalid_response');
  }
}
export function validarCaixa(
  value: components['schemas']['PainelSaida'] | undefined,
) {
  try {
    const data = validarLegado(value);
    for (const p of data.evolucao) {
      dataCivil(p.periodo_inicio);
      for (const k of [
        'depositos_acumulados_centavos',
        'depositos_periodo_centavos',
        'saques_acumulados_centavos',
        'saques_periodo_centavos',
      ] as const)
        moeda(p[k]);
      moeda(p.saldo_centavos);
      moeda(p.saldo_inicial_centavos ?? null);
      if (p.banca_id !== null) inteiro(p.banca_id, true);
    }
    const identities = data.evolucao.map((p) =>
      JSON.stringify([p.banca_id, p.periodo_inicio]),
    );
    if (new Set(identities).size !== identities.length)
      throw new Error('Data repetida');
    return data;
  } catch {
    throw new ApiError('invalid_response');
  }
}
const ODDS: Record<string, string> = {
  lt_1_50: 'Abaixo de 1,50',
  '1_50_1_99': 'De 1,50 a menos de 2,00',
  '2_00_2_99': 'De 2,00 a menos de 3,00',
  '3_00_4_99': 'De 3,00 a menos de 5,00',
  gte_5_00: '5,00 ou mais',
  unknown: 'Odd desconhecida',
};
const DIAS = [
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
  'Domingo',
];
const TURNOS: Record<string, string> = {
  madrugada: 'Madrugada · 00h–06h',
  manha: 'Manhã · 06h–12h',
  tarde: 'Tarde · 12h–18h',
  noite: 'Noite · 18h–24h',
};
export type Particao =
  | 'por_esporte'
  | 'faixas_odds'
  | 'heatmap'
  | 'quartis_stake'
  | 'por_banca_progressao';
export function nomeBucket(b: Bucket, tipo: Particao) {
  if (tipo === 'por_esporte')
    return (
      b.nome?.trim() ||
      (b.chave === 'unknown' ? 'Esporte não informado' : 'Esporte sem nome')
    );
  if (tipo === 'faixas_odds')
    return ODDS[b.chave] ?? 'Faixa de odd não identificada';
  if (tipo === 'heatmap') {
    const [day, turn] = b.chave.split(':');
    return /^[0-6]$/.test(day!) && TURNOS[turn!]
      ? DIAS[Number(day)] + ' · ' + TURNOS[turn!]
      : 'Dia e horário não identificados';
  }
  if (tipo === 'por_banca_progressao')
    return (
      b.nome?.trim() ||
      (b.chave === 'unknown' ? 'Sem banca atribuída' : 'Banca sem nome')
    );
  if (b.chave === 'not_applicable') return 'Valor de face não aplicável';
  return /^q[1-4]$/.test(b.chave)
    ? `Faixa ${b.chave.slice(1)} · ${moeda(b.valor_face_min_centavos ?? null)} a ${moeda(b.valor_face_max_centavos ?? null)}`
    : 'Faixa de valor não identificada';
}
export function motivoProgressao(b: Bucket) {
  return b.progressao !== null && b.progressao !== undefined
    ? porcentagem(b.progressao)
    : b.motivo_progressao === 'sem_banca'
      ? 'Sem banca atribuída'
      : b.motivo_progressao === 'capital_ausente_ou_zero'
        ? 'Capital ausente ou não positivo'
        : 'Progressão não informada';
}
