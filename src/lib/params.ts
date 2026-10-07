import type { operations, components } from '../api/schema';
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
    if (Object.hasOwn(DIMENSOES, key))
      valid &&= /^\d+$/.test(value) && /[1-9]/.test(value);
    else if (key === 'estado') valid &&= Object.hasOwn(ESTADOS_APOSTA, value);
    else if (key === 'periodo') valid &&= Object.hasOwn(PERIODOS, value);
    else if (key === 'desde' || key === 'ate') valid &&= diaValido(value);
    else if (key === 'apagadas') valid &&= ['0', '1', 'todas'].includes(value);
    else if (key === 'revisao') valid &&= ['0', '1'].includes(value);
    else
      valid &&=
        value.length > 0 &&
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
  operations['consultar_painel_api_v1_painel_get']['parameters']['query']
>;
type MetricasQuery = NonNullable<
  operations['consultar_metricas_api_v1_painel_metricas_get']['parameters']['query']
>;
type ExportQuery = NonNullable<
  operations['exportar_painel_api_v1_painel_export_get']['parameters']['query']
>;
const COMUNS: readonly Filtro[] = ['casa', 'tipster', 'mercado'];
const LISTA: readonly Filtro[] = [
  ...COMUNS,
  'competicao',
  'estado',
  'origem',
  'desde',
  'ate',
  'revisao',
  'apagadas',
];
export function adaptarFiltros(visao: VisaoFiltros, recurso: RecursoFiltros) {
  const valores = visao.valores;
  const list = recurso === 'apostas';
  const suportados: readonly Filtro[] = list ? LISTA : [...COMUNS, 'periodo'];
  const preservados = FILTROS.filter(
    (key) => valores[key] !== undefined && !suportados.includes(key),
  );
  const bloqueios: string[] = [];
  for (const key of suportados) {
    if (
      Object.hasOwn(DIMENSOES, key) &&
      valores[key] &&
      !Number.isSafeInteger(Number(valores[key]))
    ) {
      bloqueios.push(
        'Não é possível aplicar o filtro ' +
          DIMENSOES[key as Dimensao] +
          ' com esse identificador. Remova o filtro para consultar ou mantenha a visão salva.',
      );
    }
  }
  if (list && valores.apagadas === '1')
    bloqueios.push(
      'A visão somente apagadas ainda não está disponível. Remova esse filtro para consultar as apostas ativas ou mantenha a visão salva para usar quando estiver disponível.',
    );
  if (list && valores.desde && valores.ate && valores.desde > valores.ate)
    bloqueios.push(
      'A data inicial deve ser anterior ou igual à final. Corrija o período para consultar.',
    );
  if (list && valores.ate === '9999-12-31')
    bloqueios.push(
      'Não é possível usar essa data como final do período. Escolha uma data anterior.',
    );
  const comuns = {
    casa_id: valores.casa ? Number(valores.casa) : undefined,
    tipster_id: valores.tipster ? Number(valores.tipster) : undefined,
    mercado_id: valores.mercado ? Number(valores.mercado) : undefined,
  };
  const apostas: ApostasQuery | undefined =
    list && !bloqueios.length
      ? {
          ...comuns,
          page: visao.page,
          page_size: visao.page_size,
          estado: valores.estado,
          origem: valores.origem,
          competicao_id: valores.competicao
            ? Number(valores.competicao)
            : undefined,
          desde: valores.desde ? inicioDia(valores.desde) : undefined,
          ate: valores.ate ? inicioDia(deslocarDia(valores.ate, 1)) : undefined,
          revisao_grave:
            valores.revisao === undefined ? undefined : valores.revisao === '1',
          incluir_apagadas: valores.apagadas === 'todas',
        }
      : undefined;
  const painel: PainelQuery & MetricasQuery & ExportQuery = {
    ...comuns,
    periodo: (valores.periodo ??
      '30d') as components['schemas']['PeriodoPainel'],
  };
  return {
    apostas: list && !bloqueios.length ? apostas : undefined,
    painel: !list && !bloqueios.length ? painel : undefined,
    preservados,
    bloqueios,
    escopo: list
      ? 'Apostas consideradas pela data em que foram feitas. Os filtros valem para todas as páginas.'
      : 'O Painel e sua exportação usam o mesmo período, casa, tipster e mercado. Os filtros da lista de Apostas podem mostrar um conjunto diferente.',
  };
}
