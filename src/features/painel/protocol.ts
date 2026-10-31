import type { components } from '../../api/schema';
import { ApiError } from '../../api/error';
import { respostaPublicada } from '../../api/readContract';
import { SITE_READ_CONTRACT } from '../../api/site-read.generated';
import { moeda, porcentagem, dataHora } from '../../lib/format';
import { diaValido, deslocarDia } from '../../lib/datasFiltro';
export type Diario = components['schemas']['DiarioSaida'];
export type Hierarquia = components['schemas']['HierarquiaSaida'];
export type Grupo = components['schemas']['GrupoDeOrigem'];
export type Metricas = components['schemas']['MetricasDetalhadas'];
export type PainelLegado = components['schemas']['PainelSaida'];
export type Comparacoes = components['schemas']['PainelFiltradoSaida'];
export const DIARIO = '/api/v1/painel/filtrado/diario';
export const GRUPOS = '/api/v1/painel/filtrado/grupos';
export const EXPORT = '/api/v1/painel/filtrado/detalhado/export';
export const ESTADOS = {
  confirmado: 'Confirmado',
  sem_atividade: 'Sem atividade',
  parcial: 'Resultado parcial',
  pendente: 'Resultado pendente',
  desconhecido: 'Resultado desconhecido',
  fora_do_financeiro: 'Fora do financeiro',
} as const;
function validarHora(value: string | null) {
  try {
    dataHora(value, 'America/Sao_Paulo');
  } catch {
    throw new ApiError('invalid_response');
  }
}
export function apresentarMetricas(m: Metricas) {
  if (
    Object.values(m).some(
      (v) => typeof v === 'number' && (!Number.isSafeInteger(v) || v < 0),
    ) ||
    (['pendente', 'parcial', 'desconhecido', 'fora_do_financeiro'].includes(
      m.estado_dado,
    ) &&
      (m.lucro_centavos !== null ||
        m.retorno_centavos !== null ||
        m.roi !== null))
  )
    throw new ApiError('invalid_response');
  return {
    lucro: moeda(m.lucro_centavos, true),
    conhecido: moeda(m.lucro_conhecido_centavos, true),
    giro: moeda(m.giro_centavos),
    retorno: moeda(m.retorno_centavos),
    roi: porcentagem(m.roi),
    estado:
      m.estado_dado === 'confirmado' && m.lucro_centavos === '0'
        ? 'Zero confirmado'
        : ESTADOS[m.estado_dado],
    sinal:
      m.lucro_centavos === null || BigInt(m.lucro_centavos) === 0n
        ? ''
        : BigInt(m.lucro_centavos) < 0n
          ? 'perda'
          : 'lucro',
  };
}
export const chaveGrupo = (g: Grupo) => JSON.stringify([g.atribuicao, g.id]);
export const nomeGrupo = (g: Grupo) =>
  g.atribuicao === 'sem_grupo'
    ? 'Sem grupo atribuído'
    : g.atribuicao === 'ambigua'
      ? 'Grupo ambíguo'
      : g.atribuicao === 'nao_resolvida'
        ? 'Grupo não resolvido'
        : g.nome?.trim() || 'Nome do grupo não informado';
export const chaveTipster = (t: Grupo['tipsters'][number]) =>
  JSON.stringify([t.atribuicao, t.id]);
export const nomeTipster = (t: Grupo['tipsters'][number]) =>
  t.atribuicao === 'sem_tipster'
    ? 'Sem tipster atribuído'
    : t.atribuicao === 'nao_resolvido'
      ? 'Tipster não resolvido'
      : t.nome?.trim() || 'Nome do tipster não informado';
