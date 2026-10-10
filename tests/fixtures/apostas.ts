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
