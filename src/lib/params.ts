import type { operations, components, paths } from '../api/schema';
import { paginacaoConsulta } from '../api/query';
import { ESTADOS_APOSTA } from './termos';
import { diaValido, deslocarDia, inicioDia } from './datasFiltro';

export const DIMENSOES = {
  casa: 'Casa',
  tipster: 'Tipster',
  mercado: 'Mercado',
  competicao: 'Competição',
  titular: 'Titular',
  conta: 'Conta',
  grupo: 'Grupo',
  banca: 'Banca',
} as const;
export type Dimensao = keyof typeof DIMENSOES;
export const PERIODOS = {
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
  '90d': 'Últimos 90 dias',
  '1y': 'Último ano',
  all: 'Todo o período',
} as const satisfies Record<components['schemas']['PeriodoPainel'], string>;
export type Filtro =
  | Dimensao
  | 'estado'
  | 'origem'
  | 'desde'
  | 'ate'
  | 'periodo'
  | 'apagadas'
  | 'revisao';
export type RecursoFiltros = 'apostas' | 'painel' | 'metricas' | 'export';
export const RECURSOS_FILTROS = {
  apostas: '/api/v1/apostas',
  painel: '/api/v1/painel/filtrado',
  metricas: '/api/v1/painel/filtrado/metricas',
  export: '/api/v1/painel/filtrado/export',
} as const satisfies Record<RecursoFiltros, keyof paths>;
const BIGINT_MAX = '9223372036854775807';
export type VisaoFiltros = Readonly<{
  valores: Readonly<Partial<Record<Filtro, string>>>;
  invalidos: readonly string[];
  busca: string;
  page: number;
  page_size: number;
}>;
const FILTROS: readonly Filtro[] = [
  ...(Object.keys(DIMENSOES) as Dimensao[]),
  'estado',
  'origem',
  'desde',
  'ate',
  'periodo',
  'apagadas',
  'revisao',
];
export function lerFiltros(search: URLSearchParams): VisaoFiltros {
  const clean = new URLSearchParams(search);
  const valores: Partial<Record<Filtro, string>> = {};
  const invalidos: string[] = [];
  for (const key of FILTROS) {
    if (!search.has(key)) continue;
    const all = search.getAll(key);
    const value = all[0]!;
    let valid = all.length === 1;
    if (Object.hasOwn(DIMENSOES, key)) {
      const normalizado = value.replace(/^0+/, '');
      valid &&=
        /^\d+$/.test(value) &&
        normalizado.length > 0 &&
        (normalizado.length < BIGINT_MAX.length ||
          (normalizado.length === BIGINT_MAX.length &&
            normalizado <= BIGINT_MAX));
    } else if (key === 'estado') valid &&= Object.hasOwn(ESTADOS_APOSTA, value);
    else if (key === 'periodo') valid &&= Object.hasOwn(PERIODOS, value);
    else if (key === 'desde' || key === 'ate') valid &&= diaValido(value);
    else if (key === 'apagadas') valid &&= ['0', '1', 'todas'].includes(value);
    else if (key === 'revisao') valid &&= ['0', '1'].includes(value);
    else
      valid &&=
        value.length > 0 &&
        [...value].length <= 128 &&
        [...value].every((character) => {
          const point = character.codePointAt(0)!;
          return point >= 32 && point !== 127;
        });
    clean.delete(key);
    if (valid) {
      const normalized = Object.hasOwn(DIMENSOES, key)
        ? value.replace(/^0+/, '')
        : value;
      valores[key] = normalized;
      clean.set(key, normalized);
    } else invalidos.push(key);
  }
  const pagination = paginacaoConsulta('GET /api/v1/apostas', search);
  for (const key of ['page', 'page_size'] as const) {
    if (search.has(key)) {
      const all = search.getAll(key);
      if (
        all.length !== 1 ||
        !/^\d+$/.test(all[0]!) ||
        Number(all[0]) !== pagination[key]
      )
        invalidos.push(key);
      clean.set(key, String(pagination[key]));
    }
  }
  return {
    valores: Object.freeze(valores),
    invalidos,
    busca: clean.toString(),
    ...pagination,
  };
}
export function alterarFiltro(
  search: URLSearchParams,
  key: Filtro,
  value?: string,
): URLSearchParams {
  const next = new URLSearchParams(lerFiltros(search).busca);
  next.delete(key);
  if (value !== undefined) next.set(key, value);
  next.delete('page');
  return new URLSearchParams(lerFiltros(next).busca);
}
export function trocarPagina(
  search: URLSearchParams,
  page: number,
): URLSearchParams {
  const next = new URLSearchParams(lerFiltros(search).busca);
  next.set('page', String(page));
  return new URLSearchParams(lerFiltros(next).busca);
}
type ApostasQuery = NonNullable<
  operations['listar_apostas_api_v1_apostas_get']['parameters']['query']
