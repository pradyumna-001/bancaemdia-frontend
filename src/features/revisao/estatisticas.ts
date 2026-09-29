import type { paths } from '../../api/schema';

export type EstatisticasRevisao =
  paths['/api/v1/revisao/stats']['get']['responses'][200]['content']['application/json'];
export type ConsultarRevisao = () => Promise<EstatisticasRevisao>;
export const CHAVE_REVISAO = ['revisao', 'stats'] as const;

// Mock transitório da #6. O cliente autenticado da #10 substituirá esta função.
// Não inicia requests sem transporte de sessão definido.
export const revisaoSimuladaVazia: ConsultarRevisao = async () => ({
  total: 0,
  por_motivo: {},
  mais_antiga_em: null,
  idade_maxima_segundos: 0,
});

export function validarTotalRevisao(data: EstatisticasRevisao): number {
  if (!Number.isSafeInteger(data.total) || data.total < 0) {
    throw new Error('Não foi possível consultar a fila de revisão.');
  }
  return data.total;
}

export function mensagemFalhaRevisao(error: unknown): string {
  const status =
    typeof error === 'object' && error !== null && 'status' in error
      ? error.status
      : undefined;
  if (status === 429)
    return 'Muitas consultas à fila de revisão. Aguarde um pouco antes de tentar novamente.';
  if (status === 503)
    return 'A consulta da fila de revisão está temporariamente indisponível. Tente novamente em instantes.';
  return 'Não foi possível atualizar a fila de revisão.';
}
