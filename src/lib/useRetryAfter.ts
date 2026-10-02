import { useEffect, useState } from 'react';
import { ApiError } from '../api/error';

// Share this state with every trigger for the affected resource; independent reads stay free.
export function useRetryAfter(error: unknown): boolean {
  const delay = error instanceof ApiError ? error.retryAfterMs : undefined;
  const [expiredFor, setExpiredFor] = useState<unknown>(() => Symbol());
  const waiting = !!delay && expiredFor !== error;
  useEffect(() => {
    if (!delay) return;
    const deadline = Date.now() + delay;
    const tick = () => {
      const remaining = deadline - Date.now();
      if (remaining > 0) timer = setTimeout(tick, Math.min(remaining, 60_000));
      else setExpiredFor(() => error);
    };
    let timer = setTimeout(tick, Math.min(delay, 60_000));
    return () => clearTimeout(timer);
  }, [error, delay]);
  return waiting;
}
