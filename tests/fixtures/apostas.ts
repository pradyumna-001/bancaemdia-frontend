import type { components } from '../../src/api/schema';
import { betsWithUnknownValues } from './api/responses';

export const apostaExemplo = {
  ...betsWithUnknownValues.data[0]!,
  chave: 'exemplo-1',
  casa: 'Betano',
  evento: 'Flamengo × Palmeiras',
  descricao: 'Mais de 2,5 gols',
  mercado: 'Total de gols',
  estado: 'GREEN',
  odd: 2.3,
  valor_aposta_centavos: 5000,
  stake_centavos: 5000,
  lucro_centavos: 1500,
  retorno_centavos: 6500,
  data_aposta: '2026-10-09T18:00:00Z',
  data_jogo: '2026-10-10T22:00:00Z',
  origem: 'telegram',
  conta_atribuicao: 'ASSIGNED',
  conta_casa_id: 1,
  conta_contexto: {
    id: '1',
    casa_id: '7',
    apelido: 'Conta principal',
    ativa: false,
    estado: 'INATIVA',
    titular: { id: '9007199254740993', nome: 'Ana', arquivado: true },
  },
  banca_contexto: { id: '9007199254740995', nome: 'Banca de futebol' },
} satisfies components['schemas']['BetResponse'];
export const apostaPendente = {
  ...betsWithUnknownValues.data[0]!,
  chave: 'exemplo-2',
  evento: 'Corinthians × Santos',
  casa: 'Betfair',
  descricao: 'Vitória do Corinthians',
  origem: 'manual',
} satisfies components['schemas']['BetResponse'];
export const apostaApagada = {
  ...apostaExemplo,
  chave: 'exemplo-3',
  evento: 'Grêmio × Internacional',
  descricao: 'Empate no intervalo',
  estado: 'MEIO_RED',
  apagada: true,
  revisao_grave: true,
  freebet: true,
  lucro_centavos: -500,
  origem: 'extensao',
} satisfies components['schemas']['BetResponse'];
// Intentionally different from a sum of the displayed page: the server owns these values.
export const resumoExemplo = {
  fonte_dados: 'apostas_ao_vivo',
  criterio_temporal: 'data_aposta',
  fuso_horario: 'America/Sao_Paulo',
  snapshot_em: '2026-10-10T12:00:00Z',
  respondido_em: '2026-10-10T12:00:00Z',
  resumo: {
    total_apostas: 3,
    pendentes: 1,
    greens: 1,
    reds: 1,
    em_revisao: 1,
    anuladas: 0,
    resultados_desconhecidos: 0,
    giro_centavos: 92345,
    base_roi_centavos: 92345,
    retorno_centavos: null,
    lucro_centavos: null,
    freebets: 1,
    roi: null,
    win_rate: '0.5',
  },
  por_casa: [],
  por_tipster: [],
  por_mercado: [],
};
export function paginaExemplo(page = 1, pageSize = 2) {
  const all = [apostaExemplo, apostaPendente, apostaApagada];
  return {
    data:
      pageSize !== 2
        ? all.slice((page - 1) * pageSize, page * pageSize)
        : page === 1
          ? [apostaExemplo, apostaPendente]
          : page === 2
            ? [
                { ...apostaExemplo, descricao: 'Descrição corrigida' },
                apostaApagada,
              ]
            : [],
    pagination: {
      page,
      page_size: pageSize,
      total: pageSize === 2 && page > 1 ? 4 : 3,
    },
  } satisfies components['schemas']['BetsPageResponse'];
}

// Static fictional values: no financial calculation or real user records.
const eventosDensos = [
  ['São Paulo × Cruzeiro', 'Mais de 1,5 gols'],
  ['Botafogo × Vasco', 'Ambas marcam'],
  ['Bahia × Fortaleza', 'Vitória do Bahia'],
  ['Atlético-MG × Athletico-PR', 'Menos de 3,5 gols'],
  ['Fluminense × Vitória', 'Fluminense ou empate'],
  ['Ceará × Sport', 'Mais de 8,5 escanteios'],
  ['Juventude × Bragantino', 'Mais de 4,5 cartões'],
  ['Santos × Grêmio', 'Empate no primeiro tempo'],
  ['Real Madrid × Barcelona', 'Ambas marcam'],
  ['Atlético de Madrid × Sevilla', 'Menos de 2,5 gols'],
  ['Valencia × Villarreal', 'Vitória do Villarreal'],
  ['Betis × Athletic Bilbao', 'Mais de 1,5 gols'],
  ['Arsenal × Chelsea', 'Vitória do Arsenal'],
  ['Liverpool × Manchester City', 'Mais de 2,5 gols'],
  ['Manchester United × Tottenham', 'Ambas marcam'],
  ['Newcastle × Aston Villa', 'Mais de 9,5 escanteios'],
  ['Brighton × Everton', 'Menos de 3,5 gols'],
  ['Bayern × Dortmund', 'Mais de 2,5 gols'],
  ['Leverkusen × Frankfurt', 'Leverkusen ou empate'],
  ['Leipzig × Stuttgart', 'Ambas marcam'],
  ['Inter × Milan', 'Menos de 3,5 gols'],
  ['Juventus × Napoli', 'Empate'],
  ['Roma × Lazio', 'Mais de 5,5 cartões'],
  ['Atalanta × Fiorentina', 'Mais de 1,5 gols'],
  ['PSG × Marseille', 'Vitória do PSG'],
  ['Lyon × Monaco', 'Ambas marcam'],
  ['Porto × Benfica', 'Mais de 2,5 gols'],
] as const;
const cenariosDensos = [
  apostaExemplo,
  {
    ...apostaExemplo,
    casa: 'bet365',
    estado: 'RED',
    lucro_centavos: -5000,
    retorno_centavos: 0,
  },
  {
    ...apostaExemplo,
    casa: 'Betfair',
    estado: 'PENDENTE',
    lucro_centavos: null,
    retorno_centavos: null,
  },
  {
    ...apostaExemplo,
    estado: 'ANULADA',
    lucro_centavos: 0,
    retorno_centavos: 5000,
  },
  {
    ...apostaExemplo,
    casa: 'Sportingbet',
    estado: 'CASHOUT',
    lucro_centavos: 500,
    retorno_centavos: 5500,
  },
  {
    ...apostaExemplo,
    estado: 'MEIO_GREEN',
    lucro_centavos: 750,
    retorno_centavos: 5750,
  },
] satisfies components['schemas']['BetResponse'][];
export const apostasDensas = [
  apostaExemplo,
  apostaPendente,
  apostaApagada,
  ...eventosDensos.map(([evento, descricao], index) => ({
    ...cenariosDensos[index % cenariosDensos.length]!,
    chave: `densa-${index + 4}`,
    evento,
    descricao,
  })),
] satisfies components['schemas']['BetResponse'][];
export const resumoDenso = {
  ...resumoExemplo,
  resumo: {
    ...resumoExemplo.resumo,
    total_apostas: 30,
    pendentes: 6,
    greens: 10,
    reds: 6,
    anuladas: 4,
  },
};
export function paginaDensaExemplo(page = 1, pageSize = 50) {
  return {
    data: apostasDensas.slice((page - 1) * pageSize, page * pageSize),
    pagination: { page, page_size: pageSize, total: 30 },
  } satisfies components['schemas']['BetsPageResponse'];
}
