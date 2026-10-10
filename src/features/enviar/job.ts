import { ApiError } from '../../api/error';
import type { components } from '../../api/schema';

export type StatusUpload = components['schemas']['UploadStatusResponse'];
type Progresso = StatusUpload['progress'];
export type DadosJob = Readonly<
  Pick<
    StatusUpload,
    'job_id' | 'status' | 'total_messages' | 'bets_processed' | 'bets_failed'
  > & {
    progress: Readonly<
      Omit<Progresso, 'percent'> & Partial<Pick<Progresso, 'percent'>>
    >;
  }
>;
export type ResultadoJob = 'completo' | 'parcial' | 'vazio' | 'falha';

// The wire schema publishes string; these four values are constrained in the API's model.
const ETAPAS: Readonly<Record<string, string>> = Object.freeze({
  pending: 'Na fila',
  processing: 'Processando',
  completed: 'Processamento concluído',
  failed: 'Não foi possível concluir o processamento',
});

export function jobIdValido(
  value: string | null | undefined,
): string | undefined {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
    ? value.toLowerCase()
    : undefined;
}

function contagem(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

export function projetarJob(data: StatusUpload, expectedId: string): DadosJob {
  const progress = data?.progress;
  if (
    !data ||
    jobIdValido(data.job_id) !== expectedId ||
    !Object.hasOwn(ETAPAS, data.status) ||
    !progress ||
    ![
      data.total_messages,
      data.bets_processed,
      data.bets_failed,
      progress.total,
      progress.pending,
      progress.read,
      progress.failed,
      progress.ignored,
      progress.over_limit,
    ].every(contagem) ||
    (progress.percent != null &&
      (!Number.isFinite(progress.percent) ||
        progress.percent < 0 ||
        progress.percent > 100))
  )
    throw new ApiError('invalid_response');
  // A missing percentage is unknown, even for a completed job. Never derive it from counts.
  const projectedProgress = {
    total: progress.total,
    pending: progress.pending,
    read: progress.read,
    failed: progress.failed,
    ignored: progress.ignored,
    over_limit: progress.over_limit,
    ...(progress.percent == null ? {} : { percent: progress.percent }),
  };
  // Costs, estimates and arbitrary worker error text never become presentation data.
  return Object.freeze({
    job_id: expectedId,
    status: data.status,
    total_messages: data.total_messages,
    bets_processed: data.bets_processed,
    bets_failed: data.bets_failed,
    progress: Object.freeze(projectedProgress),
  });
}

export function etapaJob(data: DadosJob): string {
  return ETAPAS[data.status]!; // projetarJob refuses unknown states.
}

export function resultadoJob(data: DadosJob): ResultadoJob | undefined {
  if (data.status === 'failed') return 'falha';
  if (data.status !== 'completed') return undefined;
  if (
    data.bets_failed > 0 ||
    data.progress.failed > 0 ||
    data.progress.over_limit > 0
  )
    return 'parcial';
  return data.bets_processed === 0 ? 'vazio' : 'completo';
}
