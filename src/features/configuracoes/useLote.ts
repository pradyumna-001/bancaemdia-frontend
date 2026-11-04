import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import type { createApiClient } from '../../api/client';
import { ApiError } from '../../api/error';
import { useAuth } from '../../auth/ProvedorAuth';
import { useRetryAfter } from '../../lib/useRetryAfter';
import { useAcesso } from '../acesso/ProvedorAcesso';
import {
  INTENCAO_LOTE,
  LOTE,
  LOTES,
  PARAM_APAGAR,
  PARAM_LOTE,
  PARAM_RESTAURAR,
  POST_APAGAR,
  POST_RESTAURAR,
  PREVIA,
  RESTAURAR,
  conferirIntencao,
  conferirLote,
  conferirPrevia,
  paramValido,
  type Lote,
  type Operacao,
  type PedidoLote,
  type Previa,
} from './lote';

export type Tentativa = {
  operacao: Operacao;
  id: string;
  // Delete body (signed confirmation and typed phrase) lives only in memory.
  body?: PedidoLote;
  loteId?: string;
};
export type Fase = 'idle' | 'sending' | 'uncertain' | 'notFound';

const PARAM = { APAGAR: PARAM_APAGAR, RESTAURAR: PARAM_RESTAURAR } as const;
const OPERATION = { APAGAR: POST_APAGAR, RESTAURAR: POST_RESTAURAR } as const;

