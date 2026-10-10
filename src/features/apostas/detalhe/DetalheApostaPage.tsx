import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useParams } from 'react-router-dom';
import { getApiClient, type createApiClient } from '../../../api/client';
import { ApiError } from '../../../api/error';
import { recuperacaoErro } from '../../../api/recovery';
import { SITE_READ_CONTRACT } from '../../../api/site-read.generated';
import { respostaPublicada } from '../../../api/readContract';
import { useAuth } from '../../../auth/ProvedorAuth';
import { ErroApi } from '../../../components/ErroApi';
import { dataHora, decimal, moeda } from '../../../lib/format';
import { ESTADOS_APOSTA } from '../../../lib/termos';
import { useRetryAfter } from '../../../lib/useRetryAfter';
import { useAcesso } from '../../acesso/ProvedorAcesso';
import { projetarAposta } from '../projecao';
import { EscolherConta } from './EscolherConta';
import { MidiaRevisao } from './MidiaRevisao';
import {
  CAMPOS,
  eventoApresentacao,
  parceiraDaRevisao,
  pedidoCorrecao,
  pedidoResultado,
  validarDetalhe,
  validarMudanca,
  valoresIniciais,
  type Correcao,
  type Rascunho,
  type Resultado,
  type Revisao,
} from './protocol';
import './detalhe.css';

type Intento =
  | { tipo: 'apagar' | 'restaurar' | 'mesma' | 'distinta' }
  | { tipo: 'corrigir'; body: Correcao }
  | { tipo: 'resultado'; body: Resultado };
const OPERACOES = {
  apagar: 'DELETE /api/v1/apostas/{chave}',
  restaurar: 'POST /api/v1/apostas/{chave}/restaurar',
  corrigir: 'PATCH /api/v1/apostas/{chave}',
  resultado: 'POST /api/v1/apostas/{chave}/resultado',
  mesma: 'POST /api/v1/revisao/{revisao_id}/resolver',
  distinta: 'POST /api/v1/revisao/{revisao_id}/resolver',
} as const;
const TITULOS = {
  apagar: 'Apagar aposta?',
  restaurar: 'Restaurar aposta?',
  mesma: 'Confirmar a mesma aposta?',
  distinta: 'Confirmar apostas distintas?',
};

