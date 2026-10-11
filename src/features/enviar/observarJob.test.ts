import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ApiError } from '../../api/error';
import {
  partialUpload,
  acceptedUpload,
} from '../../../tests/fixtures/api/responses';
import {
  observarJob,
  MAX_JOB_OBSERVATION_MS,
  MAX_JOB_REQUESTS,
  type ObservadorJob,
  type ConsultarJob,
} from './observarJob';
import type { StatusUpload } from './job';

const id = acceptedUpload.job_id;
const pending: StatusUpload = {
  ...partialUpload,
  status: 'pending',
  progress: { ...partialUpload.progress, percent: 0 },
};
const owned: ObservadorJob[] = [];
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  vi.spyOn(Math, 'random').mockReturnValue(0);
});
afterEach(() => {
  owned.splice(0).forEach((observer) => observer.dispose());
  vi.useRealTimers();
  vi.restoreAllMocks();
});
function open(load: ConsultarJob, interval?: number) {
  const observer = observarJob(id, load, interval);
  owned.push(observer);
  const listener = vi.fn();
  const unsubscribe = observer.subscribe(listener);
  return { observer, listener, unsubscribe };
}

it('inicia em 1s, compartilha um loop entre assinantes e encerra no último unmount', async () => {
  const load = vi.fn(async () => pending);
  const { observer, unsubscribe } = open(load);
  const other = observer.subscribe(vi.fn());
  await vi.advanceTimersByTimeAsync(999);
  expect(load).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(load).toHaveBeenCalledTimes(1);
  unsubscribe();
  await vi.advanceTimersByTimeAsync(1000);
  expect(load).toHaveBeenCalledTimes(2);
  other();
  expect(vi.getTimerCount()).toBe(0);
  await vi.advanceTimersByTimeAsync(60_000);
  expect(load).toHaveBeenCalledTimes(2);
});

it('espera resposta antes de agendar outra consulta e ignora retorno tardio após sair', async () => {
  let finish!: (data: StatusUpload) => void;
  const load = vi.fn(
    (receivedId: string, signal: AbortSignal) =>
      new Promise<StatusUpload>((resolve) => {
        expect(receivedId).toBe(id);
        expect(signal.aborted).toBe(false);
        finish = resolve;
      }),
  );
  const { observer, unsubscribe } = open(load);
  await vi.advanceTimersByTimeAsync(8000);
  expect(load).toHaveBeenCalledTimes(1);
  expect(observer.retomar()).toBe(false);
  unsubscribe();
  expect(load.mock.calls[0]![1].aborted).toBe(true);
  finish(partialUpload);
  await vi.advanceTimersByTimeAsync(60_000);
  expect(observer.getSnapshot().dados).toBeUndefined();
  expect(load).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});

it('backoff por estabilidade dobra até 30s e mudança de progresso volta ao intervalo inicial', async () => {
  let response = pending;
  const load = vi.fn(async () => response);
  open(load);
  for (const delay of [1000, 1000, 2000, 4000, 8000, 16000, 30000, 30000]) {
    const before = load.mock.calls.length;
    await vi.advanceTimersByTimeAsync(delay - 1);
    expect(load).toHaveBeenCalledTimes(before);
    await vi.advanceTimersByTimeAsync(1);
    expect(load).toHaveBeenCalledTimes(before + 1);
  }
  response = {
    ...pending,
    status: 'processing',
    progress: { ...pending.progress, percent: 20 },
  };
  await vi.advanceTimersByTimeAsync(30000);
  const count = load.mock.calls.length;
  await vi.advanceTimersByTimeAsync(1000);
  expect(load).toHaveBeenCalledTimes(count + 1);
});

it('respeita configuração com mínimo de 1s e teto de 30s', async () => {
  const fast = vi.fn(async () => pending);
  const slow = vi.fn(async () => pending);
  open(fast, 1);
  open(slow, 2_147_483_647);
  await vi.advanceTimersByTimeAsync(999);
  expect(fast).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(fast).toHaveBeenCalledTimes(1);
  expect(slow).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1000);
  expect(fast).toHaveBeenCalledTimes(2);
  expect(slow).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(29000);
  expect(slow).toHaveBeenCalledTimes(2);
});

