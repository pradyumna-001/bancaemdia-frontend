import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { getApiClient, type createApiClient } from '../../api/client';
import { ApiError } from '../../api/error';
import { useAuth } from '../../auth/ProvedorAuth';
import { MAX_AUTOMATIC_WAIT_MS } from '../../app/queryClient';
import { useRetryAfter } from '../../lib/useRetryAfter';
import { operationNeedsWrite, type AccessOperation } from './operations';
import type { AccessController } from './controller';

function useAccessState(
  controller: AccessController,
  client: ReturnType<typeof createApiClient>,
) {
  const auth = useAuth();
  const revision = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  const authenticated = auth?.state.phase === 'authenticated';
  const query = useQuery({
    queryKey: controller.key(),
    queryFn: ({ signal }) => controller.consult(client, signal),
    enabled: (current) =>
      !!authenticated &&
      !(
        current.state.error instanceof ApiError &&
        (current.state.error.retryAfterMs ?? 0) > MAX_AUTOMATIC_WAIT_MS
      ),
    retryOnMount: false,
    refetchOnWindowFocus: (current) =>
      !(
        current.state.error instanceof ApiError &&
        (current.state.error.retryAfterMs ?? 0) > MAX_AUTOMATIC_WAIT_MS
      ),
    refetchOnReconnect: false,
  });
  const waiting = useRetryAfter(query.error);
  const phase =
    !authenticated || query.isError
      ? 'unknown'
      : query.isFetching || query.isPending
        ? revision && !query.data
          ? 'read-only'
          : 'checking'
        : query.data.access === 'FULL_WRITE'
          ? 'write'
          : 'read-only';
  return {
    phase,
    status:
      authenticated && !query.isError && !query.isFetching
        ? query.data
        : undefined,
    error: query.error,
    checking: query.isFetching,
    waiting,
    refresh: () => {
      if (!waiting && !query.isFetching) void query.refetch();
    },
    can: (operation: AccessOperation) =>
      !!authenticated && (!operationNeedsWrite(operation) || phase === 'write'),
    run: <T,>(operation: AccessOperation, work: () => Promise<T>) =>
      controller.run(client, operation, work),
  } as const;
}
type AccessState = ReturnType<typeof useAccessState>;
const Access = createContext<AccessState | undefined>(undefined);
export function ProvedorAcesso({
  controller,
  children,
  client = getApiClient(),
}: {
  controller: AccessController;
  children: ReactNode;
  client?: ReturnType<typeof createApiClient>;
}) {
  const state = useAccessState(controller, client);
  return <Access.Provider value={state}>{children}</Access.Provider>;
}
export function useAcesso() {
  return useContext(Access);
}
