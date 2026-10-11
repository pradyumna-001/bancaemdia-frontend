import type { components } from '../../api/schema';
import { ApiError } from '../../api/error';
import { objeto, respostaPublicada, type Regra } from '../../api/readContract';
import {
  moeda,
  odd,
  porcentagem,
  dataHora,
  NAO_INFORMADO,
} from '../../lib/format';
import { rotuloEstado } from '../../lib/termos';

export type Aposta = components['schemas']['BetResponse'];
export type PaginaApostas = components['schemas']['BetsPageResponse'];
export const texto = (value: string | null | undefined) =>
  value?.trim() || NAO_INFORMADO;

export function projetarAposta(item: Aposta) {
  try {
    return {
      evento: texto(item.evento),
      casa: texto(item.casa),
      descricao: texto(item.descricao),
      mercado: texto(item.mercado),
      estado: rotuloEstado(item.estado),
      valor: moeda(item.valor_aposta_centavos),
      lucro: moeda(item.lucro_centavos, true),
      retorno: moeda(item.retorno_centavos),
      odd: odd(item.odd),
      data: dataHora(item.data_aposta, 'America/Sao_Paulo'),
      jogo: dataHora(item.data_jogo, 'America/Sao_Paulo'),
      conta: item.conta_contexto
        ? texto(item.conta_contexto.apelido)
        : item.conta_atribuicao === 'ASSIGNED'
          ? 'Nome da conta não informado'
          : 'Conta não atribuída',
      titular: texto(item.conta_contexto?.titular?.nome),
      banca: texto(item.banca_contexto?.nome),
      origem:
        item.origem === 'manual'
          ? 'Manual'
          : item.origem === 'telegram'
            ? 'Telegram'
            : item.origem === 'extensao'
              ? 'Coleta'
              : texto(item.origem),
    };
  } catch {
    throw new ApiError('invalid_response');
  }
}

export function validarPagina(
  page: PaginaApostas | undefined,
  rule: Regra | undefined,
  expected: number,
  size: number,
): PaginaApostas {
  respostaPublicada(page, rule);
  if (
    !page ||
    page.pagination.page !== expected ||
    page.pagination.page_size !== size ||
    page.data.length > size ||
    page.pagination.total < 0 ||
    page.data.some((item) => !item.chave.trim())
  )
    throw new ApiError('invalid_response');
  page.data.forEach(projetarAposta);
  return page;
}

// Deduplication changes presentation/position only; no totals, money or filters are derived.
export function juntarPaginas(pages: readonly PaginaApostas[]): Aposta[] {
  const rows = new Map<string, Aposta>();
  pages.forEach((page) =>
    page.data.forEach((item) => rows.set(item.chave, item)),
  );
  return [...rows.values()];
}

export function proximaPagina(page: PaginaApostas): number | undefined {
  return page.data.length &&
    page.pagination.page * page.pagination.page_size < page.pagination.total
    ? page.pagination.page + 1
    : undefined;
}

export function resumoApresentacao(value: unknown, rule: Regra | undefined) {
  const root = respostaPublicada(value, rule);
  const summary = objeto(root.resumo);
  const amount = (key: string) => {
    const v = summary[key];
    if (v === null || typeof v === 'number' || typeof v === 'string')
      return moeda(v);
    throw new ApiError('invalid_response');
  };
  if (
    typeof summary.total_apostas !== 'number' ||
    !Number.isSafeInteger(summary.total_apostas) ||
    summary.total_apostas < 0 ||
    (summary.roi !== null && typeof summary.roi !== 'string')
  )
    throw new ApiError('invalid_response');
  try {
    return {
      total: summary.total_apostas,
      lucro: amount('lucro_centavos'),
      giro: amount('giro_centavos'),
      roi: porcentagem(summary.roi),
      instante: dataHora(
        typeof root.snapshot_em === 'string' ? root.snapshot_em : null,
        'America/Sao_Paulo',
      ),
    };
  } catch {
    throw new ApiError('invalid_response');
  }
}