>;
type PainelQuery = NonNullable<
  operations['consultar_painel_filtrado_api_v1_painel_filtrado_get']['parameters']['query']
>;
type MetricasQuery = NonNullable<
  operations['consultar_graficos_filtrados_api_v1_painel_filtrado_metricas_get']['parameters']['query']
>;
type ExportQuery = NonNullable<
  operations['exportar_painel_filtrado_api_v1_painel_filtrado_export_get']['parameters']['query']
>;
export function adaptarFiltros(visao: VisaoFiltros, recurso: RecursoFiltros) {
  const valores = visao.valores;
  const list = recurso === 'apostas';
  const bloqueios: string[] = [];
  if (valores.periodo && (valores.desde || valores.ate))
    bloqueios.push(
      'Escolha um período ou datas de início e fim. Remova o período para usar as datas, ou remova as datas para usar o período.',
    );
  if (valores.desde && valores.ate && valores.desde > valores.ate)
    bloqueios.push(
      'A data inicial deve ser anterior ou igual à final. Corrija o período para consultar.',
    );
  if (valores.ate === '9999-12-31')
    bloqueios.push(
      'Não é possível usar essa data como final do período. Escolha uma data anterior.',
    );
  const comuns: PainelQuery & MetricasQuery & ExportQuery = {
    casa_id: valores.casa,
    tipster_id: valores.tipster,
    mercado_id: valores.mercado,
    competicao_id: valores.competicao,
    titular_id: valores.titular,
    conta_casa_id: valores.conta,
    grupo_id: valores.grupo,
    banca_id: valores.banca,
    estado: valores.estado,
    origem: valores.origem,
    periodo: valores.periodo as
      components['schemas']['PeriodoPainel'] | undefined,
    desde: valores.desde ? inicioDia(valores.desde) : undefined,
    ate:
      valores.ate && valores.ate !== '9999-12-31'
        ? inicioDia(deslocarDia(valores.ate, 1))
        : undefined,
    revisao_grave:
      valores.revisao === undefined ? undefined : valores.revisao === '1',
    visibilidade:
      valores.apagadas === '1'
        ? 'apagadas'
        : valores.apagadas === 'todas'
          ? 'todas'
          : 'ativas',
  };
  const apostas: ApostasQuery | undefined =
    list && !bloqueios.length
      ? {
          ...comuns,
          page: visao.page,
          page_size: visao.page_size,
        }
      : undefined;
  return {
    endpoint: RECURSOS_FILTROS[recurso],
    apostas: list && !bloqueios.length ? apostas : undefined,
    painel: !list && !bloqueios.length ? comuns : undefined,
    preservados: [] as Filtro[],
    bloqueios,
    escopo:
      'Os filtros valem para a lista, o resumo e a exportação. O período considera a data em que as apostas foram feitas, no fuso de São Paulo. Sem período ou datas, inclui todo o histórico. Consultas separadas podem refletir atualizações feitas entre elas.',
  };
}
