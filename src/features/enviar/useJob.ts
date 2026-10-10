import { useMemo, useSyncExternalStore } from 'react';
import { useAuth } from '../../auth/ProvedorAuth';
import type { SessionService } from '../../auth/session';
import { getApiClient } from '../../api/client';
import { ApiError } from '../../api/error';
import { getConfig } from '../../lib/config';
import { jobIdValido } from './job';
import {
  observarJob,
  type ObservadorJob,
  type ObservacaoJob,
} from './observarJob';

const inactiveState: ObservacaoJob = Object.freeze({ fase: 'inativo' });
const inactive: ObservadorJob = {
  getSnapshot: () => inactiveState,
  subscribe: () => () => {},
  retomar: () => false,
  dispose: () => {},
};
const pools = new WeakMap<SessionService, Map<string, ObservadorJob>>();

function observerFor(
  service: SessionService,
  id: string,
  epoch: number,
): ObservadorJob {
  let pool = pools.get(service);
  if (!pool) {
    pool = new Map();
    pools.set(service, pool);
    const owned = pool;
    service.registerCleanup(() => {
      owned.forEach((observer) => observer.dispose());
      owned.clear();
    });
  }
  const key = `${epoch}:${id}`;
  let observer = pool.get(key);
  if (!observer) {
    observer = observarJob(
      id,
      (jobId, signal) =>
        service.read(async () => {
          const { data } = await getApiClient().GET('/api/v1/upload/{job_id}', {
            params: { path: { job_id: jobId } },
            signal,
          });
          if (!data) throw new ApiError('invalid_response');
          return data;
        }),
      getConfig().uploadPollMs,
    );
    pool.set(key, observer);
  }
  return observer;
}

// Caller supplies the known UUID (e.g. restored from URL). Never follows status_url or uploads.
export function useJob(jobId?: string | null) {
  const auth = useAuth();
  const id = jobIdValido(jobId);
  const service = auth?.service;
  const phase = auth?.state.phase;
  const epoch = auth?.state.privateEpoch;
  const observer = useMemo(
    () =>
      service && phase === 'authenticated' && id
        ? observerFor(service, id, epoch ?? 0)
        : inactive,
    [service, phase, epoch, id],
  );
  const state = useSyncExternalStore(
    observer.subscribe,
    observer.getSnapshot,
    observer.getSnapshot,
  );
  return { ...state, retomar: observer.retomar };
}
