import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { ApiError } from '../../api/error';
import { useOperacao } from './useOperacao';

let allowed = true;
let current = true;
let auth = true;
let epoch = 1;
let clean: (() => void) | undefined;
const workAccess = vi.fn(
  async (_operation: unknown, work: () => Promise<unknown>) => work(),
);
vi.mock('../../auth/ProvedorAuth', () => ({
  useAuth: () =>
    auth
      ? {
          service: {
            capture: () => ({ isCurrent: () => current }),
            getSnapshot: () => ({ privateEpoch: epoch }),
            registerCleanup: (fn: () => void) => {
              clean = fn;
              return () => {
                clean = undefined;
              };
            },
          },
        }
      : undefined,
}));
vi.mock('../acesso/ProvedorAcesso', () => ({
  useAcesso: () => ({ can: () => allowed, run: workAccess }),
}));
beforeEach(() => {
  allowed = true;
  current = true;
  auth = true;
  epoch = 1;
  clean = undefined;
  workAccess.mockImplementation(async (_op, work) => work());
});
const op = 'PUT /api/v1/planilhas/fontes/{source_id}' as const;
it('não inicia escrita sem autorização ou contexto atual', async () => {
  const { result, rerender } = renderHook(() => useOperacao());
  const work = vi.fn(async () => 1);
  allowed = false;
  await act(async () => {
    expect(await result.current.run(op, work)).toBeUndefined();
  });
  allowed = true;
  auth = false;
  rerender();
  await act(async () => {
    expect(await result.current.run(op, work)).toBeUndefined();
  });
  auth = true;
  rerender();
  current = false;
  await act(async () => {
    expect(await result.current.run(op, work)).toBeUndefined();
  });
  expect(work).not.toHaveBeenCalled();
});
it('suprime toques concorrentes e aborta na saída', async () => {
  let resolve!: (value: number) => void;
  const { result, unmount } = renderHook(() => useOperacao());
  const work = vi.fn(
    () =>
      new Promise<number>((done) => {
        resolve = done;
      }),
  );
  let pending: Promise<number | undefined>;
  act(() => {
    pending = result.current.run(op, work);
  });
  await act(async () => {
    expect(await result.current.run(op, work)).toBeUndefined();
  });
  expect(work).toHaveBeenCalledTimes(1);
  unmount();
  resolve(1);
  expect(await pending!).toBeUndefined();
});
it('nova versão durante parsing torna resultado incerto e exige consulta', async () => {
  const { result } = renderHook(() => useOperacao());
  await act(async () => {
    await result.current.run(op, async () => {
      current = false;
      return 1;
    });
  });
  expect(result.current.uncertain).toBe(true);
  expect(result.current.error).toBeInstanceOf(ApiError);
  current = true;
  const work = vi.fn(async () => 2);
  await act(async () => {
    await result.current.run(op, work);
  });
  expect(work).not.toHaveBeenCalled();
  act(() => result.current.reconciled());
  await act(async () => {
    expect(await result.current.run(op, work)).toBe(2);
  });
});
it('exceção imprevista não apresenta sucesso nem repete a intenção', async () => {
  const { result } = renderHook(() => useOperacao());
  await act(async () => {
    await result.current.run(op, async () => {
      throw new Error('private');
    });
  });
  expect(result.current.uncertain).toBe(true);
  expect(String(result.current.error)).not.toContain('private');
  act(() => result.current.cancel());
  expect(result.current.uncertain).toBe(false);
});
it('limpeza de sessão e mudança de epoch descartam retorno antigo', async () => {
  const { result } = renderHook(() => useOperacao());
  await act(async () => {
    expect(
      await result.current.run(op, async () => {
        epoch++;
        return 1;
      }),
    ).toBeUndefined();
  });
  expect(result.current.error).toBeUndefined();
  act(() => clean?.());
  expect(result.current.busy).toBe(false);
});
it('Retry-After impede gesto antecipado sem replay', async () => {
  const { result } = renderHook(() => useOperacao());
  await act(async () => {
    await result.current.run(op, async () => {
      throw new ApiError('http', {
        status: 429,
        headers: new Headers({ 'Retry-After': '61' }),
        mutation: true,
      });
    });
  });
  expect(result.current.waiting).toBe(true);
  const work = vi.fn(async () => 1);
  await act(async () => {
    await result.current.run(op, work, true);
  });
  expect(work).not.toHaveBeenCalled();
});
