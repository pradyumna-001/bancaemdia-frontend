import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { createApiClient } from '../../../api/client';
import { ApiError } from '../../../api/error';
import { useAuth } from '../../../auth/ProvedorAuth';
import { useRetryAfter } from '../../../lib/useRetryAfter';
import { useAcesso } from '../../acesso/ProvedorAcesso';
import {
  PREVIEW,
  APPLY,
  GET,
  conferir,
  conferirIntencao,
  type Pedido,
  type Recibo,
} from './protocol';
type State = {
  id?: string;
  body?: Pedido;
  preview?: Recibo;
  receipt?: Recibo;
  confirmed?: boolean;
  uncertain?: boolean;
  consulted?: boolean;
  renewable?: boolean;
};
export function useTroca(client: ReturnType<typeof createApiClient>) {
  const auth = useAuth()!;
  const access = useAcesso()!;
  const queries = useQueryClient();
  const [state, setState] = useState<State>({});
  const stateRef = useRef(state);
  function update(next: State) {
    stateRef.current = next;
    setState(next);
  }
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const active = useRef<AbortController>();
  const alive = useRef(false);
  const waiting = useRetryAfter(error);
  const epoch = auth.state.privateEpoch;
  const refresh = () =>
    queries.invalidateQueries({
      predicate: (q) =>
        ['contas', 'apostas', 'painel', 'caixa', 'revisao'].includes(
          String(q.queryKey[0]),
        ),
    });
  useEffect(() => {
    alive.current = true;
    const clean = () => {
      active.current?.abort();
      update({});
      setError(undefined);
    };
    const unregister = auth.service.registerCleanup(clean);
    return () => {
      alive.current = false;
      active.current?.abort();
      stateRef.current = {};
      unregister();
    };
  }, [auth.service]);
  async function execute(
    kind: 'preview' | 'previewReplay' | 'apply' | 'get',
    input?: Pedido,
  ) {
    if (active.current || waiting) return;
    let current = stateRef.current;
    if (kind === 'preview') {
      if (!input || (current.id && !current.receipt && !current.renewable))
        return;
      current = { id: crypto.randomUUID(), body: Object.freeze({ ...input }) };
    }
    if (!current.id) return;
    const previewing = kind === 'preview' || kind === 'previewReplay';
    if (
      kind === 'previewReplay' &&
      (!current.body ||
        !current.consulted ||
        current.confirmed ||
        current.receipt)
    )
      return;
    if (
      kind === 'apply' &&
      (!current.body ||
        !current.preview ||
        current.receipt ||
        (current.uncertain && !current.consulted))
    )
      return;
    const operation =
      kind === 'get'
        ? (`GET ${GET}` as const)
        : previewing
          ? (`POST ${PREVIEW}` as const)
          : (`POST ${APPLY}` as const);
    if (kind !== 'get' && !access.can(operation)) return;
    if (kind === 'apply') current = { ...current, confirmed: true };
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
    let sent = false;
    try {
      const headers = { 'Idempotency-Key': current.id! };
      if (kind === 'get') {
        const value = await auth.service.read(async () => {
          const { data } = await client.GET(GET, {
            params: { header: headers },
            signal: controller.signal,
          });
          return conferirIntencao(data);
        });
        if (!live()) return;
        update({
          ...current,
          preview: value.previa,
          receipt: value.recibo ?? undefined,
          consulted: true,
          renewable: !current.uncertain && value.estado === 'EXPIRED',
        });
        if (value.recibo) await refresh();
      } else {
        const value = await access.run(operation, async () => {
          if (!live()) throw new ApiError('cancelled', { mutation: true });
          sent = true;
          update({ ...current, uncertain: true, consulted: false });
          const { data } = await client.POST(previewing ? PREVIEW : APPLY, {
            body: current.body!,
            params: { header: headers },
            signal: controller.signal,
          });
          return conferir(data, current.body, kind === 'apply');
        });
        if (!live()) return;
        update({
          ...current,
          preview: previewing ? value : current.preview,
          receipt: kind === 'apply' ? value : undefined,
          uncertain: false,
          consulted: false,
        });
        if (kind === 'apply') await refresh();
      }
    } catch (cause) {
      if (!live()) return;
      const failure =
        cause instanceof ApiError
          ? cause
          : new ApiError('invalid_response', { mutation: kind !== 'get' });
      setError(failure);
      if (kind === 'get')
        update({
          ...current,
          consulted: failure.status === 404 || failure.status === 410,
        });
      else {
        const uncertain =
          current.uncertain ||
          (sent &&
            (failure.outcomeUnknown ||
              failure.kind === 'invalid_response' ||
              failure.status === 429));
        const renewable =
          !uncertain &&
          (failure.code === 'swap_preview_stale' ||
            failure.code === 'swap_preview_expired' ||
            failure.code === 'swap_invalid' ||
            failure.status === 422);
        if (
          kind === 'preview' &&
          !uncertain &&
          (!sent || failure.status === 402)
        ) {
          update({});
          return;
        }
        update({ ...current, uncertain, consulted: false, renewable });
      }
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
    canPreview: access.can(`POST ${PREVIEW}`),
    canApply: access.can(`POST ${APPLY}`),
    preview: (body: Pedido) => execute('preview', body),
    resendPreview: () => execute('previewReplay'),
    apply: () => execute('apply'),
    consult: () => execute('get'),
    recover: (id: string) => {
      if (active.current || stateRef.current.id) return;
      update({ id });
    },
    reset: () => {
      const s = stateRef.current;
      if (
        active.current ||
        waiting ||
        (s.id &&
          !s.receipt &&
          !s.renewable &&
          !(s.preview && !s.confirmed && !s.uncertain))
      )
        return;
      update({});
      setError(undefined);
    },
  };
}