it.each(['completed', 'failed'])(
  'estado terminal %s encerra timers sem cancelar processamento remoto',
  async (status) => {
    const load = vi.fn(async () => ({ ...partialUpload, status }));
    const { observer } = open(load);
    await vi.advanceTimersByTimeAsync(1000);
    expect(observer.getSnapshot().fase).toBe('encerrado');
    expect(observer.getSnapshot().resultado).toBe(
      status === 'failed' ? 'falha' : 'parcial',
    );
    expect(observer.retomar()).toBe(false);
    await vi.advanceTimersByTimeAsync(MAX_JOB_OBSERVATION_MS);
    expect(load).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  },
);

it.each([
  [500, 2],
  [503, 4],
  [429, 3],
])(
  'HTTP %s tem no máximo %s consultas e mantém recuperação explícita',
  async (status, total) => {
    const load = vi.fn(async () => {
      throw new ApiError('http', { status });
    });
    const { observer } = open(load);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(load).toHaveBeenCalledTimes(total);
    expect(observer.getSnapshot()).toMatchObject({
      fase: 'interrompido',
      motivo: 'consulta',
      erro: { status },
    });
    expect(vi.getTimerCount()).toBe(0);
    expect(observer.retomar()).toBe(true);
    expect(observer.retomar()).toBe(false);
    await vi.advanceTimersByTimeAsync(1000);
    expect(load).toHaveBeenCalledTimes(total + 1);
  },
);

it.each(['network', 'timeout'] as const)(
  '%s repete só uma leitura',
  async (kind) => {
    const load = vi.fn(async () => {
      throw new ApiError(kind);
    });
    const { observer } = open(load);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(load).toHaveBeenCalledTimes(2);
    expect(observer.getSnapshot().fase).toBe('interrompido');
  },
);

it.each([401, 402, 403, 404, 422])(
  'HTTP %s não repete, não perde o último progresso nem simula novo envio',
  async (status) => {
    const load = vi
      .fn()
      .mockResolvedValueOnce(pending)
      .mockRejectedValue(new ApiError('http', { status }));
    const { observer } = open(load);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(load).toHaveBeenCalledTimes(2);
    expect(observer.getSnapshot().dados?.status).toBe('pending');
    expect(observer.getSnapshot().erro?.status).toBe(status);
    expect(observer.getSnapshot().fase).toBe('interrompido');
  },
);

it('Retry-After governa retry automático e retomada, inclusive prazo acima de 60s', async () => {
  const short = vi
    .fn()
    .mockRejectedValueOnce(
      new ApiError('http', {
        status: 503,
        headers: new Headers({ 'Retry-After': '10' }),
      }),
    )
    .mockResolvedValue(partialUpload);
  open(short);
  await vi.advanceTimersByTimeAsync(10_999);
  expect(short).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1);
  expect(short).toHaveBeenCalledTimes(2);
  const long = vi
    .fn()
    .mockRejectedValueOnce(
      new ApiError('http', {
        status: 429,
        headers: new Headers({ 'Retry-After': '120' }),
      }),
    )
    .mockResolvedValue(partialUpload);
  const { observer, unsubscribe } = open(long);
  await vi.advanceTimersByTimeAsync(1000);
  expect(observer.getSnapshot().fase).toBe('interrompido');
  expect(observer.retomar()).toBe(false);
  unsubscribe();
  observer.subscribe(vi.fn());
  await vi.advanceTimersByTimeAsync(119_999);
  expect(long).toHaveBeenCalledTimes(1);
  expect(observer.retomar()).toBe(false);
  await vi.advanceTimersByTimeAsync(1);
  expect(observer.retomar()).toBe(true);
  await vi.advanceTimersByTimeAsync(1000);
  expect(long).toHaveBeenCalledTimes(2);
});

