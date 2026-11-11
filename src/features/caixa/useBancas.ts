import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import type { createApiClient } from '../../api/client';
import { ApiError } from '../../api/error';
import { useAuth } from '../../auth/ProvedorAuth';
import { useRetryAfter } from '../../lib/useRetryAfter';
import { useAcesso } from '../acesso/ProvedorAcesso';
import {
  ARQUIVAR,
  BANCA,
  BANCAS,
  INTENCAO_BANCA,
  OPERACOES,
  PARAM_BANCA,
  chaveDaUrl,
  conferirBanca,
  conferirBancas,
  conferirIntencaoBanca,
  type Banca,
  type OperacaoBanca,
  type Pedido,
} from './bancas';

export type Tentativa = { id: string; pedido?: Pedido };
export type Fase = 'idle' | 'sending' | 'uncertain' | 'notFound';
export type Resultado = { operacao: OperacaoBanca; banca: Banca };

// Shared with CaixaPage: its invalidation of ['caixa', epoch] refreshes it,
// and logout removes it with the rest of the Caixa cache.
export function useListaBancas(client: ReturnType<typeof createApiClient>) {
  const auth = useAuth()!;
  const epoch = auth.state.privateEpoch;
  return useQuery({
    queryKey: ['caixa', epoch, 'bancas', auth.state.person?.id],
    enabled: auth.state.phase === 'authenticated',
    retryOnMount: false,
    queryFn: ({ signal }) =>
      auth.service.read(async () =>
        conferirBancas((await client.GET(BANCAS, { signal })).data),
      ),
  });
}

