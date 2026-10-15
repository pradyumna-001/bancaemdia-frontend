import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { getApiClient } from '../../api/client';
import { ApiError } from '../../api/error';
import { useAuth } from '../../auth/ProvedorAuth';
import { ErroApi } from '../../components/ErroApi';
import { FotoAposta } from '../../components/FotoAposta';
import { EscolhaFiltro } from '../../components/filtros/EscolhaFiltro';
import { DataFiltro } from '../../components/filtros/DataFiltro';
import { dataHora, decimal, moeda, odd } from '../../lib/format';
import { useRetryAfter } from '../../lib/useRetryAfter';
import { CAMPOS, type Rascunho } from '../apostas/detalhe/protocol';
import { useOperacao } from '../importar/useOperacao';
import { useLeituraPainel } from '../painel/useLeituraPainel';
import { CHAVE_REVISAO } from './estatisticas';
import {
  ACOES,
  EXPLICACOES,
  FAMILIAS,
  POST,
  caminhoRevisao,
  decidir,
  idValido,
  lerRevisao,
  rascunhoInicial,
  uuidValido,
  validarFila,
  validarRecibo,
  validarRevisao,
  type Fonte,
  type Pedido,
  type Recibo,
  type Revisao,
} from './protocol';
import './revisao.css';

