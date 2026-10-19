import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { getApiClient, type createApiClient } from '../../../api/client';
import { ErroApi } from '../../../components/ErroApi';
import { EscolhaFiltro } from '../../../components/filtros/EscolhaFiltro';
import { useAuth } from '../../../auth/ProvedorAuth';
import { dataCivil, percentualDecimal } from '../../../lib/format';
import { FusoPreferencia } from '../../configuracoes/FusoPreferencia';
import {
  METRICAS,
  STATUS,
  apresentar,
  statusLista,
  type Meta,
} from './protocol';
import { useMetas } from './useMetas';
import { MetaForm } from './MetaForm';
import './metas.css';
import '../../configuracoes/configuracoes.css';
import '../../../components/filtros/filtros.css';

export function MetasPage({
  client = getApiClient(),
}: {
  client?: ReturnType<typeof createApiClient>;
}) {
  const auth = useAuth()!;
  return <Conteudo key={auth.state.privateEpoch} client={client} />;
}
function Conteudo({ client }: { client: ReturnType<typeof createApiClient> }) {
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const status = statusLista(params.get('meta_status'));
  const metas = useMetas(client);
  const [editor, setEditor] = useState<Meta | null>();
  const [action, setAction] = useState<
    { kind: 'close' } | { kind: 'archive'; meta: Meta }
  >();
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLButtonElement>();
  const editorTitle = useRef<HTMLHeadingElement>(null);
  const result = useRef<HTMLParagraphElement>(null);
  const blocked = metas.busy || metas.waiting || metas.queryWaiting;
  const canChange = metas.canWrite && !blocked && !metas.unknown;
  const rows =
    metas.query.data?.filter(
      (meta) => status === 'todas' || meta.status === status,
    ) ?? [];
  useEffect(() => {
    if (action) {
      dialog.current?.showModal();
      cancel.current?.focus();
    }
  }, [action]);
  useEffect(() => {
    if (editor !== undefined) editorTitle.current?.focus();
  }, [editor]);
  useEffect(() => {
    if (metas.notice) result.current?.focus();
  }, [metas.notice]);
  function confirm(
    next: NonNullable<typeof action>,
    button: HTMLButtonElement,
  ) {
    trigger.current = button;
    setAction(next);
  }
  return (
    <main className="pagina metas-pagina">
      <header>
        <Link to={'/painel' + location.search}>Voltar ao Painel</Link>
        <h1>Metas</h1>
        <p>
          Opcional. Acompanhe objetivos que você definir, com resultados
          calculados pelo serviço.
        </p>
        <p>Não é necessário criar uma meta para usar o site.</p>
        <Link to={'/painel/analises' + location.search}>Ver Análises</Link>
      </header>
      <section className="metas-escopo" aria-label="Escopo das metas">
        <p>
          Cada meta tem seu próprio intervalo e considera todas as apostas
          incluídas nos resultados da sua conta. Os filtros do Painel permanecem
          no endereço, mas não se aplicam às metas.
        </p>
        <p>
          Lucro e giro seguem as regras financeiras do serviço. Os valores
          seguem a atualização do serviço; consultar novamente não garante novos
          dados.
        </p>
      </section>
      {!metas.canWrite && (
        <p role="status">
          Você pode consultar metas. Para criar, editar ou arquivar, seu acesso
          precisa permitir alterações.
        </p>
      )}
      <section aria-labelledby="metas-lista-titulo">
        <div className="metas-cabecalho">
          <h2 id="metas-lista-titulo">Suas metas</h2>
          <button
            className="meta-primaria"
            disabled={!canChange || editor !== undefined}
            onClick={() => setEditor(null)}
          >
            Nova meta
          </button>
        </div>
        <div className="metas-controles">
          <EscolhaFiltro
            label="Mostrar metas"
            value={status}
            selectedLabel={
              status === 'todas' ? 'Todas as metas' : STATUS[status]
            }
            resetLabel="Todas as metas"
            options={Object.entries(STATUS).map(([value, label]) => ({
              value,
              label,
            }))}
            onChange={(value) => {
              const next = new URLSearchParams(params);
              if (value) next.set('meta_status', value);
              else next.delete('meta_status');
              setParams(next);
            }}
          />
          <button
            disabled={blocked || metas.query.isFetching}
            onClick={() => void metas.consult()}
          >
            Consultar metas
          </button>
        </div>
        {metas.query.isPending && <p role="status">Consultando metas…</p>}
        {metas.query.error && (
          <ErroApi
            error={metas.query.error}
            intent="leitura"
            actions={{ tentar: () => void metas.consult() }}
          />
        )}
        {metas.query.data && !rows.length && (
          <div className="metas-vazio">
            <h3>
              {metas.query.data.length
                ? 'Nenhuma meta neste status'
                : 'Você ainda não criou metas'}
            </h3>
            <p>
              {metas.query.data.length
                ? 'Escolha outro status para consultar suas metas.'
                : 'Você pode acompanhar seus resultados no Painel ou criar um objetivo quando quiser.'}
            </p>
            <Link to={'/painel' + location.search}>Consultar o Painel</Link>
          </div>
        )}
        {!!rows.length && (
          <ul className="metas-lista" aria-label="Metas cadastradas">
            {rows.map((meta) => (
              <li key={meta.id}>
                <article aria-labelledby={'meta-' + meta.id}>
                  <div className="metas-cabecalho">
                    <h3 id={'meta-' + meta.id}>{meta.titulo}</h3>
                    <span>{STATUS[meta.status]}</span>
                  </div>
                  <p>
                    {METRICAS[meta.metrica]} ·{' '}
                    <span className="numero">
                      {dataCivil(meta.inicio)} a {dataCivil(meta.fim)}
                    </span>
                  </p>
                  <dl className="meta-valores">
                    <div>
                      <dt>Valor atual</dt>
                      <dd className="numero">
                        {apresentar(meta.valor_atual, meta.metrica)}
                      </dd>
                    </div>
                    <div>
                      <dt>Alvo</dt>
                      <dd className="numero">
                        {apresentar(meta.alvo, meta.metrica)}
                      </dd>
                    </div>
                    <div>
                      <dt>Linha base</dt>
                      <dd className="numero">
                        {apresentar(meta.linha_base, meta.metrica)}
                      </dd>
                    </div>
                    <div>
                      <dt>Progresso informado</dt>
                      <dd className="numero">
                        {meta.progresso === null
                          ? 'Não calculável'
                          : percentualDecimal(meta.progresso)}
                      </dd>
                    </div>
                  </dl>
                  {meta.progresso === null && (
                    <p>
                      Não há porcentagem disponível para esta configuração; isso
                      não significa progresso zero.
                    </p>
                  )}
                  <p>
                    {meta.alvo_atingido
                      ? 'Alvo atingido, conforme os dados consultados.'
                      : 'Alvo ainda não atingido, conforme os dados consultados.'}
                  </p>
                  <div className="metas-acoes">
                    <button
                      disabled={!canChange || editor !== undefined}
                      onClick={() => setEditor(meta)}
                      aria-label={'Editar ' + meta.titulo}
                    >
                      Editar
                    </button>
                    {meta.status !== 'arquivada' && (
                      <button
                        disabled={!canChange || editor !== undefined}
                        onClick={(event) =>
                          confirm(
                            { kind: 'archive', meta },
                            event.currentTarget,
                          )
                        }
                        aria-label={'Arquivar ' + meta.titulo}
                      >
                        Arquivar
                      </button>
                    )}
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>
      {editor !== undefined && (
        <section className="meta-editor" aria-labelledby="meta-editor-titulo">
          <h2 id="meta-editor-titulo" tabIndex={-1} ref={editorTitle}>
            {editor ? 'Editar meta' : 'Nova meta'}
          </h2>
          <MetaForm
            key={editor?.id ?? 'nova'}
            meta={editor}
            disabled={!canChange}
            submit={(body, nextStatus) => {
              void metas
                .write(
                  editor
                    ? {
                        kind: 'edit',
                        id: editor.id,
                        body: { ...body, status: nextStatus },
                      }
                    : { kind: 'create', body },
                )
                .then((value) => {
                  if (value) setEditor(undefined);
                });
            }}
          />
          {!metas.unknown && (
            <button
              disabled={blocked}
              onClick={(event) =>
                confirm({ kind: 'close' }, event.currentTarget)
              }
            >
              Fechar formulário
            </button>
          )}
        </section>
      )}
      {metas.busy && <p role="status">Aguarde o resultado do pedido…</p>}
      {!!metas.error && (
        <ErroApi
          error={metas.error}
          intent={metas.errorIntent}
          destination={location.pathname + location.search}
          fields={[
            {
              scope: 'body',
              field: 'titulo',
              label: 'Título',
              id: 'meta-titulo',
            },
            {
              scope: 'body',
              field: 'metrica',
              label: 'Métrica',
              id: 'meta-metrica',
            },
            { scope: 'body', field: 'alvo', label: 'Alvo', id: 'meta-alvo' },
            {
              scope: 'body',
              field: 'linha_base',
              label: 'Linha base',
              id: 'meta-base',
            },
          ]}
        />
      )}
      {metas.waiting && (
        <p role="status">
          O serviço pediu uma pausa. Os controles serão liberados ao terminar;
          nenhum pedido será reenviado.
        </p>
      )}
      {metas.unknown && !metas.busy && (
        <section className="metas-incerto" aria-labelledby="meta-incerta">
          <h2 id="meta-incerta">Não recebemos confirmação deste pedido</h2>
          <p>
            Ele pode ter sido aplicado. Os campos continuam aqui e não serão
            reenviados automaticamente.
          </p>
          <p>
            {metas.unknown.kind === 'create'
              ? 'Consultar a lista não identifica nem comprova esta criação. Confira suas metas antes de fechar o formulário.'
              : 'Consulte a meta atual antes de encerrar este acompanhamento e preparar outra edição. A consulta não comprova autoria nem desfaz o pedido anterior.'}
          </p>
          <button
            disabled={blocked || metas.query.isFetching}
            onClick={() => void metas.consult()}
          >
            {metas.unknown.id
              ? 'Consultar meta atual'
              : 'Consultar lista de metas'}
          </button>
          <button
            disabled={
              blocked || (!!metas.unknown.id && !metas.unknown.consulted)
            }
            onClick={(event) => confirm({ kind: 'close' }, event.currentTarget)}
          >
            Encerrar este acompanhamento
          </button>
        </section>
      )}
      {metas.notice && (
        <p role="status" tabIndex={-1} ref={result}>
          {metas.notice}
        </p>
      )}
      <FusoPreferencia client={client} />
      <dialog
        ref={dialog}
        aria-labelledby="meta-confirmar"
        onClose={() => {
          setAction(undefined);
          trigger.current?.focus();
        }}
      >
        <h2 id="meta-confirmar">
          {action?.kind === 'archive'
            ? 'Arquivar esta meta?'
            : editor === undefined
              ? 'Encerrar acompanhamento?'
              : 'Fechar este formulário?'}
        </h2>
        {action?.kind === 'archive' ? (
          <p>
            “{action.meta.titulo}” ficará arquivada e continuará consultável. As
            apostas e seus valores não mudam.
          </p>
        ) : (
          <p>
            {metas.unknown
              ? 'Fechar não cancela o pedido no servidor. Ele pode ter sido aplicado. '
              : ''}
            {editor === undefined
              ? 'A meta continuará consultável. Nenhum pedido será repetido.'
              : 'Os campos desta edição sairão da memória; uma nova criação começa vazia.'}
          </p>
        )}
        <div className="metas-acoes">
          <button ref={cancel} onClick={() => dialog.current?.close()}>
            Agora não
          </button>
          <button
            className="meta-primaria"
            disabled={blocked}
            onClick={() => {
              const chosen = action;
              dialog.current?.close();
              if (chosen?.kind === 'archive')
                void metas.write({ kind: 'archive', id: chosen.meta.id });
              else if (metas.close()) setEditor(undefined);
            }}
          >
            {action?.kind === 'archive'
              ? 'Arquivar meta'
              : editor === undefined
                ? 'Encerrar acompanhamento'
                : 'Fechar formulário'}
          </button>
        </div>
      </dialog>
    </main>
  );
}
