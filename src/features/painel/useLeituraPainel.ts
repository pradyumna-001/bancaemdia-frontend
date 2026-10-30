import { useCallback, useRef, useState } from 'react';
import { useAuth } from '../../auth/ProvedorAuth';
import { ApiError } from '../../api/error';
import { useRetryAfter } from '../../lib/useRetryAfter';

// The deadline belongs to the page/session, not to a filter or a child query.
export function useLeituraPainel() {
  const auth = useAuth();
  const service = auth?.service;
  const embargo = useRef<{ deadline: number; error?: ApiError }>({
    deadline: 0,
  });
  const [error, setError] = useState<ApiError>();
  const waiting = useRetryAfter(error);
  const read = useCallback(
    async <T>(work: () => Promise<T>): Promise<T> => {
      if (embargo.current.deadline > Date.now()) throw embargo.current.error;
      if (!service) throw new ApiError('cancelled');
      try {
        return await service.read(work);
      } catch (e) {
        if (e instanceof ApiError && e.retryAfterMs) {
          embargo.current = { deadline: e.retryAfterDeadline!, error: e };
          setError(e);
        }
        throw e;
      }
    },
    [service],
  );
  return { read, waiting };
}
