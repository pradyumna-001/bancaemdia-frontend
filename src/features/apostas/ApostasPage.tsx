import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { getApiClient, type createApiClient } from '../../api/client';
import { recuperacaoErro } from '../../api/recovery';
import { SITE_READ_CONTRACT } from '../../api/site-read.generated';
import type { ContratoLeitura } from '../../api/readContract';
import { useAuth } from '../../auth/ProvedorAuth';
import { ErroApi } from '../../components/ErroApi';
import { Filtros, useFiltros } from '../../components/filtros/Filtros';
import { adaptarFiltros, serializarConsulta } from '../../lib/params';
import { useRetryAfter } from '../../lib/useRetryAfter';
import { useAcesso } from '../acesso/ProvedorAcesso';
import { useCatalogos } from './catalogos';
import {
  juntarPaginas,
  projetarAposta,
  proximaPagina,
  resumoApresentacao,
  validarPagina,
  type Aposta,
} from './projecao';
import './apostas.css';

function LinhaAposta({ item, compacta }: { item: Aposta; compacta: boolean }) {
  const view = projetarAposta(item);
  const account = item.conta_contexto;
  return (
    <li>
      <article
        className={`aposta-linha${compacta ? ' aposta-linha--compacta' : ''}`}
        aria-label={view.evento}
      >
        <div className="aposta-contexto">
          <span className="legenda">{view.casa}</span>
          <h3>{view.evento}</h3>
          <p>{view.descricao}</p>
          <p className="legenda">{view.mercado}</p>
          <p className="legenda">Aposta: {view.data}</p>
        </div>
        <div className="aposta-situacao">
          <span className="aposta-estado" data-estado={item.estado}>
            {view.estado}
          </span>
          {item.apagada && (
            <span className="aposta-aviso">Apagada — fora da apuração</span>
          )}
          {item.revisao_grave && (
            <span className="aposta-aviso">Revisão necessária</span>
          )}
          {item.freebet && (
            <span className="aposta-aviso">Freebet — valor de face</span>
          )}
          <span className="legenda">Origem: {view.origem}</span>
        </div>
        <dl className="aposta-valores">
          <div>
            <dt>{item.freebet ? 'Valor de face' : 'Valor'}</dt>
            <dd className="numero">{view.valor}</dd>
          </div>
          <div>
            <dt>Odd</dt>
            <dd className="numero">{view.odd}</dd>
          </div>
          <div>
            <dt>Lucro</dt>
            <dd className="numero">{view.lucro}</dd>
          </div>
        </dl>
        <details className="aposta-detalhes">
          <summary>Informações da aposta</summary>
          <dl>
            <div>
              <dt>Conta atribuída</dt>
              <dd>
                {view.conta}
                {account && !account.ativa ? ' (inativa)' : ''}
              </dd>
            </div>
            {account && (
              <div>
                <dt>Identificador da conta</dt>
                <dd className="numero">{account.id}</dd>
              </div>
            )}
            <div>
              <dt>Titular da conta</dt>
              <dd>
                {view.titular}
                {account?.titular?.arquivado ? ' (arquivado)' : ''}
              </dd>
            </div>
            <div>
              <dt>Banca da aposta</dt>
              <dd>{view.banca}</dd>
            </div>
            {item.banca_contexto && (
              <div>
                <dt>Identificador da banca</dt>
                <dd className="numero">{item.banca_contexto.id}</dd>
              </div>
            )}
            <div>
              <dt>Data do jogo</dt>
              <dd>{view.jogo}</dd>
            </div>
            <div>
              <dt>Retorno</dt>
              <dd className="numero">{view.retorno}</dd>
            </div>
          </dl>
          <p className="legenda">
            A conta e a banca são as referências registradas na aposta. Os nomes
            exibidos são os atuais.
          </p>
        </details>
      </article>
    </li>
  );
}