export function validarDiario(input: unknown): Diario {
  respostaPublicada(input, SITE_READ_CONTRACT[DIARIO].response);
  const d = input as Diario;
  validarHora(d.snapshot_em);
  validarHora(d.respondido_em);
  d.dias.forEach((p) => {
    if (!diaValido(p.dia)) throw new ApiError('invalid_response');
    apresentarMetricas(p.metricas);
  });
  apresentarMetricas(d.total_periodo);
  apresentarMetricas(d.subtotal_intervalo);
  apresentarMetricas(d.sem_data);
  if (
    d.dias.length !== d.intervalo_devolvido.dias ||
    d.dias.some(
      (p, i) => p.dia !== deslocarDia(d.intervalo_devolvido.inicio!, i),
    )
  )
    throw new ApiError('invalid_response');
  return d;
}
export function validarHierarquia(input: unknown): Hierarquia {
  respostaPublicada(input, SITE_READ_CONTRACT[GRUPOS].response);
  const d = input as Hierarquia;
  validarHora(d.snapshot_em);
  validarHora(d.respondido_em);
  apresentarMetricas(d.total_periodo);
  if (d.total_grupos < 0 || d.total_filhos < 0)
    throw new ApiError('invalid_response');
  for (const g of d.grupos) {
    apresentarMetricas(g.metricas);
    g.tipsters.forEach((t) => apresentarMetricas(t.metricas));
    if (
      g.total_filhos < 0 ||
      g.tipsters.length > g.total_filhos ||
      new Set(g.tipsters.map(chaveTipster)).size !== g.tipsters.length
    )
      throw new ApiError('invalid_response');
  }
  if (new Set(d.grupos.map(chaveGrupo)).size !== d.grupos.length)
    throw new ApiError('invalid_response');
  return d;
}
// Upsert identities/rows only; never add metrics or totals from pages.
export function juntarGrupos(pages: readonly Hierarquia[]): Grupo[] {
  const map = new Map<string, Grupo>();
  const cursors = new Set<string>();
  for (const page of pages) {
    if (
      pages[0] &&
      (JSON.stringify(page.total_periodo) !==
        JSON.stringify(pages[0].total_periodo) ||
        page.total_grupos !== pages[0].total_grupos ||
        page.total_filhos !== pages[0].total_filhos ||
        (page.proximo_cursor && cursors.has(page.proximo_cursor)))
    )
      throw new ApiError('invalid_response');
    if (page.proximo_cursor) cursors.add(page.proximo_cursor);
    for (const group of page.grupos) {
      const key = chaveGrupo(group);
      const before = map.get(key);
      if (
        before &&
        (JSON.stringify(before.metricas) !== JSON.stringify(group.metricas) ||
          before.total_filhos !== group.total_filhos)
      )
        throw new ApiError('invalid_response');
      const children = new Map(
        before?.tipsters.map((t) => [chaveTipster(t), t]),
      );
      group.tipsters.forEach((t) => children.set(chaveTipster(t), t));
      if (children.size > group.total_filhos)
        throw new ApiError('invalid_response');
      map.set(key, { ...group, tipsters: [...children.values()] });
    }
  }
  return [...map.values()];
}
export function seletoresCanonicos(d: Pick<Diario, 'filtros'>) {
  return Object.fromEntries(
    Object.entries(d.filtros)
      .filter(
        ([key, v]) =>
          v !== null &&
          Object.hasOwn(SITE_READ_CONTRACT[DIARIO].query, key) &&
          !(key === 'incluir_apagadas' && d.filtros.visibilidade != null) &&
          !(
            key === 'periodo' &&
            (d.filtros.desde != null || d.filtros.ate != null)
          ),
      )
      .sort(([a], [b]) => a.localeCompare(b)),
  ) as Record<string, string | boolean>;
}
export function validarLegado(input: unknown): PainelLegado {
  respostaPublicada(input, SITE_READ_CONTRACT['/api/v1/painel'].response);
  const d = input as PainelLegado;
  validarHora(d.atualizado_em);
  validarHora(d.respondido_em);
  if (d.evolucao.some((p) => !diaValido(p.periodo_inicio)))
    throw new ApiError('invalid_response');
  return d;
}
export function validarComparacoes(input: unknown): Comparacoes {
  respostaPublicada(
    input,
    SITE_READ_CONTRACT['/api/v1/painel/filtrado'].response,
  );
  const d = input as Comparacoes;
  validarHora(d.snapshot_em);
  validarHora(d.respondido_em);
  return d;
}
