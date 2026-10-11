import { useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useLocation, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../auth/ProvedorAuth';
import { getApiClient, type createApiClient } from '../../api/client';
import { ApiError } from '../../api/error';
import { SITE_READ_CONTRACT } from '../../api/site-read.generated';
import { ErroApi } from '../../components/ErroApi';
import { Filtros, useFiltros } from '../../components/filtros/Filtros';
import { GraficoEvolucao } from '../../components/graficos/GraficoEvolucao';
import { moeda, dataHora } from '../../lib/format';
import { diaValido, deslocarDia } from '../../lib/datasFiltro';
import { useLeituraPainel } from './useLeituraPainel';
import {
  serializarConsulta,
  alterarFiltro,
  DIMENSOES,
  type Filtro,
} from '../../lib/params';
import { useCatalogos } from '../apostas/catalogos';
import { DiarioPainel } from './DiarioPainel';
import { GruposPainel } from './GruposPainel';
import { ResumoPainel } from './MetricasPainel';
import { ExportarPainel } from './ExportarPainel';
import {
  DIARIO,
  GRUPOS,
  validarDiario,
  validarHierarquia,
  validarLegado,
  validarComparacoes,
  juntarGrupos,
  seletoresCanonicos,
} from './protocol';
import './painel.css';

type Client = ReturnType<typeof createApiClient>;
type Query = Record<string, string | number | boolean>;
function Falha({ error, tentar }: { error: unknown; tentar: () => void }) {
  return (
    <ErroApi
      error={error}
      intent="leitura"
      destination="/painel"
      actions={{ tentar }}
    />
  );
}
function Conteudo({
  client,
  query,
  cycle,
  leitura,
}: {
  client: Client;
  query: Query;
  cycle: number;
  leitura: ReturnType<typeof useLeituraPainel>;
}) {
  const auth = useAuth();
  const [search, setSearch] = useSearchParams();
  const location = useLocation();
  const [groupReset, resetGroups] = useState(0);
  const key = ['painel', auth?.state.privateEpoch, query, cycle];
  const size = search.get('diario_tamanho') === '90' ? 90 : 14;
  const raw = search.get('diario_inicio');
  const start =
    raw &&
    diaValido(raw) &&
    raw.slice(0, 4) > '0001' &&
    raw.slice(0, 4) < '9999'
      ? raw
      : undefined;
  const enabled = auth?.state.phase === 'authenticated';
  const diario = useQuery({
    queryKey: [...key, 'diario', size, start],
    enabled,
    retryOnMount: false,
    queryFn: ({ signal }) =>
      leitura.read(async () => {
        const get = async (inicio?: string) =>
          validarDiario(
            (
              await client.GET(DIARIO, {
                signal,
                params: { query: {} },
                querySerializer: () =>
                  serializarConsulta({
                    ...query,
                    ...(cycle ? { fresh: true } : {}),
                    dias_por_pagina: size,
                    ...(inicio ? { inicio_dia: inicio } : {}),
                  }),
              })
            ).data,
          );
        // Resolve server bounds before sending a shared window against a new recut.
        const first = await get();
        return start &&
          first.intervalo_total.inicio &&
          first.intervalo_total.fim_exclusivo &&
          start >= first.intervalo_total.inicio &&
          start < first.intervalo_total.fim_exclusivo
          ? get(start)
          : first;
      }),
  });
  const selection = diario.data ? seletoresCanonicos(diario.data) : undefined;
  const grupos = useInfiniteQuery({
    queryKey: [...key, 'grupos', selection, groupReset],
    enabled: enabled && !!selection,
    initialPageParam: undefined as string | undefined,
    retryOnMount: false,
    queryFn: ({ signal, pageParam }) =>
      leitura.read(async () => {
        const result = await client.GET(GRUPOS, {
          signal,
          params: { query: {} },
          querySerializer: () =>
            serializarConsulta({
              ...selection,
              page_size: 50,
              ...(cycle ? { fresh: true } : {}),
              ...(pageParam ? { cursor: pageParam } : {}),
            }),
        });
        const page = validarHierarquia(result.data);
        if (
          JSON.stringify(seletoresCanonicos(page)) !== JSON.stringify(selection)
        )
          throw new ApiError('invalid_response');
        if (pageParam && page.proximo_cursor === pageParam)
          throw new ApiError('invalid_response');
        return page;
      }),
    getNextPageParam: (page, pages) =>
      page.proximo_cursor &&
      !pages.slice(0, -1).some((p) => p.proximo_cursor === page.proximo_cursor)
        ? page.proximo_cursor
        : undefined,
  });
  const comparacoes = useQuery({
    queryKey: [...key, 'dimensoes', selection],
    enabled: enabled && !!selection,
    retryOnMount: false,
    queryFn: ({ signal }) =>
      leitura.read(async () => {
        const result = await client.GET('/api/v1/painel/filtrado', {
          signal,
          params: { query: {} },
          querySerializer: () =>
            serializarConsulta({
              ...selection,
              ...(cycle ? { fresh: true } : {}),
            }),
        });
        return validarComparacoes(result.data);
      }),
  });
  const saldo = useQuery({
    queryKey: [...key, 'saldo-global'],
    enabled,
    retryOnMount: false,
    queryFn: ({ signal }) =>
      leitura.read(async () =>
        validarLegado(
          (
            await client.GET('/api/v1/painel', {
              signal,
              params: { query: { periodo: 'all', fresh: cycle > 0 } },
            })
          ).data,
        ),
      ),
  });
  const legacyAllowed =
    Object.keys(query).every((k) =>
      [
        'casa_id',
        'tipster_id',
        'mercado_id',
        'periodo',
        'visibilidade',
      ].includes(k),
    ) &&
    query.visibilidade === 'ativas' &&
    ['casa_id', 'tipster_id', 'mercado_id'].every(
      (k) => query[k] === undefined || Number.isSafeInteger(Number(query[k])),
    );
  const evolucao = useQuery({
    queryKey: [...key, 'evolucao'],
    enabled: enabled && legacyAllowed,
    retryOnMount: false,
    queryFn: ({ signal }) =>
      leitura.read(async () =>
        validarLegado(
          (
            await client.GET('/api/v1/painel', {
              signal,
              params: { query: {} },
              querySerializer: () =>
                serializarConsulta(
                  Object.fromEntries(
                    Object.entries({
                      ...query,
                      periodo: query.periodo ?? 'all',
                      fresh: cycle > 0,
                    }).filter(([k]) => k !== 'visibilidade'),
                  ),
                ),
            })
          ).data,
        ),
      ),
  });
  const diaryWait = leitura.waiting;
  const groupWait = leitura.waiting;
  let rows: ReturnType<typeof juntarGrupos> = [];
  let groupError = grupos.error;
  let consistent = true;
  try {
    rows = juntarGrupos(grupos.data?.pages ?? []);
  } catch (e) {
    groupError = e as Error;
    consistent = false;
  }
  const next = (value: string) =>
    setSearch((current) => {
      const s = new URLSearchParams(current);
      s.set('diario_inicio', value);
      return s;
    });
  return (
    <>
      {raw && !start && (
        <p role="status">
          Intervalo diário inválido no endereço; exibindo o início do período.
        </p>
      )}
      {start &&
        diario.data &&
        diario.data.intervalo_devolvido.inicio !== start && (
          <p role="status">
            A janela diária do endereço está fora deste recorte; exibindo seu
            início.
          </p>
        )}
      {diario.data && <ResumoPainel metricas={diario.data.total_periodo} />}
      {selection && (
        <ExportarPainel client={client} query={selection} leitura={leitura} />
      )}
      <p className="painel-nota">
        Resultados em reais · Data da aposta · Brasília. Cada seção informa sua
        consulta; após editar apostas, atualize todo o Painel.
      </p>
      <div className="painel-colunas">
        <section
          className="painel-secao painel-diario"
          aria-labelledby="diario-titulo"
        >
          <h2 id="diario-titulo">Lucro por dia</h2>
          <div className="painel-tamanho" aria-label="Dias por intervalo">
            {[14, 90].map((n) => (
              <button
                key={n}
                aria-pressed={size === n}
                disabled={diario.isFetching || diaryWait}
                onClick={() =>
                  setSearch((s) => {
                    const q = new URLSearchParams(s);
                    q.set('diario_tamanho', String(n));
                    q.delete('diario_inicio');
                    return q;
                  })
                }
              >
                {n} dias
              </button>
            ))}
          </div>
          {diario.isPending && <p role="status">Consultando os dias…</p>}
          {diario.error && (
            <Falha error={diario.error} tentar={() => void diario.refetch()} />
          )}
          {diario.data && (
            <DiarioPainel
              data={diario.data}
              busy={diario.isFetching || diaryWait}
              navegar={(cursor) =>
                next(
                  cursor === diario.data!.proximo_cursor
                    ? diario.data!.intervalo_devolvido.fim_exclusivo!
                    : deslocarDia(
                        diario.data!.intervalo_devolvido.inicio!,
                        -size,
                      ),
                )
              }
            />
          )}
        </section>
        <section
          className="painel-secao painel-hierarquia"
          aria-labelledby="grupos-titulo"
        >
          <h2 id="grupos-titulo">Lucro por grupo</h2>
          <p>
            Abra um grupo para conferir os tipsters. O total permanece visível.
          </p>
          {grupos.isPending && (
            <p role="status">
              {selection
                ? 'Consultando os grupos…'
                : 'Aguardando o recorte do diário…'}
            </p>
          )}
          {groupError && (
            <>
              <Falha
                error={groupError}
                tentar={() => resetGroups((n) => n + 1)}
              />
              <p>Se os dados mudaram entre páginas, atualize todo o Painel.</p>
            </>
          )}
          {grupos.data && consistent && (
            <GruposPainel grupos={rows} pagina={grupos.data.pages.at(-1)!} />
          )}
          {grupos.hasNextPage && !groupError && (
            <button
              disabled={grupos.isFetching || groupWait}
              onClick={() => void grupos.fetchNextPage()}
            >
              Carregar mais grupos e tipsters
            </button>
          )}
        </section>
      </div>
      <section className="painel-secao" aria-labelledby="saldo-titulo">
        <h2 id="saldo-titulo">Saldo de todas as contas · todo o histórico</h2>
        <p>
          Este saldo considera todas as contas. É separado dos filtros e do
          lucro do período acima.
        </p>
        {saldo.isPending && <p role="status">Consultando os saldos…</p>}
        {saldo.error && (
          <Falha error={saldo.error} tentar={() => void saldo.refetch()} />
        )}
        {saldo.data && (
          <>
            <p className="numero painel-saldo">
              {saldo.data.saldo.saldo_total_centavos === null
                ? 'Saldo total ainda não confirmado'
                : moeda(saldo.data.saldo.saldo_total_centavos)}
            </p>
            <p>
              Parte conhecida:{' '}
              <strong className="numero">
                {moeda(saldo.data.saldo.saldo_conhecido_centavos)}
              </strong>
            </p>
            <p className="painel-nota">
              Última consolidação:{' '}
              {dataHora(saldo.data.atualizado_em, 'America/Sao_Paulo')} · Fonte
              materializada. Uma nova consulta não força a consolidação.
            </p>
          </>
        )}
      </section>
      <section className="painel-secao" aria-labelledby="evolucao-titulo">
        <h2 id="evolucao-titulo">Lucro acumulado</h2>
        {!legacyAllowed ? (
          <p>
            A evolução acumulada não está disponível para este recorte. Consulte
            o diário acima, que preserva todos os filtros.
          </p>
        ) : evolucao.isPending ? (
          <p role="status">Consultando a evolução…</p>
        ) : null}
        {evolucao.error && (
          <Falha
            error={evolucao.error}
            tentar={() => void evolucao.refetch()}
          />
        )}
        {evolucao.data && legacyAllowed && (
          <>
            <p className="painel-nota">
              Evolução materializada · pode usar semanas ou meses nos períodos
              longos. Consulta distinta do diário ao vivo. Última consolidação:{' '}
              {dataHora(evolucao.data.atualizado_em, 'America/Sao_Paulo')}.
            </p>
            {[...new Set(evolucao.data.evolucao.map((p) => p.banca_id))].map(
              (id) => (
                <GraficoEvolucao
                  key={String(id)}
                  dados={evolucao.data!.evolucao.filter(
                    (p) => p.banca_id === id,
                  )}
                  titulo={
                    evolucao.data!.evolucao.find((p) => p.banca_id === id)
                      ?.banca_nome ?? 'Sem banca atribuída'
                  }
                  periodo={String(query.periodo ?? 'Todo o histórico')}
                />
              ),
            )}
            {!evolucao.data.evolucao.length && (
              <p>
                Sem evolução consolidada. Escolha outro período ou envie
                apostas.
              </p>
            )}
          </>
        )}
      </section>
      <section className="painel-secao" aria-labelledby="comparacoes-titulo">
        <h2 id="comparacoes-titulo">Comparações do recorte</h2>
        <p>
          Lucro liquidado conhecido por casa, tipster e mercado. Pendências
          podem manter o total completo do diário como não informado.
        </p>
        {comparacoes.isPending && (
          <p role="status">Consultando as comparações…</p>
        )}
        {comparacoes.error && (
          <Falha
            error={comparacoes.error}
            tentar={() => void comparacoes.refetch()}
          />
        )}
        {comparacoes.data && (
          <>
            <p className="painel-nota">
              Consulta das comparações:{' '}
              {dataHora(comparacoes.data.snapshot_em, 'America/Sao_Paulo')} ·
              Dados de apostas ao vivo.
            </p>
            <div className="painel-comparacoes">
              {(['por_casa', 'por_tipster', 'por_mercado'] as const).map(
                (k, i) => (
                  <div key={k}>
                    <h3>{['Por casa', 'Por tipster', 'Por mercado'][i]}</h3>
                    {comparacoes.data![k].length ? (
                      <ul>
                        {comparacoes.data![k].map((g, index) => (
                          <li key={g.id ?? `sem-${index}`}>
                            <span>{g.nome ?? 'Sem identificação'}</span>
                            <strong className="numero">
                              {moeda(g.metricas.lucro_centavos, true)}
                            </strong>
                            <small>{g.metricas.total_apostas} apostas</small>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>Sem dados para comparar. Escolha outro recorte.</p>
                    )}
                  </div>
                ),
              )}
            </div>
          </>
        )}
      </section>
      <Link to={'/enviar' + location.search}>Enviar apostas</Link>
    </>
  );
}
export function PainelPage({ client }: { client?: Client }) {
  const api = client ?? getApiClient();
  const auth = useAuth();
  const [search, setSearch] = useSearchParams();
  const [cycle, setCycle] = useState(0);
  const leitura = useLeituraPainel();
  const { visao, adapter } = useFiltros('painel');
  const catalogos = useCatalogos(SITE_READ_CONTRACT, api, visao);
  return (
    <main className="pagina painel-page">
      <header>
        <h1>Painel</h1>
        <p>Resultado do período, lucro diário e grupos de origem.</p>
        <button
          disabled={leitura.waiting}
          onClick={() => setCycle((n) => n + 1)}
        >
          Atualizar todo o Painel
        </button>
      </header>
      <div className="painel-pilulas">
        {Object.entries(visao.valores).map(([k, v]) => (
          <button
            key={k}
            onClick={() => setSearch(alterarFiltro(search, k as Filtro))}
            aria-label={`Remover filtro ${DIMENSOES[k as keyof typeof DIMENSOES] ?? k}`}
          >
            <span>
              {DIMENSOES[k as keyof typeof DIMENSOES] ?? k}:{' '}
              {catalogos[k as keyof typeof catalogos]?.selecionada?.label ?? v}
            </span>{' '}
            ×
          </button>
        ))}
      </div>
      <details className="painel-filtros">
        <summary>Filtros e período</summary>
        <Filtros
          recurso="painel"
          catalogos={catalogos}
          mostrarPilulas={false}
        />
      </details>
      {adapter.bloqueios.length ? (
        <div role="alert">
          <h2>Confira os filtros</h2>
          {adapter.bloqueios.map((x) => (
            <p key={x}>{x}</p>
          ))}
        </div>
      ) : (
        <Conteudo
          key={JSON.stringify([auth?.state.privateEpoch, adapter.query, cycle])}
          client={api}
          query={adapter.query}
          cycle={cycle}
          leitura={leitura}
        />
      )}
    </main>
  );
}
