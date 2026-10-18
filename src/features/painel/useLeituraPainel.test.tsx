import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { createSession } from '../../auth/session';
import { sessionContext } from '../../auth/protocol';
import { ProvedorAuth } from '../../auth/ProvedorAuth';
import { ApiError } from '../../api/error';
import { useLeituraPainel } from './useLeituraPainel';

afterEach(() => vi.useRealTimers());
it('never invokes a private read without a session provider', async () => {
  const view = renderHook(() => useLeituraPainel());
  const work = vi.fn();
  await expect(view.result.current.read(work)).rejects.toMatchObject({
    kind: 'cancelled',
  });
  expect(work).not.toHaveBeenCalled();
  view.unmount();
});
it('holds the largest concurrent deadline, blocks new GETs, then releases at the actual deadline', async () => {
  const context = sessionContext({
    usuario_id: 1,
    nome: 'Sandbox',
    email: 'sandbox@example.org',
    session_version: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa:1',
    csrf_token: crypto.randomUUID(),
    refresh_required: false,
    access_expires_at: '2030-01-01T00:00:00Z',
    session_expires_at: '2030-01-02T00:00:00Z',
  });
  const queries = new QueryClient();
  const session = createSession({
    baseUrl: 'http://127.0.0.1:8000',
    queryClient: queries,
    transport: {
      read: async () => context,
      renew: async () => context,
      logout: async () => {},
    },
    exclusive: async (_signal, work) => work(),
  });
  await session.resume();
  vi.useFakeTimers();
  const view = renderHook(() => useLeituraPainel(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <ProvedorAuth service={session}>{children}</ProvedorAuth>
    ),
  });
  try {
    let rejectLong!: (error: unknown) => void,
      rejectShort!: (error: unknown) => void;
    const long = new Promise<never>((_, reject) => {
      rejectLong = reject;
    });
    const short = new Promise<never>((_, reject) => {
      rejectShort = reject;
    });
    const longest = new ApiError('http', {
      status: 503,
      headers: new Headers({ 'Retry-After': '70' }),
    });
    const shorter = new ApiError('http', {
      status: 429,
      headers: new Headers({ 'Retry-After': '1' }),
    });
    const reads = [
      view.result.current.read(() => long),
      view.result.current.read(() => short),
    ];
    const settled = Promise.allSettled(reads);
    await act(async () => {
      rejectLong(longest);
      await Promise.resolve();
      rejectShort(shorter);
      await settled;
    });
    const blocked = vi.fn(async () => 42);
    await expect(view.result.current.read(blocked)).rejects.toBe(longest);
    expect(blocked).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(view.result.current.waiting).toBe(true);
    await expect(view.result.current.read(blocked)).rejects.toBe(longest);
    await act(() => vi.advanceTimersByTimeAsync(68000));
    expect(view.result.current.waiting).toBe(false);
    await expect(view.result.current.read(blocked)).resolves.toBe(42);
    await expect(
      view.result.current.read(async () => {
        throw new Error('Test failure');
      }),
    ).rejects.toThrow('Test failure');
    await expect(
      view.result.current.read(async () => {
        throw new ApiError('http', { status: 500 });
      }),
    ).rejects.toMatchObject({ status: 500 });
  } finally {
    view.unmount();
    session.dispose();
    queries.clear();
  }
});
