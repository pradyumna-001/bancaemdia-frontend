import { ApiError } from '../../api/error';
import { atrasoConsulta, retryConsulta } from '../../app/queryClient';
import {
  projetarJob,
  resultadoJob,
  etapaJob,
  type DadosJob,
  type ResultadoJob,
  type StatusUpload,
} from './job';

export const MAX_JOB_REQUESTS = 300;
export const MAX_JOB_OBSERVATION_MS = 15 * 60_000;
export const MAX_JOB_INTERVAL_MS = 30_000;
export type ObservacaoJob = Readonly<{
  fase: 'inativo' | 'observando' | 'encerrado' | 'interrompido';
  dados?: DadosJob;
  etapa?: string;
  resultado?: ResultadoJob;
  erro?: ApiError;
  motivo?: 'limite' | 'consulta';
  retryAt?: number;
}>;
export type ConsultarJob = (
  id: string,
  signal: AbortSignal,
) => Promise<StatusUpload>;

// One scheduler per known job; cancellation affects GET observation only.
export function observarJob(
  id: string,
  consultar: ConsultarJob,
  intervalMs = 1000,
) {
  const interval = Math.min(Math.max(intervalMs, 1000), MAX_JOB_INTERVAL_MS);
  const listeners = new Set<() => void>();
  let state: ObservacaoJob = Object.freeze({ fase: 'inativo' });
  let timer: ReturnType<typeof setTimeout> | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;
  let generation = 0;
  let observing = false;
  let disposed = false;
  let startedAt: number | undefined;
  let requests = 0;
  let failures = 0;
  let unchanged = 0;
  let signature: string | undefined;
  const publish = (next: ObservacaoJob) => {
    state = Object.freeze(next);
    listeners.forEach((listener) => listener());
  };
  const stop = () => {
    observing = false;
    generation++;
    clearTimeout(timer);
    clearTimeout(deadline);
    timer = deadline = undefined;
    controller?.abort();
    controller = undefined;
  };
  const limit = () => {
    stop();
    publish({ ...state, fase: 'interrompido', motivo: 'limite' });
  };
  const schedule = (delay: number) => {
    if (!observing || disposed || !listeners.size) return;
    const mine = generation;
    timer = setTimeout(() => {
      timer = undefined;
      if (observing && mine === generation) void read();
    }, delay);
  };
  const read = async () => {
    if (requests >= MAX_JOB_REQUESTS) return limit();
    const mine = generation;
    const request = new AbortController();
    controller = request;
    requests++;
    try {
      const response = await consultar(id, request.signal);
      if (request.signal.aborted || mine !== generation || !observing) return;
      const dados = projetarJob(response, id);
      failures = 0;
      const nextSignature = JSON.stringify(dados);
      unchanged = nextSignature === signature ? Math.min(unchanged + 1, 5) : 0;
      signature = nextSignature;
      const resultado = resultadoJob(dados);
      if (resultado) stop();
      publish({
        fase: resultado ? 'encerrado' : 'observando',
        dados,
        etapa: etapaJob(dados),
        resultado,
      });
      if (!resultado)
        schedule(Math.min(interval * 2 ** unchanged, MAX_JOB_INTERVAL_MS));
    } catch (error) {
      if (request.signal.aborted || mine !== generation || !observing) return;
      const safe =
        error instanceof ApiError ? error : new ApiError('invalid_response');
      const retryAt = Date.now() + (safe.retryAfterMs ?? 0);
      const repeat = retryConsulta(failures, safe);
      if (!repeat) stop();
      publish({
        ...state,
        fase: repeat ? 'observando' : 'interrompido',
        erro: safe,
        motivo: 'consulta',
        retryAt,
      });
      if (repeat) schedule(atrasoConsulta(failures++, safe));
    } finally {
      if (controller === request) controller = undefined;
    }
  };
  const start = () => {
    if (disposed || observing || state.fase === 'encerrado' || !listeners.size)
      return;
    startedAt ??= Date.now();
    const remaining = MAX_JOB_OBSERVATION_MS - (Date.now() - startedAt);
    if (remaining <= 0 || requests >= MAX_JOB_REQUESTS) return limit();
    observing = true;
    const mine = generation;
    deadline = setTimeout(() => {
      if (observing && mine === generation) limit();
    }, remaining);
    publish({ ...state, fase: 'observando' });
    schedule(Math.max(1000, (state.retryAt ?? 0) - Date.now()));
  };
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      if (listeners.size === 1 && state.fase !== 'interrompido') start();
      return () => {
        listeners.delete(listener);
        if (!listeners.size) stop();
      };
    },
    retomar: () => {
      if (
        disposed ||
        observing ||
        !listeners.size ||
        state.fase === 'encerrado' ||
        Date.now() < (state.retryAt ?? 0)
      )
        return false;
      startedAt = undefined;
      requests = failures = unchanged = 0;
      publish({
        ...state,
        fase: 'inativo',
        erro: undefined,
        motivo: undefined,
      });
      start();
      return true;
    },
    dispose: () => {
      disposed = true;
      stop();
      publish({ fase: 'inativo' }); // Clear private data synchronously on session change/logout.
      listeners.clear();
    },
  };
}
export type ObservadorJob = ReturnType<typeof observarJob>;
