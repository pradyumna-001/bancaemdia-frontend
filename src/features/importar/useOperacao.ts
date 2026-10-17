import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../auth/ProvedorAuth';
import { useAcesso } from '../acesso/ProvedorAcesso';
import type { AccessOperation } from '../acesso/operations';
import { ApiError } from '../../api/error';
import { useRetryAfter } from '../../lib/useRetryAfter';

export function useOperacao() {
  const auth = useAuth();
  const access = useAcesso();
  const controller = useRef<AbortController>();
  const alive = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [uncertain, setUncertain] = useState(false);
  const waiting = useRetryAfter(error);
  const cancel = useCallback(() => {
    controller.current?.abort();
    setError(undefined);
    setUncertain(false);
    setBusy(false);
  }, []);
  useEffect(() => {
    alive.current = true;
    const clean = () => {
      controller.current?.abort();
      setError(undefined);
      setUncertain(false);
      setBusy(false);
    };
    const unregister = auth?.service.registerCleanup(clean);
    return () => {
      alive.current = false;
      controller.current?.abort();
      unregister?.();
    };
  }, [auth?.service]);
  async function run<T>(
    operation: AccessOperation,
    work: (signal: AbortSignal) => Promise<T>,
    explicitReplay = false,
  ): Promise<T | undefined> {
    if (
      controller.current ||
      waiting ||
      (uncertain && !explicitReplay) ||
      !access?.can(operation)
    )
      return;
    const service = auth?.service;
    const scope = service?.capture();
    if (!service || !scope?.isCurrent()) return;
    const epoch = service.getSnapshot().privateEpoch;
    const request = new AbortController();
    controller.current = request;
    const current = () =>
      alive.current &&
      !request.signal.aborted &&
      service.getSnapshot().privateEpoch === epoch;
    setBusy(true);
    setError(undefined);
    try {
      const result = await access.run(operation, () => work(request.signal));
      if (!current()) return;
      if (!scope.isCurrent())
        throw new ApiError('cancelled', { mutation: true });
      setUncertain(false);
      return result;
    } catch (cause) {
      if (current()) {
        const safe = !scope.isCurrent()
          ? new ApiError('cancelled', { mutation: true })
          : cause instanceof ApiError
            ? cause.kind === 'invalid_response'
              ? new ApiError('invalid_response', { mutation: true })
              : cause
            : new ApiError('invalid_response', { mutation: true });
        setError(safe);
        setUncertain(safe.outcomeUnknown || [409, 410].includes(safe.status));
      }
    } finally {
      if (controller.current === request) controller.current = undefined;
      if (alive.current) setBusy(false);
    }
  }
  function reconciled() {
    setUncertain(false);
    setError(undefined);
  }
  return {
    run,
    busy,
    error,
    waiting,
    uncertain,
    reconciled,
    cancel,
    can: (operation: AccessOperation) => !!access?.can(operation),
  };
}
