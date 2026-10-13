import { useEffect, useState } from 'react';
import { ApiError } from '../api/error';

// Share this state with every trigger for the affected resource; independent reads stay free.
export function useRetryAfter(error: unknown): boolean {
  const deadline =
    error instanceof ApiError ? error.retryAfterDeadline : undefined;
  const [expiredFor, setExpiredFor] = useState<unknown>(() =>
    deadline !== undefined && deadline <= Date.now() ? error : Symbol(),
  );
  const waiting = deadline !== undefined && expiredFor !== error;
  useEffect(() => {
    if (deadline === undefined) return;
    const tick = () => {
      const remaining = deadline - Date.now();
      if (remaining > 0) timer = setTimeout(tick, Math.min(remaining, 60_000));
      else setExpiredFor(() => error);
    };
    let timer = setTimeout(
      tick,
      Math.max(0, Math.min(deadline - Date.now(), 60_000)),
    );
    return () => clearTimeout(timer);
  }, [error, deadline]);
  return waiting;
}