type Intento = { id: string; body: Pedido };
export function RevisaoPage({
  client,
}: {
  client?: ReturnType<typeof getApiClient>;
}) {
  const auth = useAuth();
  return auth &&
    (auth.state.phase === 'authenticated' ||
      (auth.state.phase === 'checking' && auth.state.person)) ? (
    <Revisoes key={auth.state.privateEpoch} api={client ?? getApiClient()} />
  ) : (
    <main className="pagina">
      <h1>Revisão</h1>
      <p role="status">Consultando sessão…</p>
    </main>
  );
}
function Revisoes({ api }: { api: ReturnType<typeof getApiClient> }) {
  const auth = useAuth()!;
  const epoch = auth.state.privateEpoch;
  const queries = useQueryClient();
  const [search, setSearch] = useSearchParams();
  const latestSearch = useRef(search);
  useLayoutEffect(() => {
    latestSearch.current = search;
  }, [search]);
  const view = lerRevisao(search);
  const read = useLeituraPainel();
  const op = useOperacao();
  const { cancel } = op;
  const alive = useRef(true);
  const acting = useRef(false);
  const [sending, setSending] = useState(false);
  const controller = useRef<AbortController>();
  const [pending, setPending] = useState<Intento>();
  const pendingRef = useRef<Intento>();
  const queued = useRef<Intento>();
  const dispatch = useRef<(intent: Intento) => Promise<void>>();
  const [reading, setReading] = useState(false);
  const [lookupError, setLookupError] = useState<unknown>();
  const [formError, setFormError] = useState<ApiError>();
  const [replayAllowed, setReplayAllowed] = useState(false);
  const [consulted, setConsulted] = useState(false);
  const lookupWait = useRetryAfter(lookupError);
  const [receipt, setReceipt] = useState<Recibo>();
  const [message, setMessage] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const operation = search.get('revisao_operacao');
  const operationValid =
    uuidValido(operation) && search.getAll('revisao_operacao').length === 1;
  const unresolved = !!operation || !!pending;
  const fila = useQuery({
    queryKey: ['revisao-operacional', epoch, 'fila', view.query],
    enabled: auth.state.phase === 'authenticated',
    queryFn: ({ signal }) =>
      read.read(async () => {
        const value = validarFila(
          (
            await api.GET('/api/v1/revisao-operacional/fila', {
              signal,
              params: { query: view.query },
            })
          ).data,
        );
        if (value.page !== view.page) throw new ApiError('invalid_response');
        return value;
      }),
    retryOnMount: false,
    refetchOnWindowFocus: false,
  });
  const filaWait = useRetryAfter(fila.error);
  const selected =
    search.getAll('revisao_item').length === 1 &&
    idValido(search.get('revisao_item'))
      ? search.get('revisao_item')!
      : fila.data?.data[0]?.id;
  const detail = useQuery({
    queryKey: ['revisao-operacional', epoch, 'item', selected],
    enabled: auth.state.phase === 'authenticated' && !!selected && !unresolved,
    queryFn: ({ signal }) =>
      read.read(async () =>
        validarRevisao(
          (
            await api.GET('/api/v1/revisao-operacional/revisoes/{revisao_id}', {
              ...caminhoRevisao(selected!),
              signal,
            })
          ).data,
          selected,
        ),
      ),
    retryOnMount: false,
    refetchOnWindowFocus: false,
  });
  const detailWait = useRetryAfter(detail.error);
  const locked =
    sending ||
    auth.state.phase !== 'authenticated' ||
    unresolved ||
    op.busy ||
    reading ||
    op.waiting ||
    read.waiting ||
    filaWait ||
    detailWait;
  const writeBlocked =
    locked ||
    fila.isFetching ||
    detail.isFetching ||
    !!detail.error ||
    !op.can(POST);
  function change(
    values: Record<string, string | undefined>,
    resetPage = false,
  ) {
    const next = new URLSearchParams(latestSearch.current);
    for (const [key, value] of Object.entries(values)) {
      next.delete(key);
      if (value) next.set(key, value);
    }
    if (resetPage) {
      next.delete('revisao_pagina');
      next.delete('revisao_item');
    }
    if (next.toString() === latestSearch.current.toString()) return;
    setFormError(undefined);
    latestSearch.current = next;
    setSearch(next, { replace: true });
  }
  useEffect(() => {
    alive.current = true;
    const clean = () => {
      controller.current?.abort();
      pendingRef.current = undefined;
      queued.current = undefined;
      setSending(false);
      setPending(undefined);
      setReceipt(undefined);
      setMessage('');
      setLookupError(undefined);
      setFormError(undefined);
      void queries.cancelQueries({ queryKey: ['revisao-operacional', epoch] });
      queries.removeQueries({ queryKey: ['revisao-operacional', epoch] });
    };
    const unregister = auth.service.registerCleanup(clean);
    return () => {
      alive.current = false;
      clean();
      unregister();
      cancel();
    };
  }, [auth.service, queries, epoch, cancel]);
  useEffect(() => {
    if (message && !locked && !fila.isFetching) heading.current?.focus();
  }, [message, locked, fila.isFetching]);
  function clearIntent(restart = false) {
    pendingRef.current = undefined;
    setPending(undefined);
    setReplayAllowed(false);
    setConsulted(false);
    change({
      revisao_operacao: undefined,
      ...(restart
        ? { revisao_pagina: undefined, revisao_item: undefined }
        : {}),
    });
    op.reconciled();
    setLookupError(undefined);
    setFormError(undefined);
  }
  async function install(value: Recibo) {
    setReceipt(value);
    clearIntent(true);
    setMessage(
      'Revisão resolvida. A fila foi consultada novamente desde o início.',
    );
    await queries.invalidateQueries({
      queryKey: ['revisao-operacional', epoch],
    });
    for (const key of [
      CHAVE_REVISAO,
      ['apostas'],
      ['aposta'],
      ['painel'],
      ['resumo-apostas'],
    ])
      void queries.invalidateQueries({ queryKey: key });
  }
  async function send(intent: Intento, explicitReplay = false) {
    let refused: ApiError | undefined;
    const value = await op.run(
      POST,
      async (signal) => {
        try {
          return validarRecibo(
            (
              await api.POST(
                '/api/v1/revisao-operacional/operacoes/{operacao_id}',
                {
                  signal,
                  params: { path: { operacao_id: intent.id } },
                  body: intent.body,
                },
              )
            ).data,
            intent.id,
            intent.body,
          );
        } catch (cause) {
          if (cause instanceof ApiError && cause.status === 422)
            refused = cause;
          throw cause;
        }
      },
      explicitReplay,
    );
    if (
      refused &&
      alive.current &&
      auth.service.getSnapshot().privateEpoch === epoch
    ) {
      // The published 422 refusal commits no operation. Keep editable inputs and
      // obtain current evidence before another, separate gesture.
      clearIntent();
      setFormError(refused);
      void detail.refetch();
    } else if (value && alive.current) await install(value);
  }
  async function submit(body: Pedido) {
    if (acting.current || writeBlocked || detail.data?.id !== body.revisao_id)
      return;
    acting.current = true;
    setSending(true);
    setReceipt(undefined);
    setMessage('');
    setLookupError(undefined);
    const intent = { id: crypto.randomUUID(), body };
    pendingRef.current = intent;
    queued.current = intent;
    setPending(intent);
    setReplayAllowed(false);
    setConsulted(false);
    change({ revisao_operacao: intent.id });
  }
  useLayoutEffect(() => {
    dispatch.current = send;
  });
  // The router must commit the UUID before the first POST can be dispatched.
  useEffect(() => {
    const intent = queued.current;
    if (intent && operation === intent.id) {
      queued.current = undefined;
      void dispatch.current?.(intent).finally(() => {
        acting.current = false;
        if (alive.current && auth.service.getSnapshot().privateEpoch === epoch)
          setSending(false);
      });
    }
  }, [operation, pending, auth.service, epoch]);
  async function lookup(evidence = false) {
    if (
      auth.service.getSnapshot().phase !== 'authenticated' ||
      sending ||
      !operationValid ||
      reading ||
      op.busy ||
      lookupWait ||
      op.waiting ||
      (evidence && (!pendingRef.current || !consulted))
    )
      return;
    const scope = auth.service.capture();
    const request = new AbortController();
    controller.current = request;
    const sameOwner = () =>
      alive.current &&
      !request.signal.aborted &&
      auth.service.getSnapshot().privateEpoch === epoch;
    const current = () => sameOwner() && scope.isCurrent();
    setReading(true);
    setLookupError(undefined);
    setReplayAllowed(false);
    try {
      if (evidence) {
        const itemId = pendingRef.current!.body.revisao_id;
        const item = await read.read(async () =>
          validarRevisao(
            (
              await api.GET(
                '/api/v1/revisao-operacional/revisoes/{revisao_id}',
                { ...caminhoRevisao(itemId), signal: request.signal },
              )
            ).data,
            itemId,
          ),
        );
        if (!current()) return;
        queries.setQueryData(
          ['revisao-operacional', epoch, 'item', itemId],
          item,
        );
        clearIntent();
        setMessage(
          item.estado === 'resolvida'
            ? 'Esta revisão já foi resolvida. Isso não confirma o resultado da sua intenção anterior.'
            : 'Evidência atualizada. Confira o formulário preservado antes de enviar uma nova decisão.',
        );
        void fila.refetch();
      } else {
        const value = await read.read(async () =>
          validarRecibo(
            (
              await api.GET(
                '/api/v1/revisao-operacional/operacoes/{operacao_id}',
                {
                  params: { path: { operacao_id: operation! } },
                  signal: request.signal,
                },
              )
            ).data,
            operation!,
            pendingRef.current?.body,
          ),
        );
        if (current()) await install(value);
      }
    } catch (cause) {
      if (current()) {
        setLookupError(cause);
        setConsulted(
          cause instanceof ApiError && [404, 410].includes(cause.status),
        );
        setReplayAllowed(
          cause instanceof ApiError &&
            cause.status === 404 &&
            !!pendingRef.current &&
            !(op.error instanceof ApiError && op.error.status === 409),
        );
      }
    } finally {
      if (sameOwner()) {
        setReading(false);
        if (!scope.isCurrent()) setLookupError(new ApiError('cancelled'));
      }
    }
  }
  const preserved = [
    'casa',
    'tipster',
    'grupo',
    'banca',
    'estado',
    'origem',
    'desde',
    'ate',
    'apagadas',
  ].some((key) => search.has(key));
  return (
    <main className="pagina revisao-pagina">
      <header className="revisao-cabecalho">
        <div>
          <p className="legenda">CONFERIR E CONTINUAR</p>
          <h1 ref={heading} tabIndex={-1}>
            Revisão
          </h1>
          <p>Resolva o que precisa da sua decisão, uma pendência por vez.</p>
        </div>
        <div className="revisao-acoes">
          <button
            disabled={locked || fila.isFetching || detail.isFetching}
            onClick={() => {
              void queries.invalidateQueries({
                queryKey: ['revisao-operacional', epoch],
              });
              void queries.invalidateQueries({ queryKey: CHAVE_REVISAO });
            }}
          >
            Consultar fila novamente
          </button>
          <Link to={'/enviar?' + search.toString()}>Enviar novas apostas</Link>
        </div>
      </header>
      <fieldset className="revisao-filtros" disabled={locked}>
        <legend>Recorte da fila</legend>
        <EscolhaFiltro
          label="Motivo"
          value={view.familia}
          resetLabel="Todos os motivos"
          options={Object.entries(FAMILIAS).map(([value, label]) => ({
            value,
            label,
          }))}
          onChange={(value) => change({ motivo: value }, true)}
        />
        <DataFiltro
          label="Aberta desde"
          value={view.desde}
          onChange={(value) => change({ aberta_desde: value }, true)}
        />
        <DataFiltro
          label="Aberta até"
          value={view.ate}
          onChange={(value) => change({ aberta_ate: value }, true)}
        />
      </fieldset>
      <div
        className="revisao-pilulas"
        role="group"
        aria-label="Filtros ativos da revisão"
      >
        {view.familia && (
          <button
            disabled={locked}
            onClick={() => change({ motivo: undefined }, true)}
          >
            {FAMILIAS[view.familia]} · remover
          </button>
        )}
        {view.desde && (
          <button
            disabled={locked}
            onClick={() => change({ aberta_desde: undefined }, true)}
          >
            Desde {view.desde} · remover
          </button>
        )}
        {view.ate && (
          <button
            disabled={locked}
            onClick={() => change({ aberta_ate: undefined }, true)}
          >
            Até {view.ate} · remover
          </button>
        )}
      </div>
      <p className="legenda">
        O período considera a abertura da pendência, no fuso de São Paulo.{' '}
        {preserved &&
          'Os filtros de Apostas estão preservados na URL; esta fila usa somente motivo e abertura.'}
      </p>
      {message && (
        <p role="status" className="revisao-aviso">
          {message}
        </p>
      )}
      {receipt && (
        <p className="legenda">
          {ACOES[receipt.acao]} · confirmado em{' '}
          {dataHora(receipt.confirmado_em, 'America/Sao_Paulo')}
          {receipt.aposta_chave && (
            <>
              {' '}
              ·{' '}
              <Link
                to={
                  '/aposta/' +
                  encodeURIComponent(receipt.aposta_chave) +
                  '?' +
                  search.toString()
                }
              >
                Ver aposta
              </Link>
            </>
          )}
        </p>
      )}
      {fila.isPending && <p role="status">Consultando pendências…</p>}
      {fila.error && (
        <ErroApi
          error={fila.error}
          intent="leitura"
          actions={!locked ? { tentar: () => void fila.refetch() } : {}}
          destination={'/revisao?' + search.toString()}
        />
      )}
      {operation && (
        <section
          className="revisao-aviso"
          aria-label="Conferir decisão anterior"
        >
          <h2>Confira o resultado antes de continuar</h2>
          {sending && <p role="status">Enviando decisão…</p>}
          <p>
            Consulte esta decisão pela mesma referência. Uma resposta ausente ou
            expirada não prova que a alteração foi desfeita.
          </p>
          {!operationValid ? (
            <>
              <p role="alert">
                A referência na URL é inválida. Nenhuma decisão foi enviada por
                ela.
              </p>
              <button onClick={() => clearIntent()}>
                Remover referência inválida
              </button>
            </>
          ) : (
            <div className="revisao-acoes">
              <button
                disabled={
                  sending ||
                  auth.state.phase !== 'authenticated' ||
                  reading ||
                  op.busy ||
                  lookupWait ||
                  op.waiting
                }
                onClick={() => void lookup()}
              >
                Consultar decisão
              </button>
              {pending && consulted && (
                <button
                  disabled={
                    sending ||
                    auth.state.phase !== 'authenticated' ||
                    reading ||
                    op.busy ||
                    lookupWait ||
                    op.waiting
                  }
                  onClick={() => void lookup(true)}
                >
                  Reler pendência antes de nova decisão
                </button>
              )}
              {pending && replayAllowed && (
                <button
                  disabled={
                    sending || reading || op.busy || op.waiting || !op.can(POST)
                  }
                  onClick={() => void send(pending, true)}
                >
                  Reenviar a mesma decisão
                </button>
              )}
            </div>
          )}
          {!pending && (
            <p>
              O formulário anterior não é reconstruído após recarregar a página.
            </p>
          )}
          {!pending && consulted && (
            <button onClick={() => clearIntent()}>
              Voltar à fila sem reconstruir a decisão
            </button>
          )}
          {reading && <p role="status">Consultando resultado…</p>}
        </section>
      )}
      {!!(op.error || formError) && (
        <ErroApi
          error={formError ?? op.error}
          fields={
            writeBlocked
              ? []
              : [
                  ...CAMPOS.map(([field, label]) => ({
                    scope: 'body' as const,
                    field,
                    id: 'revisao-' + field,
                    label,
                  })),
                  {
                    scope: 'body',
                    field: 'aposta_corrigida',
                    id: 'revisao-evento',
                    label: 'Leitura corrigida',
                  },
                  {
                    scope: 'body',
                    field: 'conta_casa_id',
                    id: 'revisao-conta',
                    label: 'Conta da aposta',
                  },
                  {
                    scope: 'body',
                    field: 'tipster_choice',
                    id: 'revisao-tipster',
                    label: 'Tipster',
                  },
                ]
          }
          intent="gravacao"
          destination={'/revisao?' + search.toString()}
        />
      )}
      {!!lookupError && (
        <ErroApi
          error={lookupError}
          intent="leitura"
          destination={'/revisao?' + search.toString()}
        />
      )}
      {fila.data && (
        <>
          <div className="revisao-contagem">
            <strong className="numero">
              {fila.data.total_filtrado}{' '}
              {fila.data.total_filtrado === 1 ? 'pendência' : 'pendências'}{' '}
              neste recorte
            </strong>
            <span>
              {fila.data.total_global} no total · consulta de{' '}
              {dataHora(fila.data.observado_em, 'America/Sao_Paulo')}
            </span>
          </div>
          <details>
            <summary>Quantidade por motivo neste recorte</summary>
            <ul>
              {Object.entries(FAMILIAS).map(([family, label]) => (
                <li key={family}>
                  {label}:{' '}
                  <span className="numero">
                    {fila.data!.por_familia_filtrado[family] ?? 'Não informado'}
                  </span>
                </li>
              ))}
            </ul>
          </details>
          {!fila.data.data.length && (
            <section className="revisao-vazia">
              <h2>
                {fila.data.total_filtrado
                  ? 'Não há pendências nesta página'
                  : 'Tudo conferido neste recorte'}
              </h2>
              <p>Você pode consultar outros motivos ou voltar às apostas.</p>
              <div className="revisao-acoes">
                <button
                  disabled={locked}
                  onClick={() =>
                    change(
                      {
                        motivo: undefined,
                        aberta_desde: undefined,
                        aberta_ate: undefined,
                      },
                      true,
                    )
                  }
                >
                  Consultar toda a fila
                </button>
                <Link to={'/?' + search.toString()}>Voltar para Apostas</Link>
              </div>
            </section>
          )}
          <div className="revisao-trabalho">
            {!!fila.data.data.length && (
              <aside aria-label="Pendências">
                <ul className="revisao-lista">
                  {fila.data.data.map((item) => (
                    <li key={item.id}>
                      <button
                        aria-current={selected === item.id ? 'true' : undefined}
                        disabled={locked}
                        onClick={() => {
                          setMessage('');
                          change({ revisao_item: item.id });
                        }}
                      >
                        <strong>{FAMILIAS[item.familia]}</strong>
                        <span>
                          {item.fontes[0]?.evento ??
                            item.print_evento ??
                            'Pendência para conferir'}
                        </span>
                        <small>
                          Aberta em{' '}
                          {dataHora(item.criado_em, 'America/Sao_Paulo')}
                        </small>
                      </button>
                    </li>
                  ))}
                </ul>
              </aside>
            )}
            <div className="revisao-detalhe">
              {detail.isFetching && (
                <p role="status">Conferindo evidência atual…</p>
              )}
              {detail.error && (
                <ErroApi
                  error={detail.error}
                  intent="leitura"
                  actions={
                    !locked ? { tentar: () => void detail.refetch() } : {}
                  }
                />
              )}
              {detail.data && (
                <Editor
                  key={detail.data.id}
                  item={detail.data}
                  api={api}
                  blocked={writeBlocked}
                  search={search.toString()}
                  onSubmit={submit}
                />
              )}
            </div>
          </div>
          <nav className="revisao-acoes" aria-label="Páginas da revisão">
            <button
              disabled={locked || fila.isFetching || view.page === 1}
              onClick={() =>
                change({
                  revisao_pagina: String(view.page - 1),
                  revisao_item: undefined,
                })
              }
            >
              Página anterior
            </button>
            <span className="numero">Página {view.page}</span>
            <button
              disabled={
                locked ||
                fila.isFetching ||
                view.page * fila.data.page_size >= fila.data.total_filtrado
              }
              onClick={() =>
                change({
                  revisao_pagina: String(view.page + 1),
                  revisao_item: undefined,
                })
              }
            >
              Próxima página
            </button>
          </nav>
        </>
      )}
    </main>
  );
}
function Editor({
  item,
  api,
  blocked,
  search,
  onSubmit,
}: {
  item: Revisao;
  api: ReturnType<typeof getApiClient>;
  blocked: boolean;
  search: string;
  onSubmit: (body: Pedido) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Rascunho>(() => rascunhoInicial(item));
  const [conta, setConta] = useState('');
  const [tipster, setTipster] = useState('');
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState<Pedido>();
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>();
  const submitter = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const modal = dialog.current;
    return () => modal?.close();
  }, []);
  function prepare(acao: Pedido['acao'], button: HTMLButtonElement) {
    if (blocked) return;
    try {
      const body = decidir(item, acao, draft, conta, tipster);
      setError('');
      if (acao === 'CORRIGIR') void onSubmit(body);
      else {
        setConfirmation(body);
        opener.current = button;
        dialog.current!.showModal();
        dialog.current!.querySelector('button')?.focus();
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Confira os campos informados.',
      );
    }
  }
  const correcting =
    item.acoes.includes('CORRIGIR') && item.familia !== 'conta';
  return (
    <section className="revisao-editor" aria-label="Pendência selecionada">
      <p className="legenda">
        {FAMILIAS[item.familia]} · revisão {item.id}
      </p>
      <h2>
        {item.fontes[0]?.evento ?? item.print_evento ?? FAMILIAS[item.familia]}
      </h2>
      <p>{EXPLICACOES[item.familia]}</p>
      {item.estado === 'resolvida' && (
        <p role="status">Esta revisão já foi resolvida.</p>
      )}
      {item.fontes.length > 0 && (
        <div className="revisao-fontes">
          {item.fontes.map((fonte) => (
            <Evidencia key={fonte.chave} fonte={fonte} />
          ))}
        </div>
      )}
      {item.foto_url && (
        <details>
          <summary>Conferir foto original</summary>
          <FotoAposta
            chave={item.id}
            revisaoId={item.id}
            client={api}
            destination={'/revisao?' + search}
          />
        </details>
      )}
      {item.conta && (
        <section>
          <h3>Conta da aposta</h3>
          <p>
            {item.conta.casa ?? 'Casa não informada'} ·{' '}
            {item.conta.instante
              ? dataHora(item.conta.instante, 'America/Sao_Paulo')
              : 'Data do jogo não informada'}
          </p>
          <EscolhaFiltro
            id="revisao-conta"
            label="Conta para esta aposta"
            selectedLabel={!conta ? 'Escolha uma conta' : undefined}
            value={conta}
            resetLabel="Escolha uma conta"
            options={item.conta.candidatos
              .filter((c) => c.elegivel_escolha_explicita)
              .map((c) => ({
                value: c.id,
                label: `${c.apelido} · ${c.titular?.nome ?? 'Sem titular'} · ${c.estado}${c.coincide_no_dia_do_jogo ? ' · corresponde ao dia do jogo' : ' · escolha explícita'}`,
              }))}
            disabled={blocked}
            onChange={(v) => setConta(v ?? '')}
          />
          {item.conta.encaminhamento === 'cadastrar_conta_na_casa' && (
            <p>
              Cadastre uma conta para esta casa e depois consulte novamente a
              pendência.{' '}
              <Link to={'/contas?' + search}>Ir para Contas e titulares</Link>
            </p>
          )}
          {item.conta.encaminhamento === 'informar_casa' && (
            <p>
              A casa precisa ser identificada antes da atribuição.{' '}
              {item.fontes[0] ? (
                <Link
                  to={
                    '/aposta/' +
                    encodeURIComponent(item.fontes[0].chave) +
                    '?' +
                    search
                  }
                >
                  Informar casa na aposta
                </Link>
              ) : (
                <Link to={'/contas?' + search}>
                  Conferir Contas e titulares
                </Link>
              )}
            </p>
          )}
        </section>
      )}
      {item.par && (
        <section>
          <h3>Contexto que ficará na aposta</h3>
          <p>
            {item.par.escolha_tipster_obrigatoria
              ? 'Há tipsters diferentes. Escolha explicitamente qual deve ficar ao confirmar a mesma aposta.'
              : 'Confira o contexto das duas fontes antes de confirmar.'}
          </p>
          <EscolhaFiltro
            id="revisao-tipster"
            label="Tipster da aposta vinculada"
            selectedLabel={!tipster ? 'Escolha a fonte do tipster' : undefined}
            value={tipster}
            resetLabel="Escolha a fonte do tipster"
            options={item.par.tipster_opcoes.map((t) => ({
              value: t.fonte,
              label: `${t.rotulo} · ${t.tipster ?? 'Sem tipster'}`,
            }))}
            disabled={blocked}
            onChange={(v) => setTipster(v ?? '')}
          />
          {(item.par.busca_incompleta || item.par.concorrentes > 1) && (
            <p>
              Existem candidatos concorrentes ou a busca está incompleta.
              Confira as evidências com atenção.
            </p>
          )}
        </section>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (submitter.current) prepare('CORRIGIR', submitter.current);
        }}
      >
        {correcting && (
          <fieldset className="revisao-campos" disabled={blocked}>
            <legend>Conferir leitura</legend>
            {CAMPOS.map(([field, label, kind]) => (
              <label key={field} htmlFor={'revisao-' + field}>
                {label}
                <input
                  id={'revisao-' + field}
                  value={typeof draft[field] === 'string' ? draft[field] : ''}
                  inputMode={
                    kind === 'decimal' || kind === 'moeda'
                      ? 'decimal'
                      : undefined
                  }
                  placeholder={
                    kind === 'data' ? '15/10/2026 14:30-03:00' : undefined
                  }
                  onChange={(e) =>
                    setDraft((old) => ({ ...old, [field]: e.target.value }))
                  }
                />
              </label>
            ))}
            <label className="revisao-freebet">
              <input
                type="checkbox"
                checked={!!draft.freebet}
                onChange={(e) =>
                  setDraft((old) => ({ ...old, freebet: e.target.checked }))
                }
              />
              Freebet
            </label>
            <p className="legenda">
              Datas: dia/mês/ano, hora e fuso. Valores em unidades são os
              informados na aposta; o serviço determina os valores financeiros.
            </p>
          </fieldset>
        )}
        {error && <p role="alert">{error}</p>}
        <div className="revisao-acoes">
          {item.acoes.map((acao) =>
            acao === 'CORRIGIR' ? (
              <button
                ref={submitter}
                key={acao}
                type="submit"
                disabled={blocked}
              >
                {item.familia === 'conta' ? 'Confirmar conta' : ACOES[acao]}
              </button>
            ) : (
              <button
                key={acao}
                type="button"
                disabled={blocked}
                onClick={(e) => prepare(acao, e.currentTarget)}
              >
                {ACOES[acao]}
              </button>
            ),
          )}
        </div>
      </form>
      {item.encaminhamento === 'suporte' && (
        <p>
          Informe o número desta revisão ao suporte pelo canal combinado com a
          equipe. <Link to={'/?' + search}>Voltar para Apostas</Link>
        </p>
      )}
      <dialog
        ref={dialog}
        className="revisao-dialog"
        aria-labelledby="revisao-confirmacao"
        onClose={() => {
          setConfirmation(undefined);
          opener.current?.focus();
        }}
      >
        <h2 id="revisao-confirmacao">
          {confirmation ? ACOES[confirmation.acao] : 'Confirmar decisão'}?
        </h2>
        <p>
          {confirmation?.acao === 'DESCARTAR'
            ? item.familia === 'print_incompleto'
              ? 'O print sairá da fila sem criar uma aposta.'
              : 'A aposta será apagada e sairá dos totais. O histórico será preservado para restauração.'
            : 'A decisão ficará registrada no histórico. Confira as duas fontes antes de continuar.'}
        </p>
        <div className="revisao-acoes">
          <button onClick={() => dialog.current!.close()}>
            Voltar à revisão
          </button>
          <button
            disabled={blocked}
            onClick={() => {
              const body = confirmation;
              dialog.current!.close();
              if (body) void onSubmit(body);
            }}
          >
            Confirmar decisão
          </button>
        </div>
      </dialog>
    </section>
  );
}
function Evidencia({ fonte }: { fonte: Fonte }) {
  return (
    <section className="revisao-fonte">
      <h3>
        {fonte.papel === 'casa'
          ? 'Casa · valores financeiros'
          : fonte.papel === 'telegram'
            ? 'Telegram · contexto da dica'
            : 'Aposta recebida'}
      </h3>
      <p>{fonte.casa ?? fonte.origem}</p>
      <strong>{fonte.evento ?? 'Evento não informado'}</strong>
      <p>{fonte.descricao ?? 'Descrição não informada'}</p>
      <dl>
        {[
          ['Mercado', fonte.mercado ?? 'Não informado'],
          ['Tipster', fonte.tipster ?? 'Não informado'],
          ['Odd', odd(fonte.odd)],
          ['Unidades', decimal(fonte.stake_unidades)],
          ['Valor de face', moeda(fonte.valor_aposta_centavos)],
          ['Custo próprio', moeda(fonte.stake_centavos)],
          ['Retorno', moeda(fonte.retorno_centavos)],
          [
            'Data do jogo',
            fonte.data_jogo
              ? dataHora(fonte.data_jogo, 'America/Sao_Paulo')
              : 'Não informada',
          ],
        ].map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd className="numero">{value}</dd>
          </div>
        ))}
      </dl>
      {fonte.freebet && <p>Freebet</p>}
    </section>
  );
}
