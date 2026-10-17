import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { getApiClient } from '../../api/client';
import { ApiError } from '../../api/error';
import { useAuth } from '../../auth/ProvedorAuth';
import { ErroApi, type ErrorField } from '../../components/ErroApi';
import { EscolhaFiltro } from '../../components/filtros/EscolhaFiltro';
import { DataFiltro } from '../../components/filtros/DataFiltro';
import { dataHora, moeda } from '../../lib/format';
import { useRetryAfter } from '../../lib/useRetryAfter';
import { useOperacao } from '../importar/useOperacao';
import { useLeituraPainel } from '../painel/useLeituraPainel';
import { identificador } from '../contas/protocol';
import {
  POST,
  PATCH,
  TIPOS,
  TIPOS_ENTRADA,
  lerCaixa,
  pedido,
  validar,
  validarSaldo,
  validarExtrato,
  validarMovimento,
  validarRecibo,
  rotuloConta,
  type Pedido,
  type Recibo,
  type Matriz,
  type Extrato,
  type Movimento,
} from './protocol';
import './caixa.css';

const CAMPOS = [
  { scope: 'body', field: 'valor_centavos', id: 'caixa-valor', label: 'Valor' },
  {
    scope: 'body',
    field: 'ocorrido_em',
    id: 'caixa-instante',
    label: 'Data e hora',
  },
  {
    scope: 'body',
    field: 'descricao',
    id: 'caixa-descricao',
    label: 'Descrição',
  },
  {
    scope: 'body',
    field: 'conta_casa_id',
    id: 'caixa-origem',
    label: 'Conta de origem',
  },
  {
    scope: 'body',
    field: 'conta_casa_destino_id',
    id: 'caixa-destino',
    label: 'Conta de destino',
  },
] as const satisfies readonly ErrorField[];
type Pendente =
  | { kind: 'movimento'; key: string; body: Pedido }
  | { kind: 'vinculo'; conta: number; banca: number | null };
