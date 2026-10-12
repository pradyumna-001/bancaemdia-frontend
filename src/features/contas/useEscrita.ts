import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/ProvedorAuth';
import { useAcesso } from '../acesso/ProvedorAcesso';
import type { AccessOperation } from '../acesso/operations';
import { ApiError } from '../../api/error';
import { useRetryAfter } from '../../lib/useRetryAfter';
import type { ErrorField } from '../../components/ErroApi';

export function useEscrita() {
  const auth = useAuth();
  const access = useAcesso();
  const queries = useQueryClient();
  const active = useRef<AbortController>();
  const alive = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [message, setMessage] = useState('');
  const [fields, setFields] = useState<readonly ErrorField[]>([]);
  const waiting = useRetryAfter(error);
  const unknown = error instanceof ApiError && error.outcomeUnknown;
  useEffect(() => {
    alive.current = true;
    const clean = () => {
      active.current?.abort();
      setError(undefined);
      setMessage('');
    };
    const unregister = auth?.service.registerCleanup(clean);
    return () => {
      alive.current = false;
      active.current?.abort();
      unregister?.();
    };
  }, [auth?.service]);
  async function run(
    operation: AccessOperation,
    work: (signal: AbortSignal) => Promise<unknown>,
    success: string,
    mappedFields: readonly ErrorField[] = [],
  ) {
    if (active.current || waiting || unknown || !access?.can(operation))
      return false;
    const scope = auth?.service.capture();
    if (!scope?.isCurrent()) return false;
    const epoch = auth!.service.getSnapshot().privateEpoch;
    const current = () =>
      alive.current && auth!.service.getSnapshot().privateEpoch === epoch;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setError(undefined);
    setMessage('');
    setFields(mappedFields);
    try {
      await access.run(operation, () => work(controller.signal));
      if (!current() || controller.signal.aborted) return false;
      if (!scope.isCurrent())
        throw new ApiError('cancelled', { mutation: true });
      setMessage(success);
      await queries.invalidateQueries({ queryKey: ['contas'] });
      return true;
    } catch (cause) {
      if (current() && !controller.signal.aborted)
        setError(
          cause instanceof ApiError
            ? cause
            : new ApiError('invalid_response', { mutation: true }),
        );
      return false;
    } finally {
      if (active.current === controller) active.current = undefined;
      if (current()) setBusy(false);
    }
  }
  // This is an explicit GET reconciliation, never a replay of the write.
  async function reconcile() {
    if (busy || waiting) return;
    const scope = auth?.service.capture();
    if (!scope?.isCurrent()) return;
    setBusy(true);
    try {
      await queries.resetQueries(
        { queryKey: ['contas'] },
        { throwOnError: true },
      );
      if (alive.current && scope.isCurrent()) {
        setError(undefined);
        setMessage('Confira os dados consultados antes de uma nova alteração.');
      }
    } catch {
      // Keep the uncertain write blocked when its state could not be consulted.
      if (alive.current && scope.isCurrent())
        setMessage(
          'Não foi possível confirmar o estado. Consulte novamente antes de alterar.',
        );
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  return {
    run,
    reconcile,
    error,
    message,
    fields,
    busy,
    waiting,
    blocked: busy || waiting || unknown,
    can: (op: AccessOperation) => !!access?.can(op),
  };
}
