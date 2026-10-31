import type { components } from '../../api/schema';
import { respostaPublicada } from '../../api/readContract';
import { SITE_READ_CONTRACT } from '../../api/site-read.generated';
import { ApiError } from '../../api/error';
import { dataHora, moeda, porcentagem } from '../../lib/format';

export const ENDPOINT_HIPOTETICA = '/api/v1/painel/hipotetica';
export type Comparacao = components['schemas']['HipoteticaSaida'];
export type Cenario = components['schemas']['CenarioHipotetica'];
export const ESTADOS = {
  sem_apostas: [
    'Nenhuma aposta neste recorte',
    'Escolha outro período ou revise os filtros para encontrar apostas.',
  ],
  sem_vinculos_elegiveis: [
    'Ainda não há dicas confirmadas para comparar',
    'As apostas mantêm os valores reais. Confira os vínculos na Revisão ou escolha outro recorte.',
  ],
  sem_stakes_diferentes: [
    'Você já seguiu as stakes indicadas',
    'Neste recorte, as stakes dos vínculos elegíveis são iguais às usadas nas apostas.',
  ],
  comparado: [
    'Comparação disponível',
    'Somente a stake da dica confirmada muda; a odd e o resultado da aposta continuam os reais.',
  ],
  parcial: [
    'A comparação tem limitações',
    'Algumas apostas não podem ser recalculadas com segurança. Totais hipotéticos não informados ficam sem valor.',
  ],
  indisponivel: [
    'Não há dados suficientes para comparar',
    'Os valores reais continuam disponíveis. Confira as limitações antes de escolher outro recorte.',
  ],
} as const satisfies Record<Comparacao['estado'], readonly [string, string]>;

export const LIMITACOES = {
  vinculo_ambiguo: 'Mais de uma dica pode corresponder à aposta',
  dica_indisponivel: 'Dica confirmada indisponível',
  dica_em_revisao: 'Dica aguardando revisão',
  stake_indicada_invalida: 'Stake indicada não informada ou inválida',
  stake_real_zero: 'Stake real igual a zero',
  odd_real_invalida: 'Odd real não informada ou inválida',
  cashout_nao_escalavel: 'CASHOUT com stake diferente',
  historico_financeiro_ausente: 'Histórico financeiro insuficiente',
  taxa_bonus_ou_retorno_fixo:
    'Taxa, bônus ou retorno fixo sem regra segura para comparar',
  retorno_real_desconhecido: 'Retorno real não informado',
  retorno_fora_da_regra_padrao: 'Retorno real diferente da liquidação padrão',
  fora_do_financeiro: 'Aposta fora do conjunto financeiro',
  pendente: 'Aposta PENDENTE: apenas exposição, sem retorno previsto',
  resultado_real_desconhecido: 'Resultado real não informado',
} as const satisfies Record<Comparacao['limitacoes'][number]['motivo'], string>;

const metadados = {
  regra: 'stake_dica_confirmada_odd_resultado_reais_v1',
  moeda: 'BRL',
  unidade: 'centavos',
  arredondamento: 'ROUND_HALF_EVEN_por_etapa_de_liquidacao',
  precisao_decimal: 80,
  escopo_financeiro: 'liquidadas_sem_revisao_sem_dica_consolidada',
  criterio_temporal: 'data_aposta',
  fuso_horario: 'America/Sao_Paulo',
  fonte_dados: 'apostas_ao_vivo',
} as const;

// Validate against the generated response, including exact money and displayable metadata.
// A failed/mismatched snapshot never becomes a comparison of different populations.
export function comparacaoPublicada(
  value: unknown,
  query: Readonly<Record<string, string | number | boolean>>,
): Comparacao {
  const root = respostaPublicada(
    value,
    SITE_READ_CONTRACT[ENDPOINT_HIPOTETICA]?.response,
  );
  if (
    Object.entries(metadados).some(([key, expected]) => root[key] !== expected)
  )
    throw new ApiError('invalid_response');
  const result = root as Comparacao;
  for (const key of [
    'casa_id',
    'tipster_id',
    'titular_id',
    'conta_casa_id',
    'banca_id',
    'grupo_id',
    'mercado_id',
    'competicao_id',
    'estado',
    'origem',
    'revisao_grave',
  ] as const) {
    if (query[key] === undefined && result.filtros[key] != null)
      throw new ApiError('invalid_response');
  }
  for (const [key, expected] of Object.entries(query)) {
    if (key === 'fresh') continue;
    const actual = result.filtros[key as keyof Comparacao['filtros']];
    const same =
      key === 'desde' || key === 'ate'
        ? typeof actual === 'string' &&
          Date.parse(actual) === Date.parse(String(expected))
        : actual === expected;
    if (!same) throw new ApiError('invalid_response');
  }
  try {
    dataHora(result.snapshot_em, result.fuso_horario!);
    dataHora(result.respondido_em, result.fuso_horario!);
    for (const bound of [result.filtros.desde, result.filtros.ate])
      if (bound != null) dataHora(bound, result.fuso_horario!);
    for (const scenario of [result.real, result.hipotetico]) {
      for (const [key, amount] of Object.entries(scenario)) {
        if (key.endsWith('_centavos')) moeda(amount);
      }
      for (const ratio of [scenario.roi, scenario.win_rate]) {
        if (ratio !== null && !/^-?(0|[1-9]\d*)\.\d{6}$/.test(ratio))
          throw new Error('Razão inválida');
        porcentagem(ratio);
      }
    }
    Object.values(result.diferencas).forEach((amount) => moeda(amount));
  } catch {
    throw new ApiError('invalid_response');
  }
  return result;
}
