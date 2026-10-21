import { useEffect, useRef, useState, type MouseEvent } from 'react';
import {
  infiniteQueryOptions,
  useInfiniteQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { getApiClient, type createApiClient } from '../../api/client';
import { ApiError } from '../../api/error';
import { SITE_READ_CONTRACT } from '../../api/site-read.generated';
import { useAuth } from '../../auth/ProvedorAuth';
import type { SessionService } from '../../auth/session';
import { ErroApi, type ErrorField } from '../../components/ErroApi';
import { Filtros, useFiltros } from '../../components/filtros/Filtros';
import { EscolhaFiltro } from '../../components/filtros/EscolhaFiltro';
import { dataHora, moeda, odd } from '../../lib/format';
import {
  adaptarFiltros,
  lerFiltros,
  serializarConsulta,
} from '../../lib/params';
import { rotuloEstado } from '../../lib/termos';
import { useRetryAfter } from '../../lib/useRetryAfter';
import { useCatalogos } from '../apostas/catalogos';
import { useOperacao } from '../importar/useOperacao';
import { useAcesso } from '../acesso/ProvedorAcesso';
import {
  contextoConta,
  DESFAZER,
  identidadeValida,
  pedidoResultado,
  REGISTRAR,
  unirFila,
  validarAposta,
  validarFila,
  validarRecibo,
  type ApostaResultado,
  type Fila,
  type Pedido,
  type Recibo,
  type Reversao,
} from './protocol';
import './resultados.css';

type Intento = { id: string; chave: string } & (
  { tipo: 'result'; body: Pedido } | { tipo: 'undo'; body: Reversao }
);
const OUTROS = ['ANULADA', 'CASHOUT', 'MEIO_GREEN', 'MEIO_RED'] as const;
const CAMPOS_RESULTADO = [
  {
    scope: 'body',
    field: 'cashout_valor_centavos',
    id: 'resultado-cashout',
    label: 'Valor pago no cashout',
  },
  {
    scope: 'body',
    field: 'retorno_centavos',
    id: 'resultado-retorno',
    label: 'Retorno pago',
  },
  {
    scope: 'body',
    field: 'comissao_centavos',
    id: 'resultado-comissao',
    label: 'Comissão',
  },
] as const satisfies readonly ErrorField[];
type Api = ReturnType<typeof createApiClient>;
type ConsultaFila = ReturnType<typeof adaptarFiltros>['query'];

/** The queue read, shared by the page and the preload of its route. */
function opcoesFila(
  api: Api,
  service: SessionService,
  epoch: number,
  query: ConsultaFila,
) {
  return infiniteQueryOptions({
    queryKey: ['resultados-fila', epoch, serializarConsulta(query)],
    initialPageParam: undefined as string | undefined,
    retryOnMount: false,
    refetchOnWindowFocus: false,
    getNextPageParam: (page: Fila) => page.next_cursor ?? undefined,
    queryFn: async ({ pageParam, signal }): Promise<Fila> =>
      service.read(async () =>
        validarFila(
          (
            await api.GET('/api/v1/resultados/fila', {
              signal,
              params: {
                query: {
                  ...query,
                  ...(pageParam ? { cursor: pageParam } : {}),
                },
              },
            })
          ).data,
        ),
      ),
  });
}

/**
 * Starts the first queue page as soon as the route's session read confirms
 * the user, instead of after the page renders. Same key, read and validation
 * as the page; blocked filters and other session states send nothing.
 */
export function anteciparFila({
  queryClient,
  service,
  api,
  search,
}: {
  queryClient: QueryClient;
  service: SessionService;
  api: Api;
  search: URLSearchParams;
}) {
  const state = service.getSnapshot();
  if (state.phase !== 'authenticated') return;
  const adapter = adaptarFiltros(
    lerFiltros(search, 'resultados'),
    'resultados',
  );
  if (adapter.bloqueios.length) return;
  void queryClient.prefetchInfiniteQuery(
    opcoesFila(api, service, state.privateEpoch, adapter.query),
  );
}

export function ResultadosPage({
  client,
}: {
  client?: ReturnType<typeof createApiClient>;
}) {
  const auth = useAuth();
  const { adapter } = useFiltros('resultados');
  if (!auth)
    return (
      <main className="pagina">
        <h1>Resultados</h1>
        <p role="status">Consultando sessão…</p>
      </main>
    );
  return (
    <Resultados
      key={`${auth?.state.privateEpoch}:${serializarConsulta(adapter.query)}`}
      api={client ?? getApiClient()}
    />
  );
}
function Resultados({ api }: { api: ReturnType<typeof createApiClient> }) {
  const auth = useAuth()!;
  const queries = useQueryClient();
  const { visao, adapter } = useFiltros('resultados');
  const signature = serializarConsulta(adapter.query);
  const epoch = auth.state.privateEpoch;
  const [search, setSearch] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const catalogos = useCatalogos(
    SITE_READ_CONTRACT,
    api,
    visao,
    undefined,
    filtersOpen,
  );
  const op = useOperacao();
  const access = useAcesso();
  const { cancel } = op;
  const [recibos, setRecibos] = useState<Recibo[]>([]);
  const [consumed, setConsumed] = useState<string[]>([]);
  const [undoBlocked, setUndoBlocked] = useState<string[]>([]);
  const [outro, setOutro] = useState<Pedido['estado']>();
  const [cashout, setCashout] = useState('');
  const [retorno, setRetorno] = useState('');
  const [comissao, setComissao] = useState('');
  const [localError, setLocalError] = useState('');
  const [readError, setReadError] = useState<unknown>();
  const [writeBarrier, setWriteBarrier] = useState<unknown>();
  const [reading, setReading] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const pending = useRef<Intento>();
  const [pendingIntent, setPendingIntent] = useState<Intento>();
  const acting = useRef(false);
  const readController = useRef<AbortController>();
  const green = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const alive = useRef(true);
  const restored = new Set(
    recibos.filter((r) => r.tipo === 'undo').map((r) => r.operacao_desfeita),
  );
  const rawId = search.get('resultado');
  const id =
    identidadeValida(rawId) && search.getAll('resultado').length === 1
      ? rawId
      : undefined;
  const readWaiting = useRetryAfter(readError);
  const writeWaiting = useRetryAfter(writeBarrier);
  const fila = useInfiniteQuery({
    ...opcoesFila(api, auth.service, epoch, adapter.query),
    enabled:
      auth.state.phase === 'authenticated' && adapter.bloqueios.length === 0,
  });
  const filaWaiting = useRetryAfter(fila.error);
  const concluidas = new Set(consumed);
  const items = unirFila(fila.data?.pages ?? [], concluidas);
  const atual = items[0];
  const snapshot = fila.data?.pages.at(-1);
  const blocked =
    op.busy ||
    op.waiting ||
    op.uncertain ||
    writeWaiting ||
    fila.isFetching ||
    filaWaiting ||
    reading ||
    cooldown ||
    !!id ||
    !!adapter.bloqueios.length;
  const writeBlocked = blocked || !op.can(REGISTRAR);
  useEffect(() => {
    alive.current = true;
    const clean = () => {
      readController.current?.abort();
      pending.current = undefined;
      setPendingIntent(undefined);
      setRecibos([]);
      setConsumed([]);
      setUndoBlocked([]);
      setWriteBarrier(undefined);
      void queries.cancelQueries({
        queryKey: ['resultados-fila', epoch, signature],
        exact: true,
      });
      queries.removeQueries({
        queryKey: ['resultados-fila', epoch, signature],
        exact: true,
      });
      if (timer.current) clearTimeout(timer.current);
    };
    const unregister = auth.service.registerCleanup(clean);
    return () => {
      alive.current = false;
      clean();
      unregister();
      cancel();
    };
  }, [auth.service, cancel, queries, epoch, signature]);
  useEffect(() => {
    if (!cooldown && recibos.length && !id) green.current?.focus();
  }, [cooldown, recibos.length, id]);
  const { hasNextPage, isFetching, error: queueError, fetchNextPage } = fila;
  // Loading the next safe GET preserves the frontier after settled rows leave it.
  useEffect(() => {
    if (!atual && hasNextPage && !isFetching && !queueError && !id)
      void fetchNextPage();
  }, [atual, hasNextPage, isFetching, queueError, fetchNextPage, id]);
  function clearIdentity() {
    setSearch(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete('resultado');
        return next;
      },
      { replace: true },
    );
    pending.current = undefined;
    setPendingIntent(undefined);
  }
  function install(receipt: Recibo) {
    if (receipt.tipo === 'result')
      setConsumed((current) => [
        ...new Set([...current, receipt.aposta.chave]),
      ]);
    setRecibos((current) => [
      receipt,
      ...current.filter((r) => r.id !== receipt.id),
    ]);
    clearIdentity();
    op.reconciled();
    setReadError(undefined);
    setOutro(undefined);
    setCashout('');
    setRetorno('');
    setComissao('');
    void queries.invalidateQueries({ queryKey: ['aposta'] });
    void queries.invalidateQueries({ queryKey: ['apostas'] });
    void queries.invalidateQueries({ queryKey: ['resumo-apostas'] });
    // Keep subsequent gestures separate; the previous target cannot settle the next row.
    setCooldown(true);
    timer.current = setTimeout(() => {
      if (alive.current) {
        setCooldown(false);
      }
    }, 300);
    if (receipt.tipo === 'undo') void restart();
  }
  async function send(intent: Intento, explicitReplay = false) {
    const receipt = await op.run(
      intent.tipo === 'result' ? REGISTRAR : DESFAZER,
      async (signal) => {
        try {
          const response =
            intent.tipo === 'result'
              ? await api.POST('/api/v1/resultados/operacoes/{intention_id}', {
                  signal,
                  params: { path: { intention_id: intent.id } },
                  body: intent.body,
                })
              : await api.POST(
                  '/api/v1/resultados/operacoes/{intention_id}/desfazer',
                  {
                    signal,
                    params: { path: { intention_id: intent.id } },
                    body: intent.body,
                  },
                );
          return validarRecibo(response.data, intent.id, {
            chave: intent.chave,
            tipo: intent.tipo,
            ...(intent.tipo === 'undo'
              ? { alvo: intent.body.operacao_id }
              : {}),
          });
        } catch (cause) {
          if (
            alive.current &&
            !signal.aborted &&
            cause instanceof ApiError &&
            (cause.status === 429 ||
              cause.status === 503 ||
              cause.code === 'result_busy')
          )
            setWriteBarrier(cause);
          throw cause;
        }
      },
      explicitReplay,
    );
    if (receipt) install(receipt);
  }
  async function register(
    item: ApostaResultado,
    state: Pedido['estado'],
    event?: MouseEvent,
  ) {
    if (
      acting.current ||
      writeBlocked ||
      item.chave !== atual?.chave ||
      (event && event.detail > 1)
    )
      return;
    acting.current = true;
    try {
      const body = pedidoResultado(item, state, cashout, retorno, comissao);
      setLocalError('');
      const intent: Intento = {
        id: crypto.randomUUID(),
        chave: item.chave,
        tipo: 'result',
        body,
      };
      pending.current = intent;
      setPendingIntent(intent);
      setSearch(
        (current) => {
          const next = new URLSearchParams(current);
          next.set('resultado', intent.id);
          return next;
        },
        { replace: true },
      );
      await send(intent);
    } catch (cause) {
      setLocalError(
        cause instanceof Error
          ? cause.message
          : 'Confira o resultado informado.',
      );
    } finally {
      acting.current = false;
    }
  }
  async function undo(receipt: Recibo) {
    if (
      acting.current ||
      blocked ||
      !op.can(DESFAZER) ||
      restored.has(receipt.id)
    )
      return;
    acting.current = true;
    const intent: Intento = {
      id: crypto.randomUUID(),
      chave: receipt.aposta.chave,
      tipo: 'undo',
      body: {
        operacao_id: receipt.id,
        revisao_esperada: receipt.aposta.revisao,
      },
    };
    pending.current = intent;
    setPendingIntent(intent);
    setSearch(
      (current) => {
        const next = new URLSearchParams(current);
        next.set('resultado', intent.id);
        return next;
      },
      { replace: true },
    );
    try {
      await send(intent);
    } finally {
      acting.current = false;
    }
  }
  async function lookup(currentBet = false) {
    if (
      !id ||
      reading ||
      op.busy ||
      readWaiting ||
      (currentBet && !pending.current)
    )
      return;
    const scope = auth.service.capture();
    const controller = new AbortController();
    readController.current = controller;
    setReading(true);
    setReadError(undefined);
    try {
      if (currentBet) {
        const key = pending.current!.chave;
        const current = await auth.service.read(async () =>
          validarAposta(
            (
              await api.GET('/api/v1/resultados/apostas/{chave}', {
                signal: controller.signal,
                params: { path: { chave: key } },
              })
            ).data,
            key,
          ),
        );
        if (!alive.current || controller.signal.aborted || !scope.isCurrent())
          return;
        if (
          pending.current?.tipo === 'undo' &&
          current.revisao !== pending.current.body.revisao_esperada
        ) {
          const target = pending.current.body.operacao_id;
          setUndoBlocked((previous) => [...new Set([...previous, target])]);
        }
        clearIdentity();
        op.reconciled();
        await restart();
      } else {
        const value = await auth.service.read(async () =>
          validarRecibo(
            (
              await api.GET('/api/v1/resultados/operacoes/{intention_id}', {
                signal: controller.signal,
                params: { path: { intention_id: id } },
              })
            ).data,
            id,
            pending.current
              ? {
                  chave: pending.current.chave,
                  tipo: pending.current.tipo,
                  ...(pending.current.tipo === 'undo'
                    ? { alvo: pending.current.body.operacao_id }
                    : {}),
                }
              : undefined,
          ),
        );
        if (alive.current && !controller.signal.aborted && scope.isCurrent())
          install(value);
      }
    } catch (cause) {
      if (alive.current && !controller.signal.aborted && scope.isCurrent())
        setReadError(cause);
    } finally {
      if (alive.current) setReading(false);
    }
  }
  async function restart() {
    if (fila.isFetching || filaWaiting || (id && pending.current)) return;
    setConsumed([]);
    await queries.resetQueries({
      queryKey: ['resultados-fila', epoch, signature],
      exact: true,
    });
  }
  const definiteError =
    op.error instanceof ApiError &&
    op.error.status >= 400 &&
    op.error.status < 500;
  return (
    <main className="pagina resultados-pagina">
      <header className="resultados-cabecalho">
        <div>
          <p className="legenda">CONFERÊNCIA</p>
          <h1>Resultados</h1>
          <p>Marque cada aposta e siga para a próxima.</p>
        </div>
        <Link to={'/' + (search.toString() ? '?' + search.toString() : '')}>
          Ver Apostas
        </Link>
      </header>
      <p role="status" className="somente-leitor">
        {op.busy
          ? 'Registrando pedido.'
          : recibos[0]
            ? `${recibos[0].tipo === 'undo' ? 'Desfeito' : rotuloEstado(recibos[0].aposta.estado)} confirmado para ${recibos[0].aposta.evento ?? 'a aposta'}.`
            : ''}
      </p>
      <details
        className="resultados-filtros"
        onToggle={(event) => setFiltersOpen(event.currentTarget.open)}
      >
        <summary>Filtros da fila</summary>
        {filtersOpen && <Filtros recurso="resultados" catalogos={catalogos} />}
      </details>
      {!!visao.invalidos.length && (
        <p role="status">
          Filtros inválidos no endereço usam o padrão. Abra os filtros para
          conferir.
        </p>
      )}
      {!op.can(REGISTRAR) && access?.phase !== 'checking' && (
        <section className="resultados-nota">
          <h2>Resultados em consulta</h2>
          <p>
            Seu acesso permite consultar. Para registrar ou desfazer, confira a
            assinatura.
          </p>
          <Link to={'/assinatura?' + search.toString()}>Ver assinatura</Link>
        </section>
      )}
      {rawId && !id && (
        <p role="status">
          A referência inválida no endereço foi desconsiderada. Nenhum pedido
          foi repetido.
        </p>
      )}
      {adapter.bloqueios.length > 0 && (
        <section className="resultados-nota">
          <h2>Confira os filtros</h2>
          {adapter.bloqueios.map((message) => (
            <p key={message}>{message}</p>
          ))}
          <p>
            Abra “Filtros da fila” para remover os filtros que esta consulta não
            aceita.
          </p>
        </section>
      )}
      {snapshot && (
        <div className="resultados-resumo">
          <p>
            <strong className="numero">{snapshot.total_elegivel}</strong>{' '}
            pendentes na última consulta
          </p>
          <p>
            <strong className="numero">
              {
                recibos.filter(
                  (r) => r.tipo === 'result' && !restored.has(r.id),
                ).length
              }
            </strong>{' '}
            confirmados nesta sessão
          </p>
          <span className="legenda">
            Consulta: {dataHora(snapshot.observado_em, 'America/Sao_Paulo')}
          </span>
        </div>
      )}
      {writeWaiting && (
        <p role="status">
          O serviço pediu uma pausa nas gravações. As consultas continuam
          disponíveis.
        </p>
      )}
      {op.error !== undefined && (
        <ErroApi
          error={op.error}
          intent="gravacao"
          fields={CAMPOS_RESULTADO}
          destination={'/resultados?' + search.toString()}
        />
      )}
      {id && (
        <section className="resultados-nota">
          <h2>
            {op.busy ? 'Registrando resultado…' : 'Consultar este pedido'}
          </h2>
          <p>
            A referência foi preservada. Uma consulta confirma o que o serviço
            recebeu; ela não repete a gravação.
          </p>
          <button
            type="button"
            disabled={reading || op.busy || readWaiting}
            onClick={() => void lookup()}
          >
            Consultar resultado do pedido
          </button>
          {definiteError && pendingIntent && (
            <button
              type="button"
              disabled={reading || op.busy || readWaiting}
              onClick={() => void lookup(true)}
            >
              Consultar aposta atual
            </button>
          )}
          {readError instanceof ApiError &&
            readError.status === 404 &&
            pendingIntent && (
              <>
                <p>
                  O pedido ainda não foi encontrado. Isso não comprova que a
                  gravação falhou.
                </p>
                <button
                  type="button"
                  disabled={
                    reading ||
                    op.busy ||
                    readWaiting ||
                    op.waiting ||
                    writeWaiting
                  }
                  onClick={() => void send(pending.current!, true)}
                >
                  Reenviar exatamente este pedido
                </button>
              </>
            )}
        </section>
      )}
      {readError !== undefined && (
        <ErroApi
          error={readError}
          intent="leitura"
          actions={{ tentar: () => void lookup() }}
        />
      )}
      {fila.error && (
        <ErroApi
          error={fila.error}
          intent="leitura"
          actions={{ tentar: () => void fila.refetch() }}
        />
      )}
      {fila.isPending && !adapter.bloqueios.length && (
        <p role="status" className="consulta-carregando">
          Consultando apostas pendentes…
        </p>
      )}
      {atual && (
        <section
          className="resultado-atual"
          aria-labelledby="resultado-evento"
          aria-busy={op.busy}
        >
          <div className="resultado-meta">
            <span>
              {atual.casa ?? 'Casa não informada'} · {contextoConta(atual)}
            </span>
            <span>PENDENTE</span>
          </div>
          <h2 id="resultado-evento">
            {atual.evento ?? 'Aposta sem evento informado'}
          </h2>
          <p className="resultado-descricao">
            {atual.descricao ?? 'Descrição não informada'}
          </p>
          <p className="legenda">
            {atual.mercado ?? 'Mercado não informado'} ·{' '}
            {dataHora(atual.antiguidade, 'America/Sao_Paulo')}{' '}
            {atual.criterio_antiguidade === 'criada_em'
              ? '(data de criação)'
              : '(jogo)'}
          </p>
          <dl className="resultado-valores">
            <div>
              <dt>{atual.freebet ? 'Freebet · valor de face' : 'Valor'}</dt>
              <dd className="numero">{moeda(atual.valor_aposta_centavos)}</dd>
            </div>
            <div>
              <dt>Odd</dt>
              <dd className="numero">{odd(atual.odd)}</dd>
            </div>
          </dl>
          <div className="resultado-acoes">
            <button
              ref={green}
              type="button"
              className="resultado-green"
              disabled={writeBlocked}
              onClick={(event) => void register(atual, 'GREEN', event)}
            >
              GREEN
            </button>
            <button
              type="button"
              className="resultado-red"
              disabled={writeBlocked}
              onClick={(event) => void register(atual, 'RED', event)}
            >
              RED
            </button>
            <button
              type="button"
              disabled={writeBlocked}
              onClick={() => setOutro(outro ? undefined : 'ANULADA')}
            >
              Outro resultado
            </button>
          </div>
          {outro && (
            <form
              className="resultado-outro"
              onSubmit={(event) => {
                event.preventDefault();
                void register(atual, outro);
              }}
            >
              <EscolhaFiltro
                label="Resultado"
                value={outro}
                options={OUTROS.map((value) => ({
                  value,
                  label: rotuloEstado(value),
                }))}
                resetLabel="Escolha o resultado"
                onChange={(value) => {
                  if (OUTROS.includes(value as (typeof OUTROS)[number]))
                    setOutro(value as Pedido['estado']);
                }}
                disabled={writeBlocked}
              />
              {outro === 'CASHOUT' ? (
                <label>
                  Valor pago no cashout (R$)
                  <input
                    id="resultado-cashout"
                    inputMode="decimal"
                    value={cashout}
                    onChange={(event) => setCashout(event.target.value)}
                    disabled={writeBlocked}
                    required
                  />
                </label>
              ) : (
                <details>
                  <summary>Retorno e comissão informados pela casa</summary>
                  <label>
                    Retorno pago (R$) · opcional
                    <input
                      id="resultado-retorno"
                      inputMode="decimal"
                      value={retorno}
                      onChange={(event) => setRetorno(event.target.value)}
                      disabled={writeBlocked}
                    />
                  </label>
                  <label>
                    Comissão (R$) · opcional
                    <input
                      id="resultado-comissao"
                      inputMode="decimal"
                      value={comissao}
                      onChange={(event) => setComissao(event.target.value)}
                      disabled={writeBlocked}
                    />
                  </label>
                </details>
              )}
              <button type="submit" disabled={writeBlocked}>
                Registrar resultado
              </button>
            </form>
          )}
          {localError && <p role="alert">{localError}</p>}
          <Link
            className="legenda"
            to={
              '/aposta/' +
              encodeURIComponent(atual.chave) +
              '?' +
              search.toString()
            }
          >
            Ver detalhe da aposta
          </Link>
        </section>
      )}
      {!atual &&
        !fila.isPending &&
        !fila.isFetching &&
        !fila.error &&
        !adapter.bloqueios.length && (
          <section className="resultados-nota">
            <h2>Nenhuma aposta pendente nesta fila</h2>
            <p>
              As apostas sem conta ou com revisão necessária ficam em suas áreas
              de conferência.
            </p>
            <Link to={'/?' + search.toString()}>Conferir em Apostas</Link>
            <button
              type="button"
              disabled={blocked || filaWaiting}
              onClick={() => void restart()}
            >
              Consultar nova fila
            </button>
          </section>
        )}
      {fila.isFetchingNextPage && (
        <p role="status">Consultando próximas apostas…</p>
      )}
      <div className="resultados-colunas">
        <section>
          <h2>A seguir</h2>
          <p className="legenda">
            Mais antigas primeiro, pela data do jogo ou criação.
          </p>
          <ol className="resultados-proximas">
            {items.slice(1).map((item) => (
              <li key={item.chave}>
                <span>
                  <strong>{item.evento ?? 'Evento não informado'}</strong>
                  <small>
                    {item.casa ?? 'Casa não informada'} ·{' '}
                    {item.descricao ?? 'Descrição não informada'}
                  </small>
                </span>
                <span className="numero">{odd(item.odd)}</span>
              </li>
            ))}
          </ol>
          {fila.hasNextPage && (
            <button
              type="button"
              disabled={fila.isFetching || filaWaiting || blocked}
              onClick={() => void fila.fetchNextPage()}
            >
              Carregar próximas apostas
            </button>
          )}
          <button
            type="button"
            disabled={blocked || fila.isFetching || filaWaiting}
            onClick={() => void restart()}
          >
            Atualizar fila
          </button>
        </section>
        <section>
          <h2>Confirmados nesta sessão</h2>
          <p className="legenda">
            Resultados salvos. Desfazer verifica se outra origem alterou a
            aposta.
          </p>
          {recibos.length === 0 ? (
            <p>Os resultados confirmados aparecerão aqui.</p>
          ) : (
            <ol className="resultados-confirmados">
              {recibos.map((receipt) => (
                <li key={receipt.id}>
                  <div>
                    <strong>
                      {receipt.aposta.evento ?? 'Evento não informado'}
                    </strong>
                    <span>
                      {receipt.tipo === 'undo'
                        ? 'Desfeito'
                        : rotuloEstado(receipt.aposta.estado)}
                      {restored.has(receipt.id) ? ' · desfeito' : ''}
                    </span>
                    <small>
                      Lucro confirmado:{' '}
                      <span className="numero">
                        {moeda(receipt.aposta.lucro_centavos)}
                      </span>
                    </small>
                  </div>
                  {receipt.tipo === 'result' && !restored.has(receipt.id) && (
                    <button
                      type="button"
                      disabled={
                        blocked ||
                        !op.can(DESFAZER) ||
                        undoBlocked.includes(receipt.id)
                      }
                      onClick={() => void undo(receipt)}
                    >
                      {undoBlocked.includes(receipt.id)
                        ? 'Alterada depois da confirmação'
                        : 'Desfazer'}
                      <span className="somente-leitor">
                        {' '}
                        {receipt.aposta.evento ?? 'resultado'}
                      </span>
                    </button>
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </main>
  );
}
