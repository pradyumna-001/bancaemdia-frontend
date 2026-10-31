import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ApiError } from '../api/error';
import { useRetryAfter } from './useRetryAfter';
afterEach(() => vi.useRealTimers());
it('desmontar/remontar a tela não reinicia o prazo manual do servidor', async () => {
  vi.useFakeTimers();
  const error = new ApiError('http', {
    status: 429,
    headers: new Headers({ 'Retry-After': '120' }),
  });
  const first = renderHook(() => useRetryAfter(error));
  await act(() => vi.advanceTimersByTimeAsync(90_000));
  first.unmount();
  const second = renderHook(() => useRetryAfter(error));
  expect(second.result.current).toBe(true);
  await act(() => vi.advanceTimersByTimeAsync(30_000));
  expect(second.result.current).toBe(false);
  second.unmount();
  expect(renderHook(() => useRetryAfter(error)).result.current).toBe(false);
});
it('prazo longo usa timers finitos e um novo erro renova só seu próprio prazo', async () => {
  vi.useFakeTimers();
  const error = new ApiError('http', {
    status: 429,
    headers: new Headers({ 'Retry-After': '120' }),
  });
  const { result, rerender, unmount } = renderHook(
    ({ failure }: { failure: unknown }) => useRetryAfter(failure),
    { initialProps: { failure: error as unknown } },
  );
  expect(result.current).toBe(true);
  await act(() => vi.advanceTimersByTimeAsync(60_000));
  expect(result.current).toBe(true);
  await act(() => vi.advanceTimersByTimeAsync(60_000));
  expect(result.current).toBe(false);
  rerender({
    failure: new ApiError('http', {
      status: 503,
      headers: new Headers({ 'Retry-After': '1' }),
    }),
  });
  expect(result.current).toBe(true);
  await act(() => vi.advanceTimersByTimeAsync(1000));
  expect(result.current).toBe(false);
  rerender({ failure: null });
  expect(result.current).toBe(false);
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});
