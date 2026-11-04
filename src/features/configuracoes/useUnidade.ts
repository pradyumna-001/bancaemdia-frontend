import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { createApiClient } from '../../api/client';
import { ApiError } from '../../api/error';
import { useAuth } from '../../auth/ProvedorAuth';
import { useRetryAfter } from '../../lib/useRetryAfter';
import { useAcesso } from '../acesso/ProvedorAcesso';
import {
  INTENCAO,
  VIGENCIAS,
  conferirRecibo,
  type Pedido,
  type Recibo,
} from './unidade';

const POST = `POST ${VIGENCIAS}` as const;

type State = {
  id?: string;
  body?: Pedido;
  receipt?: Recibo;
  // The POST may have been recorded: only a lookup of the same key decides.
  uncertain?: boolean;
  // Lookup answered 404 for this key: the same key and body may be resent.
  notRecorded?: boolean;
};

// Key and body live only in memory; a mutation is never replayed
// automatically, even when the contract allows it (rule 21).
export function useUnidade(client: ReturnType<typeof createApiClient>) {
  const auth = useAuth()!;
  const access = useAcesso()!;
  const queries = useQueryClient();
  const [state, setState] = useState<State>({});
  const stateRef = useRef(state);
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const active = useRef<AbortController>();
  const alive = useRef(false);
  const waiting = useRetryAfter(error);
  const epoch = auth.state.privateEpoch;
  function update(next: State) {
    stateRef.current = next;
    setState(next);
  }
  useEffect(() => {
    alive.current = true;
    const unregister = auth.service.registerCleanup(() => {
      active.current?.abort();
      update({});
      setError(undefined);
    });
    return () => {
      alive.current = false;
      active.current?.abort();
      stateRef.current = {};
      unregister();
    };
  }, [auth.service]);

  async function execute(kind: 'send' | 'resend' | 'consult', input?: Pedido) {
    if (active.current || waiting) return;
    let current = stateRef.current;
    if (kind === 'send') {
      if (!input || (current.id && !current.receipt)) return;
      current = { id: crypto.randomUUID(), body: Object.freeze({ ...input }) };
    }
    if (kind === 'resend' && (!current.notRecorded || !current.body)) return;
    if (kind === 'consult' && !current.uncertain) return;
    if (!current.id) return;
    if (kind !== 'consult' && !access.can(POST)) return;
    update(current);
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setError(undefined);
    const scope = auth.service.capture();
    const live = () =>
      alive.current &&
      !controller.signal.aborted &&
      scope.isCurrent() &&
      auth.service.getSnapshot().privateEpoch === epoch;
    const headers = { 'Idempotency-Key': current.id };
    let sent = false;
    try {
      const receipt =
        kind === 'consult'
          ? await auth.service.read(async () => {
              const { data } = await client.GET(INTENCAO, {
                params: { header: headers },
                signal: controller.signal,
              });
              return conferirRecibo(data, 'GET', current.body);
            })
          : await access.run(POST, async () => {
              if (!live()) throw new ApiError('cancelled', { mutation: true });
              sent = true;
              update({ ...current, uncertain: true, notRecorded: false });
              const { data } = await client.POST(VIGENCIAS, {
                body: current.body!,
                params: { header: headers },
                signal: controller.signal,
              });
              return conferirRecibo(data, 'POST', current.body);
            });
      if (!live()) return;
      update({ ...current, receipt, uncertain: false, notRecorded: false });
      await queries.invalidateQueries({ queryKey: ['unidade'] });
    } catch (cause) {
      if (!live()) return;
      const failure =
        cause instanceof ApiError
          ? cause
          : new ApiError('invalid_response', { mutation: kind !== 'consult' });
      setError(failure);
      if (kind === 'consult') {
        // 404: nothing was recorded with this key; keep key and body.
        update({
          ...current,
          uncertain: failure.status !== 404,
          notRecorded: failure.status === 404,
        });
        return;
      }
      const uncertain =
        sent &&
        (failure.outcomeUnknown ||
          failure.kind === 'invalid_response' ||
          failure.status === 429);
      // A known refusal before any record frees the form for a new attempt.
      if (!uncertain) update({});
      else update({ ...current, uncertain: true, notRecorded: false });
    } finally {
      if (active.current === controller) active.current = undefined;
      if (alive.current && auth.service.getSnapshot().privateEpoch === epoch)
        setBusy(false);
    }
  }

  return {
    state,
    error,
    busy,
    waiting,
    canWrite: access.can(POST),
    send: (body: Pedido) => execute('send', body),
    resend: () => execute('resend'),
    consult: () => execute('consult'),
    reset: () => {
      if (active.current || waiting || stateRef.current.uncertain) return;
      update({});
      setError(undefined);
    },
  };
}