export function ApostasPage({
  client,
  contrato = SITE_READ_CONTRACT,
}: {
  client?: ReturnType<typeof createApiClient>;
  contrato?: ContratoLeitura;
}) {
  const api = client ?? getApiClient();
  const auth = useAuth();
  const access = useAcesso();
  const location = useLocation();
  const [search, setSearch] = useSearchParams();
  const compacta =
    search.getAll('visualizacao').length !== 1 ||
    search.get('visualizacao') !== 'cartoes';
  const { visao, adapter } = useFiltros('apostas', contrato);
  const querySearch = new URLSearchParams(visao.busca);
  querySearch.delete('visualizacao');
  const summaryAdapter = adaptarFiltros(visao, 'painel', contrato);
  const catalogos = useCatalogos(contrato, api, visao);
  const enabled = auth?.state.phase === 'authenticated';
  const identity = [auth?.state.privateEpoch, auth?.state.person?.id];
  const list = useInfiniteQuery({
    queryKey: [
      'apostas',
      ...identity,
      adapter.query,
      querySearch.toString(),
      visao.page,
      visao.page_size,
    ],
    enabled: enabled && !adapter.bloqueios.length,
    initialPageParam: visao.page,
    queryFn: async ({ signal, pageParam }) =>
      auth!.service.read(async () =>
        validarPagina(
          (
            await api.GET('/api/v1/apostas', {
              signal,
              params: { query: {} },
              querySerializer: () =>
                serializarConsulta({
                  ...adapter.query,
                  page: pageParam,
                  page_size: visao.page_size,
                }),
            })
          ).data,
          contrato['/api/v1/apostas']?.response,
          pageParam,
          visao.page_size,
        ),
      ),
    getNextPageParam: proximaPagina,
    retryOnMount: false,
  });
  const summary = useQuery({
    queryKey: [
      'resumo-apostas',
      ...identity,
      summaryAdapter.query,
      visao.valores,
    ],
    enabled:
      enabled && !adapter.bloqueios.length && !summaryAdapter.bloqueios.length,
    queryFn: async ({ signal }) =>
      auth!.service.read(async () => {
        // A generated route descriptor is required. The response is projected only
        // after validation against that same document; no handwritten response union.
        const result = await api.GET(
          summaryAdapter.endpoint as '/api/v1/painel',
          {
            signal,
            params: { query: {} },
            querySerializer: () => serializarConsulta(summaryAdapter.query),
          },
        );
        return resumoApresentacao(
          result.data,
          contrato[summaryAdapter.endpoint]?.response,
        );
      }),
    retryOnMount: false,
  });
  const listWait = useRetryAfter(list.error);
  const summaryWait = useRetryAfter(summary.error);
  const rows = juntarPaginas(list.data?.pages ?? []);
  const total = list.data?.pages.at(-1)?.pagination.total;
  const changedDuringPagination = list.data?.pages.some(
    (page) => page.pagination.total !== total,
  );
  const firstPageSearch = new URLSearchParams(location.search);
  firstPageSearch.delete('page');
  const destination = '/' + location.search;
  const entry = access?.can('POST /api/v1/upload')
    ? '/enviar'
    : '/configuracoes/conexoes';
  const entryLabel =
    entry === '/enviar' ? 'Enviar apostas' : 'Conectar Telegram';
  const filtered = Object.keys(visao.valores).some(
    (key) => key !== 'periodo' || visao.valores.periodo !== 'all',
  );
  const canRepeatList =
    !list.error || recuperacaoErro(list.error, 'leitura').action === 'tentar';
  const canRepeatSummary =
    !summary.error ||
    recuperacaoErro(summary.error, 'leitura').action === 'tentar';
  const refresh = () => {
    if (
      !canRepeatList ||
      list.isFetching ||
      summary.isFetching ||
      listWait ||
      summaryWait
    )
      return;
    void list.refetch();
    if (!summaryAdapter.bloqueios.length && canRepeatSummary)
      void summary.refetch();
  };
  return (
    <main className="pagina pagina-interna apostas-pagina">
      <header className="apostas-cabecalho">
        <div>
          <h1>Apostas</h1>
          <p>Acompanhe suas apostas e encontre o que precisa de revisão.</p>
        </div>
        <div className="acoes">
          <Link to={entry + location.search}>{entryLabel}</Link>
          <button
            type="button"
            disabled={
              !enabled ||
              !canRepeatList ||
              !!adapter.bloqueios.length ||
              list.isFetching ||
              summary.isFetching ||
              listWait ||
              summaryWait
            }
            onClick={refresh}
          >
            Atualizar visão
          </button>
        </div>
      </header>
      <details className="apostas-filtros">
        <summary>
          Filtrar apostas{filtered ? ' — há filtros ativos' : ''}
        </summary>
        <Filtros recurso="apostas" catalogos={catalogos} contrato={contrato} />
      </details>
      {!adapter.bloqueios.length && (
        <section className="apostas-resumo" aria-label="Resumo desta visão">
          <h2>Resumo desta visão</h2>
          {summaryAdapter.bloqueios.length ? (
            <p>
              O resumo ainda não está disponível para esta visão. Os valores de
              cada aposta continuam na lista.
            </p>
          ) : summary.isPending ? (
            <p role="status">Carregando resumo…</p>
          ) : null}
          {!summaryAdapter.bloqueios.length && summary.data && (
            <>
              <dl className="apostas-indicadores">
                <div>
                  <dt>Apostas</dt>
                  <dd className="numero">{summary.data.total}</dd>
                </div>
                <div>
                  <dt>Valor apostado</dt>
                  <dd className="numero">{summary.data.giro}</dd>
                </div>
                <div>
                  <dt>Lucro</dt>
                  <dd className="numero">{summary.data.lucro}</dd>
                </div>
                <div>
                  <dt>ROI</dt>
                  <dd className="numero">{summary.data.roi}</dd>
                </div>
              </dl>
              <p className="legenda">
                Resumo dos mesmos filtros da lista, consultado em{' '}
                {summary.data.instante}. A lista e o resumo podem refletir
                alterações feitas entre as consultas.
              </p>
            </>
          )}
          {summary.error && (
            <ErroApi
              error={summary.error}
              intent="leitura"
              destination={destination}
              actions={{
                tentar: () => {
                  if (canRepeatSummary && !summary.isFetching && !summaryWait)
                    void summary.refetch();
                },
              }}
            />
          )}
        </section>
      )}
      <section
        className="apostas-lista"
        aria-label="Lista de apostas"
        aria-busy={list.isFetching}
      >
        <div className="apostas-lista-cabecalho">
          <h2>Lista de apostas</h2>
          <div
            className="apostas-visualizacao"
            role="group"
            aria-label="Visualização de apostas"
          >
            {(['lista', 'cartoes'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={mode === 'lista' ? compacta : !compacta}
                onClick={() =>
                  setSearch(
                    (current) => {
                      const next = new URLSearchParams(current);
                      next.set('visualizacao', mode);
                      return next;
                    },
                    { preventScrollReset: true },
                  )
                }
              >
                {mode === 'lista' ? 'Lista compacta' : 'Cartões'}
              </button>
            ))}
          </div>
        </div>
        {!!adapter.bloqueios.length && (
          <div role="alert">
            <p>
              Esta visão precisa de ajuste antes da consulta. Abra os filtros
              para revisar.
            </p>
            {adapter.bloqueios.map((message) => (
              <p key={message}>{message}</p>
            ))}
          </div>
        )}
        {!adapter.bloqueios.length && list.isPending && (
          <p role="status">Carregando apostas…</p>
        )}
        {list.isFetching && list.data && (
          <p role="status">
            {list.isFetchingNextPage
              ? 'Carregando mais apostas…'
              : 'Atualizando apostas…'}
          </p>
        )}
        {list.error && (
          <>
            <ErroApi
              error={list.error}
              intent="leitura"
              destination={destination}
              actions={{
                tentar: () => {
                  if (!canRepeatList || list.isFetching || listWait) return;
                  if (list.isFetchNextPageError) void list.fetchNextPage();
                  else void list.refetch();
                },
              }}
            />
            {!!rows.length && (
              <p>
                As apostas já carregadas foram mantidas. Não foi possível
                atualizar esta visão.
              </p>
            )}
          </>
        )}
        {!adapter.bloqueios.length && list.data && !rows.length && (
          <div className="apostas-vazio">
            <h3>
              {visao.page > 1
                ? 'Esta página não tem apostas'
                : filtered
                  ? 'Nenhuma aposta nesta visão'
                  : 'Você ainda não tem apostas'}
            </h3>
            <p>
              {visao.page > 1
                ? 'Volte à primeira página ou revise os filtros. Sua seleção continua salva no endereço.'
                : filtered
                  ? 'Revise os filtros para encontrar outras apostas. Sua seleção continua salva no endereço.'
                  : 'Envie suas apostas para acompanhar os resultados aqui.'}
            </p>
            <Link to={entry + location.search}>{entryLabel}</Link>
            {visao.page > 1 && (
              <Link to={'/?' + firstPageSearch.toString()}>
                Voltar à primeira página
              </Link>
            )}
          </div>
        )}
        {!adapter.bloqueios.length && !!rows.length && (
          <>
            <p className="legenda">
              {rows.length} apostas carregadas. Total informado pelo serviço:{' '}
              {total}.
              {visao.page > 1
                ? ' Exibindo a partir da página ' + visao.page + '.'
                : ''}
            </p>
            {changedDuringPagination && (
              <p role="status">
                A lista mudou durante a consulta. Atualize a visão para
                conferir.
              </p>
            )}
            <ul
              className={`apostas-itens${compacta ? ' apostas-itens--compactos' : ''}`}
            >
              {rows.map((item) => (
                <LinhaAposta key={item.chave} item={item} compacta={compacta} />
              ))}
            </ul>
            <div className="apostas-paginacao">
              <button
                type="button"
                disabled={!list.hasNextPage || list.isFetching || listWait}
                onClick={() => void list.fetchNextPage()}
              >
                Mostrar mais
              </button>
              {!list.hasNextPage && (
                <p role="status">Não há mais páginas nesta resposta.</p>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