// One banca intent at a time. The key is written to the URL before the
// request; body only in memory; never replayed automatically (rule 21).
export function useBancas(client: ReturnType<typeof createApiClient>) {
  const auth = useAuth()!;
  const access = useAcesso()!;
  const queries = useQueryClient();
  const [search, setSearch] = useSearchParams();
  const latest = useRef(search);
  useLayoutEffect(() => {
    latest.current = search;
  }, [search]);
  const epoch = auth.state.privateEpoch;
  const urlKey = chaveDaUrl(search);
  const [tentativa, setTentativa] = useState<Tentativa>();
  const [fase, setFase] = useState<Fase>('idle');
  const [resultado, setResultado] = useState<Resultado>();
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const active = useRef<AbortController>();
  const queued = useRef<Tentativa>();
  const alive = useRef(false);
  const waiting = useRetryAfter(error);

  const atual =
    urlKey === undefined
      ? undefined
      : tentativa?.id === urlKey
        ? tentativa
        : { id: urlKey };
  const faseAtual: Fase = !atual
    ? 'idle'
    : atual === tentativa
      ? fase
      : 'uncertain';

  useEffect(() => {
    alive.current = true;
    const unregister = auth.service.registerCleanup(() => {
      active.current?.abort();
      queued.current = undefined;
      setTentativa(undefined);
      setFase('idle');
      setResultado(undefined);
      setError(undefined);
    });
    return () => {
      alive.current = false;
      active.current?.abort();
      queued.current = undefined;
      unregister();
    };
  }, [auth.service]);

  function navigateTo(key: string | undefined) {
    const next = new URLSearchParams(latest.current);
    next.delete(PARAM_BANCA);
    if (key) next.set(PARAM_BANCA, key);
    if (next.toString() !== latest.current.toString()) {
      latest.current = next;
      setSearch(next, { replace: true });
    }
  }

  // A safe read goes through auth.service.read, which renews an expired
  // access once and only resolves for the current session: its answer stays
  // valid across that renewal. A write stays bound to the session that sent it.
  async function begin(
    work: (signal: AbortSignal, live: () => boolean) => Promise<void>,
    leitura = false,
  ) {
    if (active.current || waiting) return;
    const controller = new AbortController();
    active.current = controller;
    const scope = auth.service.capture();
    const live = () =>
      alive.current &&
      !controller.signal.aborted &&
      (leitura || scope.isCurrent()) &&
      auth.service.getSnapshot().privateEpoch === epoch;
    setBusy(true);
    setError(undefined);
    try {
      await work(controller.signal, live);
    } finally {
      if (active.current === controller) active.current = undefined;
      if (alive.current && auth.service.getSnapshot().privateEpoch === epoch)
        setBusy(false);
    }
  }

  async function settle(value: Resultado) {
    setResultado(value);
    setTentativa(undefined);
    setFase('idle');
    navigateTo(undefined);
    // Saldo, choices of link and other money reads may name this banca.
    await queries.invalidateQueries({ queryKey: ['caixa', epoch] });
    void queries.invalidateQueries({ queryKey: ['contas'] });
    void queries.invalidateQueries({ queryKey: ['painel'] });
  }

  async function send(value: Tentativa) {
    const pedido = value.pedido!;
    await begin(async (signal, live) => {
      let sent = false;
      const header = { 'Idempotency-Key': value.id };
      try {
        const banca = await access.run(OPERACOES[pedido.operacao], async () => {
          if (!live()) throw new ApiError('cancelled', { mutation: true });
          sent = true;
          setFase('sending');
          if (pedido.operacao === 'CRIAR') {
            const { data } = await client.POST(BANCAS, {
              body: pedido.body,
              params: { header },
              signal,
            });
            return conferirBanca(data, pedido, `POST ${BANCAS}`, true);
          }
          if (pedido.operacao === 'ALTERAR') {
            const { data } = await client.PATCH(BANCA, {
              body: pedido.body,
              params: { header, path: { banca_id: pedido.bancaId } },
              signal,
            });
            return conferirBanca(data, pedido, `PATCH ${BANCA}`, true);
          }
          const { data } = await client.POST(ARQUIVAR, {
            params: { header, path: { banca_id: pedido.bancaId } },
            signal,
          });
          return conferirBanca(data, pedido, `POST ${ARQUIVAR}`, true);
        });
        if (live()) await settle({ operacao: pedido.operacao, banca });
      } catch (cause) {
        if (!live()) return;
        const failure =
          cause instanceof ApiError
            ? cause
            : new ApiError('invalid_response', { mutation: true });
        setError(failure);
        if (
          sent &&
          (failure.outcomeUnknown ||
            failure.kind === 'invalid_response' ||
            failure.status === 429)
        ) {
          setFase('uncertain');
          return;
        }
        // Refusals are not recorded: the key is released, the form stays.
        setTentativa(undefined);
        setFase('idle');
        navigateTo(undefined);
        if (failure.status === 404 || failure.status === 409)
          void queries.invalidateQueries({ queryKey: ['caixa', epoch] });
      }
    });
  }

  useEffect(() => {
    const value = queued.current;
    if (value && chaveDaUrl(search) === value.id) {
      queued.current = undefined;
      void send(value);
    }
  });

  function queue(value: Tentativa) {
    if (
      active.current ||
      waiting ||
      !value.pedido ||
      !access.can(OPERACOES[value.pedido.operacao])
    )
      return;
    setTentativa(value);
    setFase('sending');
    setResultado(undefined);
    setError(undefined);
    queued.current = value;
    navigateTo(value.id);
  }

  async function consultar() {
    const value = atual;
    if (!value || faseAtual !== 'uncertain') return;
    await begin(async (signal, live) => {
      try {
        const result = await auth.service.read(async () =>
          conferirIntencaoBanca(
            (
              await client.GET(INTENCAO_BANCA, {
                params: { header: { 'Idempotency-Key': value.id } },
                signal,
              })
            ).data,
            value.pedido,
          ),
        );
        if (live()) await settle(result);
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
    }, true);
  }

  const ocupado = busy || waiting || !!atual;
  return {
    tentativa: atual,
    fase: faseAtual,
    resultado,
    error,
    busy,
    waiting,
    ocupado,
    pode: (operacao: OperacaoBanca) => access.can(OPERACOES[operacao]),
    enviar: (pedido: Pedido) => {
      if (atual) return;
      queue({ id: crypto.randomUUID(), pedido });
    },
    consultar,
    podeReenviar: faseAtual === 'notFound' && !!atual?.pedido,
    reenviar: () => {
      if (faseAtual === 'notFound' && atual?.pedido) queue(atual);
    },
    descartar: () => {
      if (faseAtual !== 'notFound' || active.current) return;
      setTentativa(undefined);
      setFase('idle');
      setError(undefined);
      navigateTo(undefined);
    },
    limpar: () => {
      if (active.current || atual) return;
      setResultado(undefined);
      setError(undefined);
    },
  };
}
