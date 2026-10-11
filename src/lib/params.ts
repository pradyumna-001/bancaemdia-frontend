import type { components } from '../api/schema';
import type { ContratoLeitura } from '../api/readContract';
import { SITE_READ_CONTRACT } from '../api/site-read.generated';
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
} as const;
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

export function adaptarFiltros(
  visao: VisaoFiltros,
  recurso: RecursoFiltros,
  contrato: ContratoLeitura = SITE_READ_CONTRACT,
) {
  const valores = visao.valores;
  const endpoint = RECURSOS_FILTROS[recurso];
  const route = contrato[endpoint];
  const bloqueios: string[] = [];
  if (!route)
    bloqueios.push(
      'Esta consulta ainda não está disponível. Seus filtros foram preservados.',
    );
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
  const query: Record<string, string | number | boolean> = {};
  const preserved: Filtro[] = [];
  const mapping: Record<Filtro, string> = {
    casa: 'casa_id',
    tipster: 'tipster_id',
    mercado: 'mercado_id',
    competicao: 'competicao_id',
    titular: 'titular_id',
    conta: 'conta_casa_id',
    grupo: 'grupo_id',
    banca: 'banca_id',
    estado: 'estado',
    origem: 'origem',
    desde: 'desde',
    ate: 'ate',
    periodo: 'periodo',
    apagadas: 'visibilidade',
    revisao: 'revisao_grave',
  };
  for (const [key, value] of Object.entries(valores) as [Filtro, string][]) {
    const name = mapping[key];
    const rule = route?.query[name];
    if (!rule) {
      if (key === 'periodo' && value === 'all') continue;
      if (
        key === 'apagadas' &&
        value !== '1' &&
        route?.query.incluir_apagadas
      ) {
        query.incluir_apagadas = value === 'todas';
        continue;
      }
      preserved.push(key);
      bloqueios.push(
        'O filtro ' +
          (DIMENSOES[key as Dimensao] ?? key) +
          ' ainda não pode ser aplicado a esta consulta. Remova-o para consultar outra visão.',
      );
      continue;
    }
    if (
      Object.hasOwn(DIMENSOES, key) &&
      rule.type !== 'string' &&
      !rule.anyOf?.some((part) => part.type === 'string') &&
      (rule.type === 'integer' ||
        rule.anyOf?.some((part) => part.type === 'integer')) &&
      !Number.isSafeInteger(Number(value))
    ) {
      preserved.push(key);
      bloqueios.push(
        'Este identificador exige uma versão da consulta com IDs exatos. O filtro foi preservado.',
      );
      continue;
    }
    query[name] =
      key === 'desde'
        ? inicioDia(value)
        : key === 'ate' && value !== '9999-12-31'
          ? inicioDia(deslocarDia(value, 1))
          : key === 'revisao'
            ? value === '1'
            : key === 'apagadas'
              ? value === '1'
                ? 'apagadas'
                : value === 'todas'
                  ? 'todas'
                  : 'ativas'
              : value;
  }
  if (route?.query.visibilidade && query.visibilidade === undefined)
    query.visibilidade = 'ativas';
  if (
    route?.query.incluir_apagadas &&
    query.incluir_apagadas === undefined &&
    !route.query.visibilidade
  )
    query.incluir_apagadas = false;
  if (recurso === 'apostas') {
    query.page = visao.page;
    query.page_size = visao.page_size;
  }
  return {
    endpoint,
    query,
    preservados: preserved,
    bloqueios,
    escopo:
      'Os filtros ficam salvos no endereço. A lista não remove itens no navegador. Lista e resumo são consultas separadas e podem refletir alterações feitas entre elas.',
  };
}

export function serializarConsulta(
  query: Readonly<Record<string, string | number | boolean>>,
): string {
  return new URLSearchParams(
    Object.entries(query).map(([key, value]) => [key, String(value)]),
  ).toString();
}