const UUID = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
export function CaixaPage({
  client,
}: {
  client?: ReturnType<typeof getApiClient>;
}) {
  const auth = useAuth();
  return auth &&
    (auth.state.phase === 'authenticated' ||
      (auth.state.phase === 'checking' && auth.state.person)) ? (
    <Caixa key={auth.state.privateEpoch} client={client} />
  ) : (
    <main className="pagina">
      <h1>Caixa</h1>
      <p role="status">Consultando sessão…</p>
    </main>
  );
}
function Caixa({ client }: { client?: ReturnType<typeof getApiClient> }) {
  const auth = useAuth()!;
  const api = client ?? getApiClient();
  const queries = useQueryClient();
  const [search, setSearch] = useSearchParams();
  const latestSearch = useRef(search);
  useLayoutEffect(() => {
    latestSearch.current = search;
  }, [search]);
  const view = lerCaixa(search);
  const read = useLeituraPainel();
  const op = useOperacao();
  const epoch = auth.state.privateEpoch;
  const alive = useRef(true);
  const pending = useRef<Pendente>();
  const lookupController = useRef<AbortController>();
  const [pendente, setPendente] = useState<Pendente>();
  const [consulted, setConsulted] = useState(false);
  const [executing, setExecuting] = useState(false);
  const acting = useRef(false);
  const [reading, setReading] = useState(false);
  const [recoveryError, setRecoveryError] = useState<unknown>();
  const recoveryWait = useRetryAfter(recoveryError);
  const [message, setMessage] = useState('');
  const [recibo, setRecibo] = useState<Recibo>();
  const [tipo, setTipo] = useState<Pedido['tipo']>('DEPOSITO');
  const [valor, setValor] = useState('');
  const [origem, setOrigem] = useState('');
  const [destino, setDestino] = useState('');
  const [instante, setInstante] = useState('');
  const [descricao, setDescricao] = useState('');
  const [localError, setLocalError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const focusId = useRef('caixa-conferir');
  const focusedMessage = useRef<string>();
  const cancel = useRef<HTMLButtonElement>(null);
  const [confirmation, setConfirmation] = useState<Pendente>();
  const saldo = useQuery({
    enabled: auth.state.phase === 'authenticated',
    queryKey: ['caixa', epoch, 'saldo', view.corte],
    queryFn: ({ signal }) =>
      read.read(async () =>
        validarSaldo(
          (
            await api.GET('/api/v1/caixa/saldo', {
              signal,
              params: { query: view.corte ? { data_corte: view.corte } : {} },
            })
          ).data,
        ),
      ),
    retryOnMount: false,
    refetchOnWindowFocus: false,
  });
  const houses = [...new Set(saldo.data?.contas.map((c) => c.casa_id) ?? [])];
  const matrices = useQueries({
    queries: houses.map((id) => ({
      queryKey: ['caixa', epoch, 'identificacao', id],
      enabled: auth.state.phase === 'authenticated',
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        read.read(async () => {
          const value = validar(
            (
              await api.GET('/api/v1/titulares/casas/{casa_id}/matriz', {
                signal,
                params: { path: { casa_id: id } },
              })
            ).data,
            '/api/v1/titulares/casas/{casa_id}/matriz',
          );
          if (value.casa_id !== id) throw new ApiError('invalid_response');
          return value;
        }),
      retryOnMount: false,
      refetchOnWindowFocus: false,
    })),
  });
  const matriz = (id: number): Matriz | undefined =>
    matrices.find((q) => q.data?.casa_id === id)?.data;
  const contaOptions =
    saldo.data?.contas.map((conta) => ({
      value: String(conta.conta_casa_id),
      label: rotuloConta(conta, matriz(conta.casa_id)),
    })) ?? [];
  const titulares = [
    ...new Map(
      matrices
        .flatMap((q) => q.data?.contas ?? [])
        .filter((c) => c.titular_id !== null)
        .map((c) => [
          c.titular_id!,
          { value: String(c.titular_id), label: c.titular_nome ?? 'Titular' },
        ]),
    ).values(),
  ];
  const listQuery = {
    ...view.query,
    ...(view.titular ? { titular_id: view.titular } : {}),
    ...(view.tipo ? { tipo: view.tipo } : {}),
  };
  const movimentos = useQuery({
    queryKey: ['caixa', epoch, 'movimentos', listQuery],
    enabled:
      auth.state.phase === 'authenticated' && view.secao === 'movimentos',
    queryFn: ({ signal }) =>
      read.read(async () => {
        const value = validar(
          (
            await api.GET('/api/v1/caixa', {
              signal,
              params: { query: listQuery },
            })
          ).data,
          '/api/v1/caixa',
        );
        if (value.pagination.page !== view.page)
          throw new ApiError('invalid_response');
        value.data.forEach(validarMovimento);
        return value;
      }),
    retryOnMount: false,
    refetchOnWindowFocus: false,
  });
  const extrato = useQuery({
    queryKey: ['caixa', epoch, 'extrato', view.query],
    enabled: auth.state.phase === 'authenticated' && view.secao === 'extrato',
    queryFn: ({ signal }) =>
      read.read(async () => {
        const value = validarExtrato(
          (
            await api.GET('/api/v1/caixa/extrato', {
              signal,
              params: { query: view.query },
            })
          ).data,
        );
        if (value.pagination.page !== view.page)
          throw new ApiError('invalid_response');
        for (const item of value.data)
          if (item.origem === 'movimento') validarMovimento(item);
          else if (item.data_referencia)
            dataHora(item.data_referencia, 'America/Sao_Paulo');
        return value;
      }),
    retryOnMount: false,
    refetchOnWindowFocus: false,
  });
  const current = () =>
    alive.current && auth.service.getSnapshot().privateEpoch === epoch;
  const canMove = op.can(POST);
  const canLink = op.can(PATCH);
  useEffect(() => {
    if (
      message &&
      focusedMessage.current !== message &&
      !executing &&
      !reading &&
      !pendente &&
      !op.busy &&
      !op.waiting &&
      !op.uncertain &&
      (canMove || canLink)
    ) {
      const target = document.getElementById(
        focusId.current,
      ) as HTMLButtonElement | null;
      if (target && !target.disabled) {
        // Let the closed dialog and the enabled form finish their paint first.
        const frame = requestAnimationFrame(() => {
          if (!alive.current || target.disabled || dialog.current?.open) return;
          target.focus();
          if (document.activeElement === target)
            focusedMessage.current = message;
        });
        return () => cancelAnimationFrame(frame);
      }
    }
  }, [
    message,
    executing,
    reading,
    pendente,
    op.busy,
    op.waiting,
    op.uncertain,
    canMove,
    canLink,
    saldo.isFetching,
    search,
  ]);
  const blocked = executing || op.busy || reading || !!pendente || op.uncertain;
  const writeBlocked = blocked || op.waiting || !op.can(POST);
  const rawRef = search.get('movimento');
  const restored =
    search.getAll('movimento').length === 1 &&
    !!rawRef &&
    UUID.test(rawRef) &&
    !pendente;
  const invalidRef =
    search.has('movimento') &&
    (!rawRef || !UUID.test(rawRef) || search.getAll('movimento').length !== 1);
  function change(values: Record<string, string | undefined>, page = true) {
    const next = new URLSearchParams(latestSearch.current);
    for (const [key, value] of Object.entries(values)) {
      next.delete(key);
      if (value) next.set(key, value);
    }
    if (page) next.delete('caixa_pagina');
    if (next.toString() === latestSearch.current.toString()) return;
    latestSearch.current = next;
    setSearch(next, { replace: true });
  }
  function clearPending() {
    const original = pending.current;
    pending.current = undefined;
    setPendente(undefined);
    setConsulted(false);
    if (
      original?.kind === 'movimento' &&
      latestSearch.current.get('movimento') === original.key
    )
      change({ movimento: undefined }, false);
  }
  useEffect(() => {
    alive.current = true;
    const clear = () => {
      lookupController.current?.abort();
      pending.current = undefined;
      setPendente(undefined);
      setConfirmation(undefined);
      setRecibo(undefined);
      setMessage('');
      setValor('');
      setOrigem('');
      setDestino('');
      setInstante('');
      setDescricao('');
      dialog.current?.close();
      void queries.cancelQueries({ queryKey: ['caixa', epoch] });
      queries.removeQueries({ queryKey: ['caixa', epoch] });
    };
    const unregister = auth.service.registerCleanup(clear);
    return () => {
      alive.current = false;
      clear();
      unregister();
    };
  }, [auth.service, queries, epoch]);
  useEffect(() => {
    if (
      op.error instanceof ApiError &&
      !op.error.outcomeUnknown &&
      ![409, 410].includes(op.error.status) &&
      pending.current
    ) {
      const original = pending.current;
      pending.current = undefined;
      setPendente(undefined);
      setConsulted(false);
      if (
        original.kind === 'movimento' &&
        latestSearch.current.get('movimento') === original.key
      ) {
        const next = new URLSearchParams(latestSearch.current);
        next.delete('movimento');
        latestSearch.current = next;
        setSearch(next, { replace: true });
      }
    }
  }, [op.error, setSearch]);
  function show(value: Pendente) {
    focusId.current =
      value.kind === 'vinculo'
        ? `caixa-banca-${value.conta}`
        : 'caixa-conferir';
    setConfirmation(value);
    dialog.current!.showModal();
    cancel.current?.focus();
  }
  async function invalidate() {
    await queries.invalidateQueries({ queryKey: ['caixa', epoch] });
    void queries.invalidateQueries({ queryKey: ['contas'] });
    void queries.invalidateQueries({ queryKey: ['painel'] });
  }
  async function send(value: Pendente, replay = false) {
    if (acting.current || op.waiting || reading) return;
    acting.current = true;
    setExecuting(true);
    setMessage('');
    focusedMessage.current = undefined;
    setRecibo(undefined);
    pending.current = value;
    setPendente(value);
    setConsulted(false);
    if (value.kind === 'movimento') change({ movimento: value.key }, false);
    try {
      if (value.kind === 'movimento') {
        const result = await op.run(
          POST,
          async (signal) =>
            validarRecibo(
              (
                await api.POST('/api/v1/caixa', {
                  signal,
                  params: { header: { 'Idempotency-Key': value.key } },
                  body: value.body,
                })
              ).data,
              value.body,
            ),
          replay,
        );
        if (result && current()) {
          setRecibo(result);
          setMessage(
            `${TIPOS[result.tipo]} ${result.tipo === 'TRANSFERENCIA' ? 'registrada' : 'registrado'}.`,
          );
          clearPending();
          setValor('');
          setDescricao('');
          await invalidate();
        }
      } else {
        const result = await op.run(PATCH, async (signal) => {
          const receipt = validar(
            (
              await api.PATCH('/api/v1/caixa/contas/{conta_casa_id}/banca', {
                signal,
                params: { path: { conta_casa_id: value.conta } },
                body: { banca_id: value.banca },
              })
            ).data,
            PATCH,
          );
          if (
            receipt.conta_casa_id !== value.conta ||
            receipt.banca_id !== value.banca
          )
            throw new ApiError('invalid_response', { mutation: true });
          return receipt;
        });
        if (result && current()) {
          clearPending();
          setMessage('Vínculo da conta com a banca atualizado.');
          await invalidate();
        }
      }
    } finally {
      acting.current = false;
      if (current()) setExecuting(false);
    }
  }
  async function consultPending() {
    if (
      auth.state.phase !== 'authenticated' ||
      reading ||
      op.busy ||
      read.waiting ||
      recoveryWait
    )
      return;
    const controller = new AbortController();
    lookupController.current = controller;
    setReading(true);
    setRecoveryError(undefined);
    try {
      const value = pending.current;
      if (value?.kind === 'vinculo') {
        const latest = await read.read(async () =>
          validarSaldo(
            (
              await api.GET('/api/v1/caixa/saldo', {
                signal: controller.signal,
              })
            ).data,
          ),
        );
        if (!current()) return;
        if (!latest.contas.some((c) => c.conta_casa_id === value.conta))
          throw new ApiError('invalid_response');
        op.reconciled();
        clearPending();
        setMessage(
          'Vínculo atual consultado. Confira os dados antes de uma nova alteração.',
        );
        await invalidate();
      } else {
        const result = await read.read(async () => {
          const data = validar(
            (
              await api.GET('/api/v1/caixa', {
                signal: controller.signal,
                params: {
                  query: {
                    page: 1,
                    page_size: 50,
                    ...(value?.kind === 'movimento' && value.body.conta_casa_id
                      ? { conta_casa_id: value.body.conta_casa_id }
                      : {}),
                  },
                },
              })
            ).data,
            '/api/v1/caixa',
          );
          data.data.forEach(validarMovimento);
          return data;
        });
        if (current()) {
          setConsulted(true);
          setMessage(
            `Consulta concluída: ${result.pagination.total} movimentos nesse recorte. Essa lista não identifica a intenção deste pedido.`,
          );
        }
      }
    } catch (cause) {
      if (current()) setRecoveryError(cause);
    } finally {
      if (current()) setReading(false);
    }
  }
  const linked = (path: string) =>
    path + (search.toString() ? '?' + search.toString() : '');
  const activeList = view.secao === 'movimentos' ? movimentos : extrato;
  const ignored = [
    'casa',
    'tipster',
    'grupo',
    'banca',
    'estado',
    'origem',
    'apagadas',
    'periodo',
    'revisao',
    'conta',
    'titular',
    'desde',
    'ate',
  ].filter((key) => search.has(key));
  const accountName = (id: number | null) =>
    id === null
      ? 'Sem conta'
      : (contaOptions.find((c) => c.value === String(id))?.label ??
        `Conta ${id}`);
  return (
    <main className="pagina caixa-pagina">
      <header className="caixa-cabecalho">
        <div>
          <p className="legenda">DINHEIRO E MOVIMENTOS</p>
          <h1>Caixa</h1>
          <p>
            Consulte suas contas e registre entradas, saídas ou transferências.
          </p>
        </div>
        <Link to={linked('/contas')}>Contas e titulares</Link>
      </header>
      <nav className="caixa-secoes" aria-label="Seções do Caixa">
        {(['saldos', 'movimentos', 'extrato'] as const).map((section) => (
          <Link
            key={section}
            aria-current={view.secao === section ? 'page' : undefined}
            to={
              '/banca?' +
              (() => {
                const next = new URLSearchParams(search);
                next.set('caixa', section);
                next.delete('caixa_pagina');
                return next.toString();
              })()
            }
          >
            {section === 'saldos'
              ? 'Saldos'
              : section === 'movimentos'
                ? 'Movimentos'
                : 'Extrato'}
          </Link>
        ))}
      </nav>
      {!!view.invalidos.length && (
        <p role="status">
          Alguns parâmetros inválidos no endereço usam os valores padrão.
          Confira os filtros.
        </p>
      )}
      {!!ignored.length && (
        <details className="caixa-nota">
          <summary>Filtros de outras áreas preservados</summary>
          <p>
            Os filtros trazidos de outras telas permanecem no endereço. Aqui,
            use os controles de Caixa; eles não filtram o saldo por casa,
            tipster, grupo ou estado.
          </p>
        </details>
      )}
      <ul
        className="filtro-pilulas"
        aria-label="Filtros do Caixa salvos na URL"
      >
        {[
          ['caixa_conta', view.conta ? accountName(view.conta) : '', 'conta'],
          [
            'caixa_titular',
            view.titular ? `Titular ${view.titular} · somente Movimentos` : '',
            'titular',
          ],
          [
            'caixa_tipo',
            view.tipo ? `${TIPOS[view.tipo]} · somente Movimentos` : '',
            'tipo',
          ],
          [
            'caixa_desde',
            view.desde ? `Desde ${view.desde}` : '',
            'data inicial',
          ],
          ['caixa_ate', view.ate ? `Até ${view.ate}` : '', 'data final'],
          [
            'data_corte',
            view.corte ? `Saldo até ${view.corte}` : '',
            'data do saldo',
          ],
        ].map(
          ([key, label, name]) =>
            label && (
              <li key={key}>
                <button
                  aria-label={`Remover filtro ${name}`}
                  onClick={() => change({ [key!]: undefined })}
                >
                  {label} ×
                </button>
              </li>
            ),
        )}
      </ul>
      {!op.can(POST) && (
        <p className="caixa-nota">
          Seu acesso permite consultar os dados. Para registrar movimentos ou
          mudar vínculos,{' '}
          <Link to={linked('/assinatura')}>confira a assinatura</Link>.
        </p>
      )}
      {message && (
        <p role="status" className="caixa-nota">
          {message}
        </p>
      )}
      {executing && (
        <p role="status">
          {message
            ? 'Atualizando dados do Caixa…'
            : 'Registrando alteração no Caixa…'}
        </p>
      )}
      {op.error !== undefined && (
        <ErroApi error={op.error} intent="gravacao" fields={CAMPOS} />
      )}
      {invalidRef && (
        <p role="status">
          A referência inválida foi desconsiderada. Nenhum lançamento foi
          repetido.
        </p>
      )}
      {!executing && ((pendente && op.uncertain) || restored) && (
        <section className="caixa-nota">
          <h2>Conferir o lançamento</h2>
          <p>
            O envio não tem confirmação disponível nesta tela. Consulte o estado
            atual antes de decidir o próximo passo.
          </p>
          <button
            disabled={reading || op.busy || read.waiting || recoveryWait}
            onClick={() => void consultPending()}
          >
            {reading ? 'Consultando…' : 'Conferir movimentos e vínculo'}
          </button>
          {consulted && pendente?.kind === 'movimento' && (
            <>
              <p>
                Você pode solicitar a resposta original com o mesmo pedido. O
                serviço usa a mesma identidade e não cria outro lançamento.
              </p>
              <button
                disabled={reading || op.busy || op.waiting || !op.can(POST)}
                onClick={() => void send(pending.current!, true)}
              >
                Reenviar este lançamento
              </button>
            </>
          )}
          {restored && (
            <p>
              Os valores do pedido anterior não ficam no endereço. Confira o
              extrato; não é possível reconstruir ou reenviar aquele pedido após
              sair desta tela.
            </p>
          )}
          {restored && consulted && (
            <button
              onClick={() => {
                change({ movimento: undefined }, false);
                setConsulted(false);
              }}
            >
              Encerrar esta consulta
            </button>
          )}
          {pendente?.kind === 'movimento' && consulted && (
            <>
              <p>
                Encerrar a consulta não desfaz um movimento já registrado.
                Confira o extrato antes de lançar os mesmos valores novamente.
              </p>
              <button
                disabled={executing || reading || op.busy || op.waiting}
                onClick={() => {
                  op.reconciled();
                  clearPending();
                  setValor('');
                  setDescricao('');
                  setMessage(
                    'Consulta encerrada. Nenhum movimento foi desfeito.',
                  );
                }}
              >
                Encerrar sem reenviar
              </button>
            </>
          )}
        </section>
      )}
      {recoveryError !== undefined && (
        <ErroApi
          error={recoveryError}
          intent="leitura"
          actions={{ tentar: () => void consultPending() }}
        />
      )}
      {saldo.error && (
        <ErroApi
          error={saldo.error}
          intent="leitura"
          actions={{
            tentar: () => {
              if (!read.waiting && !saldo.isFetching) void saldo.refetch();
            },
          }}
        />
      )}
      {saldo.isPending && <p role="status">Consultando saldo das contas…</p>}
      {matrices.some((q) => q.error) && (
        <section className="caixa-nota">
          <p>
            A identificação de algumas contas não está disponível. Os valores
            recebidos continuam visíveis.
          </p>
          {matrices.map(
            (q, index) =>
              q.error && (
                <ErroApi
                  key={houses[index]}
                  error={q.error}
                  intent="leitura"
                  actions={{
                    tentar: () => {
                      if (!read.waiting && !q.isFetching) void q.refetch();
                    },
                  }}
                />
              ),
          )}
        </section>
      )}
      {view.secao === 'saldos' && (
        <>
          <div className="caixa-controles caixa-saldo-controles">
            <DataFiltro
              label="Saldo até a data"
              value={view.corte}
              onChange={(value) => change({ data_corte: value }, false)}
            />
            <button
              disabled={read.waiting || saldo.isFetching}
              onClick={() => void saldo.refetch()}
            >
              Consultar saldo novamente
            </button>
          </div>
          <p className="legenda">
            {view.corte
              ? `Saldo histórico na data ${view.corte}.`
              : 'Saldo de todo o histórico.'}{' '}
            Saldo das contas. O capital inicial das bancas é informado
            separadamente.
          </p>
          {saldo.data && (
            <>
              <div className="caixa-resumo">
                <div>
                  <span>Saldo das contas</span>
                  <strong className="numero">
                    {saldo.data.saldo_total_centavos === null
                      ? 'Saldo desconhecido'
                      : moeda(saldo.data.saldo_total_centavos)}
                  </strong>
                </div>
                <div>
                  <span>Parte conhecida</span>
                  <strong className="numero">
                    {moeda(saldo.data.saldo_conhecido_centavos)}
                  </strong>
                </div>
                <p>
                  {saldo.data.contas_sem_saldo_confiavel} contas sem saldo
                  confiável
                </p>
              </div>
              {!saldo.data.contas.length && (
                <section className="caixa-nota">
                  <h2>Comece por uma conta</h2>
                  <p>Não há contas para consultar ou movimentar.</p>
                  <Link to={linked('/contas')}>Ver Contas e titulares</Link>
                </section>
              )}
              <div className="caixa-contas">
                {saldo.data.contas.map((conta) => (
                  <article className="caixa-conta" key={conta.conta_casa_id}>
                    <h2>{rotuloConta(conta, matriz(conta.casa_id))}</h2>
                    <p className="legenda">
                      {conta.desde
                        ? `Histórico financeiro desde ${dataHora(conta.desde, 'America/Sao_Paulo')}`
                        : 'Início do histórico não informado'}
                    </p>
                    <dl>
                      <div>
                        <dt>Saldo</dt>
                        <dd className="numero">
                          {conta.saldo_atual_centavos === null
                            ? 'Saldo desconhecido'
                            : moeda(conta.saldo_atual_centavos)}
                        </dd>
                      </div>
                      <div>
                        <dt>Em jogo</dt>
                        <dd className="numero">
                          {moeda(conta.em_jogo_centavos)}
                        </dd>
                      </div>
                      <div>
                        <dt>Depósito faltante</dt>
                        <dd className="numero">
                          {moeda(conta.deposito_faltante_centavos)}
                        </dd>
                      </div>
                    </dl>
                    <details>
                      <summary>Entradas e saídas da conta</summary>
                      <dl>
                        {(
                          [
                            ['depositado_centavos', 'Depósitos'],
                            ['sacado_centavos', 'Saques'],
                            ['bonus_centavos', 'Bônus'],
                            ['movido_centavos', 'Movimentação líquida'],
                            ['apostado_centavos', 'Custo das apostas'],
                            ['retornado_centavos', 'Retornos'],
                          ] as const
                        ).map(([key, label]) => (
                          <div key={key}>
                            <dt>{label}</dt>
                            <dd className="numero">{moeda(conta[key])}</dd>
                          </div>
                        ))}
                      </dl>
                    </details>
                    <Vincular
                      key={`${conta.conta_casa_id}:${conta.banca_id}`}
                      conta={conta.conta_casa_id}
                      value={conta.banca_id}
                      options={saldo.data!.bancas.map((b) => ({
                        value: String(b.id),
                        label: b.nome,
                      }))}
                      blocked={
                        blocked ||
                        restored ||
                        op.waiting ||
                        !op.can(PATCH) ||
                        saldo.isFetching
                      }
                      onChoose={(banca) =>
                        show({
                          kind: 'vinculo',
                          conta: conta.conta_casa_id,
                          banca,
                        })
                      }
                    />
                  </article>
                ))}
              </div>
              <section>
                <h2>Bancas</h2>
                <p className="legenda">
                  Saldo e capital inicial informados por banca.
                </p>
                {saldo.data.bancas.length ? (
                  <ul className="caixa-lista">
                    {saldo.data.bancas.map((b) => (
                      <li key={b.id}>
                        <strong>{b.nome}</strong>
                        <span className="numero">
                          {moeda(b.saldo_total_centavos)}
                        </span>
                        {b.motivo_saldo_indisponivel && (
                          <small>Saldo da banca indisponível.</small>
                        )}
                        <small>
                          Capital inicial informado:{' '}
                          {moeda(b.saldo_inicial_centavos)}
                        </small>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>
                    Não há bancas cadastradas.{' '}
                    <Link to={linked('/contas')}>Consultar contas</Link>.
                  </p>
                )}
              </section>
            </>
          )}
        </>
      )}
      {view.secao !== 'saldos' && (
        <section aria-label="Lista do Caixa">
          <div className="caixa-filtros">
            <EscolhaFiltro
              label="Conta do Caixa"
              value={view.conta ? String(view.conta) : ''}
              selectedLabel={view.conta ? accountName(view.conta) : undefined}
              resetLabel="Todas as contas"
              options={contaOptions}
              onChange={(value) => change({ caixa_conta: value })}
            />
            <DataFiltro
              label="Movimentos desde"
              value={view.desde}
              onChange={(value) => change({ caixa_desde: value })}
            />
            <DataFiltro
              label="Movimentos até"
              value={view.ate}
              onChange={(value) => change({ caixa_ate: value })}
            />
            {view.secao === 'movimentos' && (
              <>
                <EscolhaFiltro
                  label="Tipo do movimento"
                  value={view.tipo ?? ''}
                  resetLabel="Todos os tipos"
                  options={Object.entries(TIPOS).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                  onChange={(value) => change({ caixa_tipo: value })}
                />
                <EscolhaFiltro
                  label="Titular dos movimentos"
                  value={view.titular ? String(view.titular) : ''}
                  selectedLabel={
                    view.titular ? `Titular ${view.titular}` : undefined
                  }
                  resetLabel="Todos os titulares"
                  options={titulares}
                  onChange={(value) => change({ caixa_titular: value })}
                />
              </>
            )}
          </div>
          <p className="legenda">
            {view.secao === 'movimentos'
              ? 'Somente lançamentos de caixa, pela data informada no movimento.'
              : 'Movimentos e apostas liquidadas. A data da aposta ou criação é a referência; a hora de liquidação não está disponível.'}{' '}
            O saldo das contas tem seu próprio período.
          </p>
          {view.secao === 'extrato' && (view.tipo || view.titular) && (
            <p>
              Tipo e titular estão preservados no endereço e são aplicados
              somente em Movimentos.
            </p>
          )}
          {activeList.isPending && (
            <p role="status">Consultando {view.secao}…</p>
          )}
          {activeList.error && (
            <ErroApi
              error={activeList.error}
              intent="leitura"
              actions={{
                tentar: () => {
                  if (!read.waiting && !activeList.isFetching)
                    void activeList.refetch();
                },
              }}
            />
          )}
          {activeList.data && (
            <>
              {!activeList.data.data.length ? (
                <section className="caixa-nota">
                  <h2>Nenhum item neste recorte</h2>
                  <p>Ajuste os filtros ou consulte os dados novamente.</p>
                  <button
                    disabled={read.waiting || activeList.isFetching}
                    onClick={() => void activeList.refetch()}
                  >
                    Consultar novamente
                  </button>
                </section>
              ) : (
                <ul className="caixa-lista">
                  {activeList.data.data.map((item) => (
                    <li
                      key={
                        ('origem' in item ? item.origem : 'movimento') +
                        ':' +
                        item.id
                      }
                    >
                      <Linha
                        item={item}
                        conta={accountName(item.conta_casa_id)}
                        search={search.toString()}
                      />
                    </li>
                  ))}
                </ul>
              )}
              <div className="caixa-controles">
                <button
                  disabled={
                    view.page === 1 || read.waiting || activeList.isFetching
                  }
                  onClick={() =>
                    change({ caixa_pagina: String(view.page - 1) }, false)
                  }
                >
                  Página anterior
                </button>
                <span>
                  Página {activeList.data.pagination.page} ·{' '}
                  {activeList.data.pagination.total} itens neste recorte
                </span>
                <button
                  disabled={
                    read.waiting ||
                    activeList.isFetching ||
                    activeList.data.pagination.page *
                      activeList.data.pagination.page_size >=
                      activeList.data.pagination.total
                  }
                  onClick={() =>
                    change({ caixa_pagina: String(view.page + 1) }, false)
                  }
                >
                  Próxima página
                </button>
              </div>
            </>
          )}
        </section>
      )}
      <section className="caixa-formulario" aria-labelledby="caixa-lancamento">
        <h2 id="caixa-lancamento">Registrar movimento</h2>
        <p>Informe a conta, o valor e quando o movimento aconteceu.</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (writeBlocked || restored) return;
            try {
              const body = pedido({
                tipo,
                valor,
                origem,
                destino,
                instante,
                descricao,
              });
              setLocalError('');
              show({ kind: 'movimento', key: crypto.randomUUID(), body });
            } catch (cause) {
              setLocalError(
                cause instanceof Error ? cause.message : 'Confira os campos.',
              );
            }
          }}
        >
          <EscolhaFiltro
            label="Movimento"
            value={tipo}
            resetLabel="Escolha o movimento"
            options={TIPOS_ENTRADA.map((value) => ({
              value,
              label: TIPOS[value],
            }))}
            disabled={writeBlocked || restored}
            onChange={(value) => {
              if (TIPOS_ENTRADA.includes(value as Pedido['tipo']))
                setTipo(value as Pedido['tipo']);
            }}
          />
          <EscolhaFiltro
            label={
              tipo === 'TRANSFERENCIA'
                ? 'Conta de origem'
                : 'Conta do lançamento'
            }
            value={origem}
            selectedLabel={!origem ? 'Escolha uma conta' : undefined}
            resetLabel="Escolha uma conta"
            options={[
              ...contaOptions,
              ...(tipo === 'AJUSTE'
                ? [{ value: 'global', label: 'Sem conta · ajuste global' }]
                : []),
            ]}
            disabled={writeBlocked || restored}
            id="caixa-origem"
            onChange={(value) => setOrigem(value ?? '')}
          />
          {tipo === 'TRANSFERENCIA' && (
            <EscolhaFiltro
              label="Conta de destino"
              value={destino}
              selectedLabel={
                !destino ? 'Escolha a conta de destino' : undefined
              }
              resetLabel="Escolha a conta de destino"
              options={contaOptions}
              disabled={writeBlocked || restored}
              id="caixa-destino"
              onChange={(value) => setDestino(value ?? '')}
            />
          )}
          <label htmlFor="caixa-valor">
            Valor (R$){tipo === 'AJUSTE' ? ' · use sinal para ajuste' : ''}
            <input
              id="caixa-valor"
              inputMode="decimal"
              value={valor}
              onChange={(event) => setValor(event.target.value)}
              required
              disabled={writeBlocked || restored}
            />
          </label>
          <label htmlFor="caixa-instante">
            Data e hora com fuso
            <input
              id="caixa-instante"
              value={instante}
              onChange={(event) => setInstante(event.target.value)}
              placeholder="13/10/2026 14:30-03:00"
              aria-describedby="caixa-fuso"
              required
              disabled={writeBlocked || restored}
            />
          </label>
          <p id="caixa-fuso" className="legenda">
            Dia/mês/ano e hora com fuso. Exemplo: 13/10/2026 14:30-03:00.
          </p>
          <label htmlFor="caixa-descricao">
            Descrição · opcional
            <input
              id="caixa-descricao"
              value={descricao}
              onChange={(event) => setDescricao(event.target.value)}
              disabled={writeBlocked || restored}
            />
          </label>
          {tipo === 'AJUSTE' && origem === 'global' && (
            <p>
              O ajuste sem conta aparece nos movimentos. O saldo acima cobre
              somente contas.
            </p>
          )}
          {localError && <p role="alert">{localError}</p>}
          <button
            id="caixa-conferir"
            ref={trigger}
            type="submit"
            disabled={writeBlocked || restored}
          >
            Conferir lançamento
          </button>
        </form>
        {recibo && (
          <details open>
            <summary>Lançamento confirmado</summary>
            <ul className="caixa-lista">
              {recibo.movimentos.map((move) => (
                <li key={move.id}>
                  <strong>
                    {TIPOS[move.tipo]} · {accountName(move.conta_casa_id)}
                  </strong>
                  <span className="numero">
                    {moeda(move.valor_centavos, true)}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>
      <dialog
        ref={dialog}
        className="caixa-dialog"
        aria-labelledby="caixa-confirmar"
        onClose={() => {
          setConfirmation(undefined);
          document.getElementById(focusId.current)?.focus();
        }}
      >
        <h2 id="caixa-confirmar">
          Confirmar{' '}
          {confirmation?.kind === 'vinculo' ? 'vínculo da conta' : 'lançamento'}
          ?
        </h2>
        {confirmation?.kind === 'movimento' ? (
          <>
            <p>
              {TIPOS[confirmation.body.tipo]} de{' '}
              <strong className="numero">
                {moeda(confirmation.body.valor_centavos, true)}
              </strong>
            </p>
            <p>
              {accountName(confirmation.body.conta_casa_id ?? null)}
              {confirmation.body.tipo === 'TRANSFERENCIA'
                ? ' → ' + accountName(confirmation.body.conta_casa_destino_id!)
                : ''}
            </p>
            <p>
              {dataHora(confirmation.body.ocorrido_em, 'America/Sao_Paulo')}
            </p>
          </>
        ) : confirmation?.kind === 'vinculo' ? (
          <p>
            {accountName(confirmation.conta)} será{' '}
            {confirmation.banca === null
              ? 'desvinculada da banca'
              : 'vinculada a ' +
                (saldo.data?.bancas.find((b) => b.id === confirmation.banca)
                  ?.nome ?? 'esta banca')}
            .
          </p>
        ) : null}
        <p>Confira os dados antes de registrar. O histórico será preservado.</p>
        <div className="caixa-controles">
          <button
            disabled={
              blocked ||
              op.waiting ||
              !op.can(confirmation?.kind === 'vinculo' ? PATCH : POST)
            }
            onClick={() => {
              const value = confirmation;
              dialog.current!.close();
              if (value) void send(value);
            }}
          >
            Confirmar
          </button>
          <button ref={cancel} onClick={() => dialog.current!.close()}>
            Cancelar
          </button>
        </div>
      </dialog>
    </main>
  );
}
function Vincular({
  conta,
  value,
  options,
  blocked,
  onChoose,
}: {
  conta: number;
  value: number | null;
  options: { value: string; label: string }[];
  blocked: boolean;
  onChoose: (id: number | null) => void;
}) {
  const [selected, setSelected] = useState(value === null ? '' : String(value));
  return (
    <div className="caixa-vinculo">
      <EscolhaFiltro
        id={`caixa-banca-${conta}`}
        label={`Banca da conta ${conta}`}
        value={selected}
        selectedLabel={!selected ? 'Sem banca' : undefined}
        resetLabel="Sem banca"
        options={options}
        disabled={blocked}
        onChange={(value) => setSelected(value ?? '')}
      />
      <button
        disabled={blocked || selected === (value === null ? '' : String(value))}
        onClick={() => {
          const id = selected ? identificador(selected) : null;
          if (id !== undefined) onChoose(id);
        }}
      >
        Salvar vínculo
      </button>
    </div>
  );
}
function Linha({
  item,
  conta,
  search,
}: {
  item: Movimento | Extrato['data'][number];
  conta: string;
  search: string;
}) {
  if ('origem' in item && item.origem === 'aposta')
    return (
      <>
        <div>
          <strong>Aposta · {item.estado}</strong>
          <small>{conta}</small>
          {item.chave && (
            <Link
              to={
                '/aposta/' +
                encodeURIComponent(item.chave) +
                (search ? '?' + search : '')
              }
            >
              Ver aposta
            </Link>
          )}
          <small>
            {item.data_referencia
              ? dataHora(item.data_referencia, 'America/Sao_Paulo')
              : 'Data não informada'}{' '}
            ·{' '}
            {item.data_referencia_origem === 'data_aposta'
              ? 'data da aposta'
              : 'data de criação'}
          </small>
        </div>
        <div>
          <span className="numero">
            {moeda(item.resultado_liquido_centavos, true)}
          </span>
          <small>Resultado líquido recebido</small>
          <small>
            Custo: <span className="numero">{moeda(item.stake_centavos)}</span>
          </small>
          <small>
            Retorno:{' '}
            <span className="numero">{moeda(item.retorno_centavos)}</span>
          </small>
        </div>
      </>
    );
  return (
    <>
      <div>
        <strong>{TIPOS[item.tipo]}</strong>
        <small>{conta}</small>
        <small>{dataHora(item.ocorrido_em, 'America/Sao_Paulo')}</small>
        {item.descricao && <span>{item.descricao}</span>}
        {item.transferencia_id && <small>Uma ponta de transferência</small>}
      </div>
      <span className="numero">{moeda(item.valor_centavos, true)}</span>
    </>
  );
}
