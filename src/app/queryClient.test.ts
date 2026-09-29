import { afterEach, expect, it, vi } from 'vitest';
import { atrasoConsulta, createAppQueryClient } from './queryClient';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it.each([
  ['apostas', 30_000],
  ['painel', 60_000],
  ['metricas', 60_000],
  ['revisao', 0],
] as const)(
  'usa frescor de %s para decidir se consulta novamente',
  async (resource, staleTime) => {
    vi.useFakeTimers();
    const client = createAppQueryClient();
    const queryFn = vi.fn().mockResolvedValue('resposta de teste');
    const options = { queryKey: [resource, { casa: 'a' }], queryFn };
    try {
      await client.fetchQuery(options);
      if (staleTime > 0) {
        await vi.advanceTimersByTimeAsync(staleTime - 1);
        await client.fetchQuery(options);
        expect(queryFn).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(1);
      }
      await client.fetchQuery(options);
      expect(queryFn).toHaveBeenCalledTimes(2);
    } finally {
      client.clear();
    }
  },
);

it.each([
  [500, 2],
  [503, 4],
  [401, 1],
  [403, 1],
  [404, 1],
  [409, 1],
  [413, 1],
  [422, 1],
  [429, 1],
  [undefined, 1],
])(
  'limita tentativas reais de consulta no status %s a %s',
  async (status, attempts) => {
    vi.useFakeTimers();
    const client = createAppQueryClient();
    const error = Object.assign(new Error('falha de teste'), { status });
    const queryFn = vi.fn().mockRejectedValue(error);
    try {
      const result = expect(
        client.fetchQuery({ queryKey: ['apostas'], queryFn }),
      ).rejects.toBe(error);
      await vi.runAllTimersAsync();
      await result;
      expect(queryFn).toHaveBeenCalledTimes(attempts);
    } finally {
      client.clear();
    }
  },
);

it('não repete mutations mesmo em 503', async () => {
  const client = createAppQueryClient();
  const mutationFn = vi
    .fn()
    .mockRejectedValue(Object.assign(new Error('erro'), { status: 503 }));
  try {
    const mutation = client.getMutationCache().build(client, { mutationFn });
    await expect(mutation.execute(undefined)).rejects.toThrow('erro');
    expect(mutationFn).toHaveBeenCalledTimes(1);
  } finally {
    client.clear();
  }
});

it('aplica atraso exponencial, jitter limitado e teto', () => {
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
  expect([0, 1, 2].map(atrasoConsulta)).toEqual([1125, 2125, 4125]);
  expect(atrasoConsulta(20)).toBe(30_000);
});