export function DetalheApostaPage({
  client,
}: {
  client?: ReturnType<typeof createApiClient>;
}) {
  const { chave = '' } = useParams();
  const auth = useAuth();
  return (
    <DetalhePagina
      key={`${auth?.state.privateEpoch}:${chave}`}
      chave={chave}
      api={client ?? getApiClient()}
    />
  );
}
function DetalhePagina({
  chave,
  api,
}: {
  chave: string;
  api: ReturnType<typeof createApiClient>;
}) {
  const auth = useAuth();
  const access = useAcesso();
  const route = useLocation();
  const queries = useQueryClient();
  const [busy, setBusy] = useState(false);
  const acting = useRef(false);
  const reading = useRef(false);
  const alive = useRef(true);
  const [error, setError] = useState<unknown>();
  const [localError, setLocalError] = useState('');
  const [notice, setNotice] = useState('');
  const [needsRead, setNeedsRead] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [draft, setDraft] = useState<Rascunho>();
  const initial = useRef<Rascunho>({});
  const [result, setResult] = useState('');
  const [cashout, setCashout] = useState('');
  const [confirm, setConfirm] = useState<Intento>();
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const editButton = useRef<HTMLButtonElement>(null);
  const identity = [auth?.state.privateEpoch, auth?.state.person?.id];
  const detail = useQuery({
    queryKey: ['aposta', ...identity, chave],
    enabled: auth?.state.phase === 'authenticated',
    refetchOnWindowFocus: false,
    retryOnMount: false,
    queryFn: ({ signal }) =>
      auth!.service.read(async () =>
        validarDetalhe(
          (
            await api.GET('/api/v1/apostas/{chave}', {
              signal,
              params: { path: { chave } },
            })
          ).data,
          chave,
          SITE_READ_CONTRACT,
        ),
      ),
  });
  const reviewId = detail.data?.revisao_pendente?.id;
  const review = useQuery({
    queryKey: ['revisao-aposta', ...identity, reviewId],
    enabled: reviewId !== undefined,
    refetchOnWindowFocus: false,
    retryOnMount: false,
    queryFn: ({ signal }) =>
      auth!.service.read(async () => {
        const { data } = await api.GET('/api/v1/revisao/{revisao_id}', {
          signal,
          params: { path: { revisao_id: reviewId! } },
        });
        respostaPublicada(
          data,
          SITE_READ_CONTRACT['/api/v1/revisao/{revisao_id}']?.response,
        );
        if (!data || data.id !== reviewId)
          throw new ApiError('invalid_response');
        return data;
      }),
  });
  const waiting = useRetryAfter(error);
  const readWaiting = useRetryAfter(detail.error);
  const reviewWaiting = useRetryAfter(review.error);
  const blocked =
    busy || waiting || readWaiting || detail.isFetching || needsRead;
  const writeBlocked =
    blocked || unavailable || !access?.can('PATCH /api/v1/apostas/{chave}');
  const partner = parceiraDaRevisao(review.data);
  const returnTo = '/' + route.search + '#aposta-' + encodeURIComponent(chave);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (confirm) {
      dialog.current?.showModal();
      cancel.current?.focus();
    }
  }, [confirm]);
  const editing = !!draft;
  const wasEditing = useRef(false);
  useEffect(() => {
    if (editing) document.getElementById('correcao-evento')?.focus();
    else if (wasEditing.current) editButton.current?.focus();
    wasEditing.current = editing;
  }, [editing]);
  async function consult() {
    if (
      !auth ||
      reading.current ||
      busy ||
      waiting ||
      readWaiting ||
      detail.isFetching
    )
      return;
    reading.current = true;
    try {
      const scope = auth.service.capture();
      const response = await detail.refetch();
      if (!alive.current || !scope.isCurrent() || response.error) return;
      setNeedsRead(false);
      setError(undefined);
      setNotice(
        'Estado atual consultado. Confira os dados antes de uma nova alteração.',
      );
      if (reviewId !== undefined && !reviewWaiting) await review.refetch();
    } finally {
      reading.current = false;
    }
  }
  async function run(intent: Intento) {
    if (!auth || !access || writeBlocked || acting.current) return;
    acting.current = true;
    setBusy(true);
    setError(undefined);
    setNotice('');
    setLocalError('');
    const scope = auth.service.capture();
    const operation = OPERACOES[intent.tipo];
    try {
      const value = await access.run(operation, async () => {
        const params = { path: { chave } };
        if (intent.tipo === 'corrigir')
          return (
            await api.PATCH('/api/v1/apostas/{chave}', {
              params,
              body: intent.body,
            })
          ).data;
        if (intent.tipo === 'resultado')
          return (
            await api.POST('/api/v1/apostas/{chave}/resultado', {
              params,
              body: intent.body,
            })
          ).data;
        if (intent.tipo === 'apagar')
          return (await api.DELETE('/api/v1/apostas/{chave}', { params })).data;
        if (intent.tipo === 'restaurar')
          return (
            await api.POST('/api/v1/apostas/{chave}/restaurar', { params })
          ).data;
        if (
          !reviewId ||
          !review.data ||
          review.data.resolvido_em !== null ||
          !partner
        )
          throw new ApiError('invalid_request');
        return (
          await api.POST('/api/v1/revisao/{revisao_id}/resolver', {
            params: { path: { revisao_id: reviewId } },
            body:
              intent.tipo === 'mesma'
                ? { acao: 'MESMA' }
                : { acao: 'CORRIGIR', aposta_corrigida: {} },
          })
        ).data;
      });
      validarMudanca(value, chave, operation, SITE_READ_CONTRACT);
      if (!alive.current || !scope.isCurrent()) return;
      setNeedsRead(true);
      setNotice(
        'Alteração confirmada. Os resumos podem levar um tempo para refletir esta mudança.',
      );
      // Refetch is a safe GET; it does not refresh materialized financial views.
      void queries.invalidateQueries({ queryKey: ['apostas'] });
      void queries.invalidateQueries({ queryKey: ['resumo-apostas'] });
      void queries.invalidateQueries({ queryKey: ['revisao'] });
      const response = await detail.refetch();
      if (!alive.current || !scope.isCurrent()) return;
      if (!response.error) {
        setNeedsRead(false);
        setDraft(undefined);
        setResult('');
        setCashout('');
      }
      if (reviewId !== undefined)
        void queries.invalidateQueries({ queryKey: ['revisao-aposta'] });
    } catch (failure) {
      if (alive.current && scope.isCurrent()) {
        const safe =
          failure instanceof ApiError
            ? failure
            : new ApiError('invalid_response', { mutation: true });
        setError(
          safe.kind === 'invalid_response' && !safe.outcomeUnknown
            ? new ApiError('invalid_response', { mutation: true })
            : safe,
        );
        if (safe.status === 404 || safe.status === 405) setUnavailable(true);
        if (
          safe.outcomeUnknown ||
          safe.status === 409 ||
          safe.kind === 'invalid_response' ||
          safe.status === 404 ||
          safe.status === 405
        )
          setNeedsRead(true);
      }
    } finally {
      acting.current = false;
      if (alive.current && scope.isCurrent()) setBusy(false);
    }
  }
  const fields = CAMPOS.map(([field, label]) => ({
    field,
    label,
    id: 'correcao-' + field,
    scope: 'body' as const,
  }));
  const a = detail.data?.aposta;
  const view = a ? projetarAposta(a) : undefined;
  const recovery = detail.error
    ? recuperacaoErro(detail.error, 'leitura')
    : undefined;
  return (
    <main className="shell-conteudo aposta-detalhe">
      <Link className="aposta-voltar" to={returnTo}>
        ← Voltar à lista de apostas
      </Link>
      {!a && <h1>Aposta</h1>}
      {detail.isPending && (
        <>
          <p role="status">Carregando aposta…</p>
        </>
      )}
      {detail.error && (
        <ErroApi
          error={detail.error}
          intent="leitura"
          destination={route.pathname + route.search}
          actions={
            recovery?.action === 'tentar'
              ? { tentar: () => void consult() }
              : {}
          }
        />
      )}
      {a && view && detail.data && (
        <>
          <header className="aposta-detalhe-topo">
            <div>
              <p className="legenda">
                {view.casa} · {view.origem}
              </p>
              <h1>{view.evento}</h1>
              <p>{view.descricao}</p>
              <p className="legenda">{view.mercado}</p>
            </div>
            <span className="aposta-estado" data-estado={a.estado}>
              {view.estado}
            </span>
          </header>
          {a.apagada && (
            <p className="aposta-alerta">
              Apagada — fora da apuração. O histórico foi preservado.
            </p>
          )}
          {detail.data.fonte_contextual && (
            <p className="aposta-alerta">
              Esta é a fonte de contexto de uma aposta vinculada. Os valores são
              apurados na fonte da casa; esta fonte continua consultável.
            </p>
          )}
          <dl className="aposta-detalhe-valores">
            <div>
              <dt>
                {a.freebet ? 'Valor de face da freebet' : 'Valor da aposta'}
              </dt>
              <dd className="numero">{view.valor}</dd>
            </div>
            <div>
              <dt>Custo próprio</dt>
              <dd className="numero">{moeda(a.stake_centavos)}</dd>
            </div>
            <div>
              <dt>Odd</dt>
              <dd className="numero">{view.odd}</dd>
            </div>
            <div>
              <dt>Retorno</dt>
              <dd className="numero">{view.retorno}</dd>
            </div>
            <div>
              <dt>Lucro</dt>
              <dd className="numero">{view.lucro}</dd>
            </div>
          </dl>
          <div className="aposta-detalhe-grid">
            <section className="aposta-secao" aria-labelledby="registro-titulo">
              <h2 id="registro-titulo">Registro da aposta</h2>
              <dl className="aposta-registro">
                <div>
                  <dt>Data/hora da aposta</dt>
                  <dd>{view.data}</dd>
                </div>
                <div>
                  <dt>Data/hora do jogo</dt>
                  <dd>{view.jogo}</dd>
                </div>
                <div>
                  <dt>Valor em unidades</dt>
                  <dd className="numero">{decimal(a.stake_unidades)}</dd>
                </div>
                <div>
                  <dt>Última atualização</dt>
                  <dd>{dataHora(a.atualizada_em, 'America/Sao_Paulo')}</dd>
                </div>
              </dl>
            </section>
            <section className="aposta-secao" aria-labelledby="conta-titulo">
              <h2 id="conta-titulo">Conta e banca registradas</h2>
              <dl className="aposta-registro">
                <div>
                  <dt>Conta</dt>
                  <dd>
                    {view.conta}
                    {a.conta_contexto && !a.conta_contexto.ativa
                      ? ' (inativa)'
                      : ''}
                  </dd>
                </div>
                <div>
                  <dt>Titular</dt>
                  <dd>
                    {view.titular}
                    {a.conta_contexto?.titular?.arquivado ? ' (arquivado)' : ''}
                  </dd>
                </div>
                <div>
                  <dt>Banca da aposta</dt>
                  <dd>{view.banca}</dd>
                </div>
              </dl>
              <p className="legenda">
                Os nomes são os atuais. A referência registrada na aposta é
                preservada após troca de titular.
              </p>
              <EscolherConta
                api={api}
                blocked={writeBlocked || !!draft}
                onChoose={(id) =>
                  void run({ tipo: 'corrigir', body: { conta_casa_id: id } })
                }
              />
            </section>
          </div>
          {!access?.can('PATCH /api/v1/apostas/{chave}') && (
            <p className="aposta-alerta">
              Você pode consultar esta aposta. Alterações exigem acesso
              confirmado para escrita.
            </p>
          )}
          {notice && (
            <p role="status" className="aposta-alerta">
              {notice}
            </p>
          )}
          {!!error && (
            <ErroApi
              error={error}
              intent="gravacao"
              conflict="estado"
              destination={route.pathname + route.search}
              fields={fields}
              actions={{
                conferir: () => void consult(),
                recarregar: () => void consult(),
                revisar: () =>
                  document.getElementById('correcao-evento')?.focus(),
              }}
            />
          )}
          {needsRead && (
            <button
              type="button"
              disabled={
                busy ||
                waiting ||
                readWaiting ||
                detail.isFetching ||
                (recovery?.action === undefined && !!detail.error)
              }
              onClick={() => void consult()}
            >
              Consultar estado atual da aposta
            </button>
          )}
          {localError && (
            <p role="alert" className="aposta-alerta">
              {localError}
            </p>
          )}
          <div className="acoes">
            <button
              ref={editButton}
              type="button"
              disabled={writeBlocked || !!draft}
              onClick={() => {
                initial.current = valoresIniciais(detail.data!);
                setDraft({ ...initial.current });
                setLocalError('');
              }}
            >
              Corrigir aposta
            </button>
            <button
              type="button"
              disabled={writeBlocked || !!draft}
              onClick={() =>
                setConfirm({ tipo: a.apagada ? 'restaurar' : 'apagar' })
              }
            >
              {a.apagada ? 'Restaurar aposta' : 'Apagar aposta'}
            </button>
          </div>
          {draft && (
            <section
              className="aposta-secao aposta-correcao"
              aria-labelledby="correcao-titulo"
            >
              <h2 id="correcao-titulo">Corrigir aposta</h2>
              <p>
                Somente os campos alterados serão enviados. Limpar um texto ou
                uma data remove essa informação; valores e resultado são
                calculados pelo serviço.
              </p>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  try {
                    const body = pedidoCorrecao(draft, initial.current);
                    if (!Object.keys(body).length) {
                      setLocalError('Nenhum campo foi alterado.');
                      return;
                    }
                    void run({ tipo: 'corrigir', body });
                  } catch {
                    setLocalError(
                      'Confira os números e as datas. Use dia/mês/ano, hora e fuso nas datas.',
                    );
                  }
                }}
              >
                <fieldset disabled={writeBlocked}>
                  <legend className="somente-leitor">Campos da aposta</legend>
                  <div className="aposta-form-grid">
                    {CAMPOS.map(([field, label, kind]) => (
                      <label key={field} htmlFor={'correcao-' + field}>
                        {label}
                        <input
                          id={'correcao-' + field}
                          type="text"
                          inputMode={
                            kind === 'decimal' || kind === 'moeda'
                              ? 'decimal'
                              : 'text'
                          }
                          value={String(draft[field] ?? '')}
                          onChange={(event) =>
                            setDraft({ ...draft, [field]: event.target.value })
                          }
                          aria-describedby={
                            kind === 'data' ? 'correcao-data-ajuda' : undefined
                          }
                        />
                      </label>
                    ))}
                  </div>
                  <p id="correcao-data-ajuda" className="legenda">
                    Data e hora com fuso: 10/10/2026 21:00-03:00. Comissão vazia
                    preserva o valor anterior.
                  </p>
                  <label className="aposta-checkbox">
                    <input
                      type="checkbox"
                      checked={draft.freebet === true}
                      onChange={(event) =>
                        setDraft({ ...draft, freebet: event.target.checked })
                      }
                    />
                    Freebet — manter o valor de face
                  </label>
                  <div className="acoes">
                    <button type="submit">Salvar alterações</button>
                    <button
                      type="button"
                      onClick={() => {
                        setDraft(undefined);
                        setLocalError('');
                        editButton.current?.focus();
                      }}
                    >
                      Cancelar correção
                    </button>
                  </div>
                </fieldset>
              </form>
            </section>
          )}
          <details className="aposta-secao">
            <summary>Registrar resultado</summary>
            <p>
              Registre o resultado informado pela casa. O retorno e o lucro
              serão atualizados após salvar.
            </p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                try {
                  void run({
                    tipo: 'resultado',
                    body: pedidoResultado(result, cashout),
                  });
                } catch {
                  setLocalError(
                    'Escolha um resultado. Cashout exige o valor pago pela casa em reais, com até duas casas decimais.',
                  );
                }
              }}
            >
              <fieldset disabled={writeBlocked || !!draft}>
                <legend>Resultado da aposta</legend>
                <div className="aposta-resultados">
                  {Object.entries(ESTADOS_APOSTA).map(([key, label]) => (
                    <label key={key}>
                      <input
                        type="radio"
                        name="resultado"
                        checked={result === key}
                        onChange={() => setResult(key)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
                {result === 'CASHOUT' && (
                  <label htmlFor="cashout">
                    Valor pago pela casa (R$)
                    <input
                      id="cashout"
                      inputMode="decimal"
                      type="text"
                      value={cashout}
                      onChange={(event) => setCashout(event.target.value)}
                    />
                  </label>
                )}
                <div className="acoes">
                  <button type="submit" disabled={!result}>
                    Salvar resultado
                  </button>
                </div>
              </fieldset>
            </form>
          </details>
          {reviewId !== undefined && (
            <section
              className="aposta-secao"
              aria-labelledby="revisao-aposta-titulo"
            >
              <h2 id="revisao-aposta-titulo">Revisão desta aposta</h2>
              {review.isPending && <p role="status">Carregando evidências…</p>}
              {review.error && (
                <ErroApi
                  error={review.error}
                  intent="leitura"
                  actions={
                    recuperacaoErro(review.error, 'leitura').action === 'tentar'
                      ? {
                          tentar: () => {
                            if (!reviewWaiting && !review.isFetching)
                              void review.refetch();
                          },
                        }
                      : {}
                  }
                />
              )}
              {review.data && (
                <Evidencia
                  revisao={review.data}
                  api={api}
                  partner={partner}
                  search={route.search}
                  blocked={
                    writeBlocked ||
                    !!draft ||
                    review.isFetching ||
                    reviewWaiting
                  }
                  onDecision={(tipo) => setConfirm({ tipo })}
                />
              )}
            </section>
          )}
          {reviewId === undefined && (
            <p className="legenda">
              Não há revisão aberta.{' '}
              {a.midia_hash
                ? 'A mídia desta aposta não possui um caminho autorizado disponível para consulta.'
                : 'Nenhuma mídia foi informada para esta aposta.'}
            </p>
          )}
          <details className="aposta-secao">
            <summary>
              Histórico da aposta ({detail.data.eventos.length})
            </summary>
            {!detail.data.eventos.length && (
              <p>
                Nenhum evento foi informado pelo serviço. Consulte novamente
                mais tarde.
              </p>
            )}
            <ol className="aposta-historico">
              {detail.data.eventos.map((evento, index) => {
                const model = eventoApresentacao(evento);
                return (
                  <li key={index}>
                    <h3>{model.titulo}</h3>
                    <p className="legenda">
                      {model.instante} · {model.origem}
                    </p>
                    <dl className="aposta-registro">
                      {model.campos.map((field) => (
                        <div key={field.label}>
                          <dt>{field.label}</dt>
                          <dd>{field.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </li>
                );
              })}
            </ol>
          </details>
          {!!detail.data.consolidacoes?.length && (
            <section className="aposta-secao">
              <h2>Histórico Casa × Telegram</h2>
              <p>
                {detail.data.consolidacoes.length} relações registradas pelo
                serviço. As duas fontes e as decisões anteriores são preservadas
                no histórico.
              </p>
              <ol>
                {detail.data.consolidacoes.map((relation, index) => (
                  <li key={index}>
                    {relation.estado === 'active'
                      ? 'Fontes vinculadas'
                      : relation.estado === 'rejected'
                        ? 'Vínculo recusado'
                        : relation.estado === 'unlinked'
                          ? 'Fontes desvinculadas'
                          : 'Decisão registrada pelo serviço'}
                  </li>
                ))}
              </ol>
            </section>
          )}
        </>
      )}
      <dialog
        ref={dialog}
        className="aposta-dialog"
        aria-labelledby="confirmacao-aposta-titulo"
        onClose={() => setConfirm(undefined)}
      >
        <h2 id="confirmacao-aposta-titulo">
          {confirm && confirm.tipo in TITULOS
            ? TITULOS[confirm.tipo as keyof typeof TITULOS]
            : 'Confirmar alteração?'}
        </h2>
        <p>
          {confirm?.tipo === 'apagar'
            ? 'A aposta ficará fora da apuração. Você poderá restaurá-la; o histórico será mantido.'
            : confirm?.tipo === 'restaurar'
              ? 'A aposta voltará à apuração conforme as regras do serviço. Os resumos podem levar um tempo para atualizar.'
              : 'Esta decisão será registrada na Revisão. O serviço decide o vínculo e a apuração financeira.'}
        </p>
        <div className="acoes">
          <button
            type="button"
            disabled={writeBlocked}
            onClick={() => {
              const intent = confirm;
              dialog.current!.close();
              if (intent) void run(intent);
            }}
          >
            Confirmar
          </button>
          <button
            ref={cancel}
            type="button"
            onClick={() => dialog.current!.close()}
          >
            Agora não
          </button>
        </div>
      </dialog>
    </main>
  );
}
function Evidencia({
  revisao,
  api,
  partner,
  search,
  blocked,
  onDecision,
}: {
  revisao: Revisao;
  api: ReturnType<typeof createApiClient>;
  partner?: string;
  search: string;
  blocked: boolean;
  onDecision: (tipo: 'mesma' | 'distinta') => void;
}) {
  return (
    <>
      <p>
        {partner
          ? 'Há uma dúvida sobre duas fontes da mesma aposta. Consulte as evidências antes de decidir.'
          : 'Esta aposta possui uma pendência de revisão.'}
      </p>
      <p className="legenda">
        Aberta em {dataHora(revisao.criado_em, 'America/Sao_Paulo')}
      </p>
      {revisao.resolvido_em ? (
        <p>Esta revisão já foi resolvida. Consulte o estado atual da aposta.</p>
      ) : (
        <>
          {revisao.midia_hash ? (
            <MidiaRevisao key={revisao.id} id={revisao.id} api={api} />
          ) : (
            <p>Não há foto disponível nesta revisão.</p>
          )}
          {partner && (
            <>
              <Link
                to={'/aposta/' + encodeURIComponent(partner) + search}
                target="_blank"
                rel="noopener"
              >
                Consultar a outra aposta (em outra aba)
              </Link>
              <div className="acoes">
                <button
                  type="button"
                  disabled={blocked}
                  onClick={() => onDecision('mesma')}
                >
                  É a mesma aposta
                </button>
                <button
                  type="button"
                  disabled={blocked}
                  onClick={() => onDecision('distinta')}
                >
                  São apostas distintas
                </button>
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