// One batch intent at a time. Its key is written to the URL before the POST
// so a lost answer can be consulted after reload; never replayed
// automatically, even when the contract would allow it (rule 21).
export function useLote(client: ReturnType<typeof createApiClient>) {
  const auth = useAuth()!;
  const access = useAcesso()!;
  const queries = useQueryClient();
  const [search, setSearch] = useSearchParams();
  const latest = useRef(search);
  useLayoutEffect(() => {
    latest.current = search;
  }, [search]);
  const epoch = auth.state.privateEpoch;
  const person = auth.state.person?.id;
  const loteId = paramValido(search, PARAM_LOTE);
  const urlApagar = paramValido(search, PARAM_APAGAR);
  const urlRestaurar = loteId && paramValido(search, PARAM_RESTAURAR);
  const [previa, setPrevia] = useState<Previa>();
  const [tentativa, setTentativa] = useState<Tentativa>();
  const [fase, setFase] = useState<Fase>('idle');
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const active = useRef<AbortController>();
  const queued = useRef<Tentativa>();
  const alive = useRef(false);
  const waiting = useRetryAfter(error);

  // A key in the URL without a known answer is an unknown result.
  const fromUrl: Tentativa | undefined = urlApagar
    ? { operacao: 'APAGAR', id: urlApagar }
    : urlRestaurar
      ? { operacao: 'RESTAURAR', id: urlRestaurar, loteId }
      : undefined;
  const atual = tentativa && fromUrl?.id === tentativa.id ? tentativa : fromUrl;
  const faseAtual: Fase =
    atual && atual !== tentativa ? 'uncertain' : atual ? fase : 'idle';

  const lote = useQuery({
    queryKey: ['lote-apostas', epoch, person, loteId],
    enabled: auth.state.phase === 'authenticated' && !!loteId,
    retryOnMount: false,
    queryFn: ({ signal }) =>
      auth.service.read(async () =>
        conferirLote(
          (
            await client.GET(LOTE, {
              signal,
              params: { path: { lote_id: loteId! } },
            })
          ).data,
          LOTE,
        ),
      ),
  });

  function clean() {
    active.current?.abort();
    queued.current = undefined;
    setPrevia(undefined);
    setTentativa(undefined);
    setFase('idle');
    setError(undefined);
  }
  useEffect(() => {
    alive.current = true;
    const unregister = auth.service.registerCleanup(clean);
    return () => {
      alive.current = false;
      active.current?.abort();
      queued.current = undefined;
      unregister();
    };
  }, [auth.service]);

  function navigateTo(change: (next: URLSearchParams) => void) {
    const next = new URLSearchParams(latest.current);
    change(next);
    if (next.toString() !== latest.current.toString()) {
      latest.current = next;
      setSearch(next, { replace: true });
    }
  }

  function guard(controller: AbortController) {
    const scope = auth.service.capture();
    return () =>
      alive.current &&
      !controller.signal.aborted &&
      scope.isCurrent() &&
      auth.service.getSnapshot().privateEpoch === epoch;
  }

  async function settle(value: Lote, operacao: Operacao) {
    queries.setQueryData(['lote-apostas', epoch, person, value.lote_id], value);
    navigateTo((next) => {
      next.delete(PARAM[operacao]);
      next.set(PARAM_LOTE, value.lote_id);
    });
    setTentativa(undefined);
    setPrevia(undefined);
    setFase('idle');
    // Every private read may have counted these bets; materialized
    // summaries may still take a moment to follow.
    await queries.invalidateQueries({
      predicate: (query) => query.queryKey[0] !== 'lote-apostas',
    });
  }

  async function begin(
    work: (signal: AbortSignal, live: () => boolean) => Promise<void>,
  ) {
    if (active.current || waiting) return;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setError(undefined);
    try {
      await work(controller.signal, guard(controller));
    } finally {
      if (active.current === controller) active.current = undefined;
      if (alive.current && auth.service.getSnapshot().privateEpoch === epoch)
        setBusy(false);
    }
  }

  async function preparar() {
    if (atual) return;
    await begin(async (signal, live) => {
      try {
        const value = await auth.service.read(async () =>
          conferirPrevia((await client.GET(PREVIA, { signal })).data),
        );
        if (live()) setPrevia(value);
      } catch (cause) {
        if (live()) setError(cause);
      }
    });
  }

  async function send(value: Tentativa) {
    await begin(async (signal, live) => {
      let sent = false;
      const headers = { 'Idempotency-Key': value.id };
      try {
        const receipt = await access.run(
          OPERATION[value.operacao],
          async () => {
            if (!live()) throw new ApiError('cancelled', { mutation: true });
            sent = true;
            setFase('sending');
            if (value.operacao === 'APAGAR') {
              const { data } = await client.POST(LOTES, {
                body: value.body!,
                params: { header: headers },
                signal,
              });
              const lote = conferirLote(data, `POST ${LOTES}`, true);
              if (lote.restaurado_em !== null)
                throw new ApiError('invalid_response', { mutation: true });
              return lote;
            }
            const { data } = await client.POST(RESTAURAR, {
              params: { header: headers, path: { lote_id: value.loteId! } },
              signal,
            });
            const lote = conferirLote(data, `POST ${RESTAURAR}`, true);
            if (lote.lote_id !== value.loteId || lote.restaurado_em === null)
              throw new ApiError('invalid_response', { mutation: true });
            return lote;
          },
        );
        if (live()) await settle(receipt, value.operacao);
      } catch (cause) {
        if (!live()) return;
        const failure =
          cause instanceof ApiError
            ? cause
            : new ApiError('invalid_response', { mutation: true });
        setError(failure);
        const uncertain =
          sent &&
          (failure.outcomeUnknown ||
            failure.kind === 'invalid_response' ||
            failure.status === 429);
        if (uncertain) {
          setFase('uncertain');
          return;
        }
        // A known refusal is not recorded: the key is released.
        setTentativa(undefined);
        setFase('idle');
        navigateTo((next) => next.delete(PARAM[value.operacao]));
        if (value.operacao === 'APAGAR' && failure.code !== 'frase_incorreta')
          setPrevia(undefined);
        if (value.operacao === 'RESTAURAR') void lote.refetch();
      }
    });
  }

  // Send only once the key is in the URL.
  useEffect(() => {
    const value = queued.current;
    if (value && paramValido(search, PARAM[value.operacao]) === value.id) {
      queued.current = undefined;
      void send(value);
    }
  });

  function queue(value: Tentativa) {
    if (active.current || waiting || !access.can(OPERATION[value.operacao]))
      return;
    setTentativa(value);
    setFase('sending');
    setError(undefined);
    queued.current = value;
    navigateTo((next) => next.set(PARAM[value.operacao], value.id));
  }

  async function consultar() {
    const value = atual;
    if (!value || faseAtual !== 'uncertain') return;
    await begin(async (signal, live) => {
      try {
        const receipt = await auth.service.read(async () =>
          conferirIntencao(
            (
              await client.GET(INTENCAO_LOTE, {
                params: { header: { 'Idempotency-Key': value.id } },
                signal,
              })
            ).data,
            value.operacao,
          ),
        );
        if (value.operacao === 'RESTAURAR' && receipt.lote_id !== value.loteId)
          throw new ApiError('invalid_response');
        if (live()) await settle(receipt, value.operacao);
      } catch (cause) {
        if (!live()) return;
        setError(cause);
        setTentativa(value);
        // 404 shows no record for this key; it does not prove a rollback.
        setFase(
          cause instanceof ApiError && cause.status === 404
            ? 'notFound'
            : 'uncertain',
        );
      }
    });
  }

  const podeReenviar =
    faseAtual === 'notFound' &&
    !!atual &&
    (atual.operacao === 'RESTAURAR' ? !!atual.loteId : !!atual.body);

  return {
    previa,
    lote,
    loteId,
    tentativa: atual,
    fase: faseAtual,
    error,
    busy,
    waiting,
    podeApagar: access.can(POST_APAGAR),
    podeRestaurar: access.can(POST_RESTAURAR),
    podeReenviar,
    preparar,
    cancelar: () => {
      if (active.current) return;
      setPrevia(undefined);
      setError(undefined);
    },
    apagar: (frase: string) => {
      if (!previa || atual) return;
      queue({
        operacao: 'APAGAR',
        id: crypto.randomUUID(),
        body: Object.freeze({
          acao: 'apagar_todas',
          confirmacao: previa.confirmacao,
          frase,
        }),
      });
    },
    restaurar: () => {
      if (!loteId || atual || lote.data?.restaurado_em !== null) return;
      queue({ operacao: 'RESTAURAR', id: crypto.randomUUID(), loteId });
    },
    consultar,
    reenviar: () => {
      if (podeReenviar && atual) queue(atual);
    },
    descartar: () => {
      if (faseAtual !== 'notFound' || !atual || active.current) return;
      setTentativa(undefined);
      setFase('idle');
      setError(undefined);
      navigateTo((next) => next.delete(PARAM[atual.operacao]));
    },
    fechar: () => {
      if (atual || active.current) return;
      setError(undefined);
      navigateTo((next) => next.delete(PARAM_LOTE));
    },
  };
}