it('sucesso zera retries; estado desconhecido nunca conclui nem vira retry infinito', async () => {
  const load = vi
    .fn()
    .mockRejectedValueOnce(new ApiError('http', { status: 500 }))
    .mockResolvedValueOnce(pending)
    .mockRejectedValueOnce(new ApiError('http', { status: 500 }))
    .mockResolvedValue({ ...pending, status: 'authorized' });
  const { observer } = open(load);
  await vi.advanceTimersByTimeAsync(20_000);
  expect(load).toHaveBeenCalledTimes(4);
  expect(observer.getSnapshot().resultado).toBeUndefined();
  expect(observer.getSnapshot().erro?.kind).toBe('invalid_response');
  expect(observer.getSnapshot().dados?.status).toBe('pending');
});

it('limite de consultas interrompe só observação; retomada é nova leitura explícita', async () => {
  const load = vi.fn(async () => ({
    ...pending,
    progress: { ...pending.progress, read: load.mock.calls.length },
  }));
  const { observer } = open(load);
  await vi.advanceTimersByTimeAsync((MAX_JOB_REQUESTS + 1) * 1000);
  expect(load).toHaveBeenCalledTimes(MAX_JOB_REQUESTS);
  expect(observer.getSnapshot()).toMatchObject({
    fase: 'interrompido',
    motivo: 'limite',
  });
  expect(vi.getTimerCount()).toBe(0);
  expect(observer.retomar()).toBe(true);
  await vi.advanceTimersByTimeAsync(1000);
  expect(load).toHaveBeenCalledTimes(MAX_JOB_REQUESTS + 1);
});

it('prazo de observação aborta GET pendente e descarta conclusão tardia', async () => {
  let signal!: AbortSignal;
  let finish!: (data: StatusUpload) => void;
  const { observer } = open((_id, current) => {
    signal = current;
    return new Promise((resolve) => {
      finish = resolve;
    });
  });
  await vi.advanceTimersByTimeAsync(MAX_JOB_OBSERVATION_MS);
  expect(signal.aborted).toBe(true);
  finish(partialUpload);
  await vi.advanceTimersByTimeAsync(0);
  expect(observer.getSnapshot()).toMatchObject({
    fase: 'interrompido',
    motivo: 'limite',
  });
  expect(observer.getSnapshot().resultado).toBeUndefined();
});

it('remount consulta job conhecido sem múltiplos loops; período encerrado exige retomada', async () => {
  const load = vi.fn(async () => pending);
  const { observer, unsubscribe } = open(load);
  await vi.advanceTimersByTimeAsync(1000);
  unsubscribe();
  await vi.advanceTimersByTimeAsync(MAX_JOB_OBSERVATION_MS);
  observer.subscribe(vi.fn());
  expect(observer.getSnapshot().motivo).toBe('limite');
  expect(load).toHaveBeenCalledTimes(1);
  expect(observer.retomar()).toBe(true);
  await vi.advanceTimersByTimeAsync(1000);
  expect(load).toHaveBeenCalledTimes(2);
});

it('dispose limpa dados privados e impede uso de referências anteriores', async () => {
  const load = vi.fn(async () => pending);
  const { observer, unsubscribe } = open(load);
  expect(observer.retomar()).toBe(false);
  await vi.advanceTimersByTimeAsync(1000);
  observer.dispose();
  expect(observer.getSnapshot()).toEqual({ fase: 'inativo' });
  expect(observer.retomar()).toBe(false);
  unsubscribe();
  observer.subscribe(vi.fn());
  await vi.advanceTimersByTimeAsync(60_000);
  expect(load).toHaveBeenCalledTimes(1);
});

it('erro inesperado não revela texto e cancelamento não entra em retry', async () => {
  for (const error of [
    new Error('PRIVATE_WORKER_ERROR'),
    new ApiError('cancelled'),
  ]) {
    const load = vi.fn().mockRejectedValue(error);
    const { observer } = open(load);
    await vi.advanceTimersByTimeAsync(5000);
    expect(load).toHaveBeenCalledTimes(1);
    expect(observer.getSnapshot().erro?.message).not.toContain('PRIVATE');
  }
});
