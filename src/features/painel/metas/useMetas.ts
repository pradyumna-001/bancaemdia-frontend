import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { createApiClient } from '../../../api/client';
import type { components } from '../../../api/schema';
import { ApiError } from '../../../api/error';
import { useAuth } from '../../../auth/ProvedorAuth';
import { useRetryAfter } from '../../../lib/useRetryAfter';
import { useAcesso } from '../../acesso/ProvedorAcesso';
import { LIST, ITEM, conferir, conferirLista, type Entrada } from './protocol';

type Work =
  | { kind: 'create'; body: Entrada }
  | { kind: 'edit'; id: number; body: components['schemas']['MetaAlteracao'] }
  | { kind: 'archive'; id: number };
type Unknown = { kind: Work['kind']; id?: number; consulted: boolean };
export function useMetas(client: ReturnType<typeof createApiClient>) {
  const auth = useAuth()!;
  const access = useAcesso()!;
  const queries = useQueryClient();
  const key = ['metas', auth.state.privateEpoch];
  const epoch = auth.state.privateEpoch;
  const [error, setError] = useState<unknown>();
  const [errorIntent, setErrorIntent] = useState<'leitura' | 'gravacao'>(
    'gravacao',
  );
  const [unknown, setUnknown] = useState<Unknown>();
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const active = useRef<AbortController>();
  const alive = useRef(false);
  const waiting = useRetryAfter(error);
  const query = useQuery({
    queryKey: key,
    enabled: auth.state.phase === 'authenticated',
    retryOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: ({ signal }) =>
      auth.service.read(async () =>
        conferirLista((await client.GET(LIST, { signal })).data),
      ),
  });
  const queryWaiting = useRetryAfter(query.error);
  useEffect(() => {
    alive.current = true;
    const clean = () => {
      active.current?.abort();
      active.current = undefined;
      setBusy(false);
      setUnknown(undefined);
      setError(undefined);
      setNotice('');
    };
    const unregister = auth.service.registerCleanup(clean);
    return () => {
      alive.current = false;
      active.current?.abort();
      unregister();
    };
  }, [auth.service]);
  async function write(work: Work) {
    const operation =
      work.kind === 'create'
        ? (`POST ${LIST}` as const)
        : work.kind === 'edit'
          ? (`PATCH ${ITEM}` as const)
          : (`DELETE ${ITEM}` as const);
    if (active.current || unknown || waiting || !access.can(operation)) return;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setError(undefined);
    setErrorIntent('gravacao');
    setNotice('');
    const scope = auth.service.capture();
    const mounted = () =>
      alive.current && auth.service.getSnapshot().privateEpoch === epoch;
    const current = () =>
      mounted() && scope.isCurrent() && !controller.signal.aborted;
    let sent = false;
    try {
      const value = await access.run(operation, async () => {
        if (!current()) throw new ApiError('cancelled', { mutation: true });
        sent = true;
        setUnknown({
          kind: work.kind,
          id: 'id' in work ? work.id : undefined,
          consulted: false,
        });
        const result =
          work.kind === 'create'
            ? await client.POST(LIST, {
                body: Object.freeze({ ...work.body }),
                signal: controller.signal,
              })
            : work.kind === 'edit'
              ? await client.PATCH(ITEM, {
                  params: { path: { meta_id: work.id } },
                  body: Object.freeze({ ...work.body }),
                  signal: controller.signal,
                })
              : await client.DELETE(ITEM, {
                  params: { path: { meta_id: work.id } },
                  signal: controller.signal,
                });
        if (result.response.status !== (work.kind === 'create' ? 201 : 200))
          throw new ApiError('invalid_response', { mutation: true });
        const meta = conferir(result.data, true);
        if (
          ('id' in work && meta.id !== work.id) ||
          (work.kind === 'archive' && meta.status !== 'arquivada')
        )
          throw new ApiError('invalid_response', { mutation: true });
        return meta;
      });
      if (!current()) return;
      setUnknown(undefined);
      setNotice(
        work.kind === 'create'
          ? 'Meta criada.'
          : work.kind === 'edit'
            ? 'Meta atualizada.'
            : 'Meta arquivada. Ela continua disponível no histórico.',
      );
      await queries.invalidateQueries({ queryKey: key });
      if (current()) return value;
    } catch (cause) {
      if (!mounted()) return;
      const safe =
        cause instanceof ApiError
          ? cause
          : new ApiError('invalid_response', { mutation: true });
      setError(safe);
      if (!sent || !safe.outcomeUnknown) setUnknown(undefined);
    } finally {
      if (active.current === controller) active.current = undefined;
      if (mounted()) setBusy(false);
    }
  }
  async function consult() {
    if (active.current || waiting || queryWaiting || query.isFetching) return;
    setError(undefined);
    setErrorIntent('leitura');
    setNotice('');
    if (!unknown?.id) {
      const scope = auth.service.capture();
      const result = await query.refetch();
      if (!result.error && alive.current && scope.isCurrent())
        setNotice(
          unknown
            ? 'Lista consultada. Ela não confirma o resultado daquela criação.'
            : 'Metas consultadas.',
        );
      return;
    }
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    const scope = auth.service.capture();
    const current = () =>
      alive.current && scope.isCurrent() && !controller.signal.aborted;
    try {
      const value = await auth.service.read(async () =>
        conferir(
          (
            await client.GET(ITEM, {
              params: { path: { meta_id: unknown.id! } },
              signal: controller.signal,
            })
          ).data,
        ),
      );
      if (!current()) return;
      if (value.id !== unknown.id) throw new ApiError('invalid_response');
      setUnknown({ ...unknown, consulted: true });
      setNotice(
        'Estado atual consultado. Confira a meta antes de preparar outra edição; esta consulta não é um recibo do pedido anterior.',
      );
      await queries.invalidateQueries({ queryKey: key });
    } catch (cause) {
      if (!current()) return;
      setError(cause);
      if (cause instanceof ApiError && cause.status === 404)
        setUnknown({ ...unknown, consulted: true });
    } finally {
      if (active.current === controller) active.current = undefined;
      if (alive.current) setBusy(false);
    }
  }
  return {
    query,
    error,
    errorIntent,
    notice,
    unknown,
    busy,
    waiting,
    queryWaiting,
    write,
    consult,
    canWrite: access.can(`POST ${LIST}`),
    close: () => {
      if (!active.current && (!unknown?.id || unknown.consulted)) {
        setUnknown(undefined);
        setError(undefined);
        setNotice('');
        return true;
      }
      return false;
    },
  };
}
