import diarioExample from './painel-diario.json' with { type: 'json' };
import gruposExample from './painel-grupos.json' with { type: 'json' };
import legado from './painel-legado.json' with { type: 'json' };
import filtrado from './painel-filtrado.json' with { type: 'json' };
import type { Diario, Hierarquia } from '../../src/features/painel/protocol';
import { deslocarDia } from '../../src/lib/datasFiltro';

// Presentation fixtures only. No financial computation or simulated session is
// imported into the public build. API acceptance uses the real backend instead.
export const diario = diarioExample as Diario;
export const grupos = gruposExample as Hierarquia;
export { legado, filtrado };
const demoTotal: Diario['total_periodo'] = {
  ...diario.total_periodo,
  total_apostas: 144,
  lucro_centavos: null,
  retorno_centavos: null,
  roi: null,
  estado_dado: 'parcial',
  lucro_conhecido_centavos: '23800',
  pendentes: 24,
  em_revisao: 24,
  pendentes_financeiras: 24,
  revisoes_financeiras: 24,
  fontes_excluidas_financeiro: 24,
  giro_centavos: '12000',
};
export function diarioDemo(start = '2026-01-01', size = 14): Diario {
  const states = [
    'confirmado',
    'pendente',
    'sem_atividade',
    'confirmado',
    'parcial',
    'desconhecido',
    'fora_do_financeiro',
  ] as const;
  const profits = ['18400', null, '0', '-6500', null, null, null];
  return {
    ...structuredClone(diario),
    total_periodo: demoTotal,
    subtotal_intervalo: start === '2026-01-01' ? demoTotal : diario.sem_data,
    filtros: {
      desde: '2026-01-01T00:00:00-03:00',
      ate: '2026-04-01T00:00:00-03:00',
      visibilidade: 'ativas',
    },
    intervalo_total: {
      inicio: '2026-01-01',
      fim_exclusivo: '2026-04-01',
      dias: 90,
    },
    intervalo_devolvido: {
      inicio: start,
      fim_exclusivo: deslocarDia(start, size),
      dias: size,
    },
    anterior_cursor: start === '2026-01-01' ? null : 'cursor-anterior-privado',
    proximo_cursor:
      size === 90 || start === '2026-03-26' ? null : 'cursor-proximo-privado',
    dias: Array.from({ length: size }, (_, i) => {
      const day = deslocarDia(start, i);
      const position = Math.round(
        (Date.parse(day) - Date.parse('2026-01-01')) / 86400000,
      );
      const state =
        position < 14 ? states[position % states.length]! : 'sem_atividade';
      const profit = position < 14 ? profits[position % profits.length]! : '0';
      return {
        dia: deslocarDia(start, i),
        metricas: {
          ...diario.total_periodo,
          total_apostas: state === 'sem_atividade' ? 0 : 12,
          lucro_centavos: profit,
          lucro_conhecido_centavos: profit ?? '0',
          retorno_centavos: profit === null ? null : '26000',
          roi: profit === null ? null : '0.125000',
          estado_dado: state,
          pendentes_financeiras: state === 'pendente' ? 3 : 0,
          revisoes_financeiras: state === 'desconhecido' ? 2 : 0,
          fontes_excluidas_financeiro: state === 'fora_do_financeiro' ? 12 : 0,
        },
      };
    }),
  };
}
export function gruposDemo(): Hierarquia {
  const g = grupos.grupos[0]!;
  return {
    ...structuredClone(grupos),
    total_periodo: demoTotal,
    total_grupos: 3,
    total_filhos: 4,
    grupos: [
      {
        ...g,
        nome: 'Seleções de futebol',
        total_filhos: 2,
        metricas: {
          ...g.metricas,
          lucro_centavos: null,
          retorno_centavos: null,
          roi: null,
          estado_dado: 'parcial',
          lucro_conhecido_centavos: '14200',
          total_apostas: 80,
        },
        tipsters: [
          {
            ...g.tipsters[0]!,
            nome: 'Análise do Rafael',
            metricas: {
              ...g.metricas,
              lucro_centavos: null,
              retorno_centavos: null,
              roi: null,
              estado_dado: 'parcial',
              lucro_conhecido_centavos: '17200',
              total_apostas: 60,
            },
          },
          {
            ...g.tipsters[0]!,
            id: '3',
            nome: 'Linha da Marina',
            metricas: {
              ...g.metricas,
              lucro_centavos: '-3000',
              lucro_conhecido_centavos: '-3000',
              total_apostas: 20,
            },
          },
        ],
      },
      {
        ...g,
        id: '2',
        nome: 'Mercados ao vivo',
        ativo: false,
        tipsters: [
          {
            ...g.tipsters[0]!,
            nome: 'Análise do Rafael',
            metricas: {
              ...g.metricas,
              lucro_centavos: '-4700',
              lucro_conhecido_centavos: '-4700',
              total_apostas: 38,
            },
          },
        ],
        metricas: {
          ...g.metricas,
          lucro_centavos: '-4700',
          lucro_conhecido_centavos: '-4700',
          total_apostas: 38,
        },
      },
      {
        ...g,
        id: null,
        nome: null,
        atribuicao: 'sem_grupo',
        metricas: {
          ...g.metricas,
          lucro_centavos: '14300',
          lucro_conhecido_centavos: '14300',
          total_apostas: 26,
        },
        tipsters: [
          {
            ...g.tipsters[0]!,
            id: null,
            nome: null,
            atribuicao: 'sem_tipster',
            metricas: {
              ...g.metricas,
              lucro_centavos: '14300',
              lucro_conhecido_centavos: '14300',
              total_apostas: 26,
            },
          },
        ],
      },
    ],
  };
}
