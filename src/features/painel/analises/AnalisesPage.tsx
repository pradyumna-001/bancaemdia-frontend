import { useDeferredValue } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { getApiClient, type createApiClient } from '../../../api/client';
import { SITE_READ_CONTRACT } from '../../../api/site-read.generated';
import { useAuth } from '../../../auth/ProvedorAuth';
import { useRetryAfter } from '../../../lib/useRetryAfter';
import { ErroApi } from '../../../components/ErroApi';
import { EscolhaFiltro } from '../../../components/filtros/EscolhaFiltro';
import { dataHora, decimal, moeda, porcentagem } from '../../../lib/format';
import {
  DIMENSOES,
  PERIODOS,
  serializarConsulta,
  alterarFiltro,
  type Filtro,
} from '../../../lib/params';
import { useCatalogos } from '../../apostas/catalogos';
import { useLeituraPainel } from '../useLeituraPainel';
import { ComparacaoAnalise } from './ComparacaoAnalise';
import { EvolucaoCaixa } from './EvolucaoCaixa';
import { MapaHorarios } from './MapaHorarios';
import {
  SERIES_CAIXA,
  type SerieCaixa,
} from '../../../components/graficos/LinhaCaixa';
import {
  ANALISES,
  DIMENSOES_ANALISES,
  consultaAnalises,
  validarAnalises,
  validarCaixa,
  sinal,
  type Particao,
} from './protocol';
import './analises.css';
import '../../../components/filtros/filtros.css';

type Client = ReturnType<typeof createApiClient>;
const VISIBILIDADE: Record<string, string> = {
  '1': 'Somente apagadas',
  todas: 'Ativas e apagadas',
  '0': 'Ativas',
};
const FILTRO_LABELS: Record<string, string> = {
  ...DIMENSOES,
  periodo: 'Período',
  apagadas: 'Apostas apagadas',
  estado: 'Resultado',
  origem: 'Origem',
  desde: 'Data inicial',
  ate: 'Data final',
  revisao: 'Revisão grave',
};
const RECORTES: ReadonlyArray<{
  tipo: Particao;
  titulo: string;
  ajuda: string;
}> = [
  {
    tipo: 'faixas_odds',
    titulo: 'Faixas de odds',
    ajuda: 'Compare resultados por faixa; odds desconhecidas ficam separadas.',
  },
  {
    tipo: 'heatmap',
    titulo: 'Dias da semana e horários',
    ajuda:
      'Madrugada 00h–06h, manhã 06h–12h, tarde 12h–18h e noite 18h–24h, no fuso da conta. Não substitui o lucro de cada data.',
  },
  {
    tipo: 'quartis_stake',
    titulo: 'Faixas de valor de face',
    ajuda:
      'Faixas calculadas a partir das apostas deste recorte. Freebet mantém seu valor de face; valores não aplicáveis aparecem separados.',
  },
  {
    tipo: 'por_banca_progressao',
    titulo: 'Progressão por banca',
    ajuda:
      'Compare o lucro com o capital de cada banca. Capital ausente ou não positivo não é progresso zero.',
  },
];
export function AnalisesPage({ client = getApiClient() }: { client?: Client }) {
  const auth = useAuth();
  return <Conteudo key={auth?.state.privateEpoch} client={client} />;
}
function Conteudo({ client }: { client: Client }) {
  const auth = useAuth();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const { visao, query, periodo, preservados } = consultaAnalises(params);
  const leitura = useLeituraPainel();
  const catalogos = useCatalogos(
    SITE_READ_CONTRACT,
    client,
    visao,
    DIMENSOES_ANALISES,
  );
  const enabled = auth?.state.phase === 'authenticated';
  const analysis = useQuery({
    queryKey: ['analises', auth?.state.privateEpoch, query],
    enabled,
    retryOnMount: false,
    queryFn: ({ signal }) =>
      leitura.read(async () =>
        validarAnalises(
          (
            await client.GET(ANALISES, {
              signal,
              params: { query: {} },
              querySerializer: () => serializarConsulta(query),
            })
          ).data,
        ),
      ),
  });
  // Movements do not have a tipster/market. Keep a separate, explicit population.
  const cashQuery = {
    periodo,
    ...(query.casa_id ? { casa_id: query.casa_id } : {}),
  };
  const cash = useQuery({
    queryKey: ['analises-caixa', auth?.state.privateEpoch, cashQuery],
    enabled,
    retryOnMount: false,
    queryFn: ({ signal }) =>
      leitura.read(async () =>
        validarCaixa(
          (
            await client.GET('/api/v1/painel', {
              signal,
              params: { query: {} },
              querySerializer: () => serializarConsulta(cashQuery),
            })
          ).data,
        ),
      ),
  });
  // Cash evolution sits below the live analyses: render its per-banca series
  // in interruptible work so its arrival never becomes one long task.
  const caixa = useDeferredValue(cash.data);
  const analysisWaiting = useRetryAfter(analysis.error);
  const cashWaiting = useRetryAfter(cash.error);
  const blocked =
    leitura.waiting ||
    analysisWaiting ||
    cashWaiting ||
    analysis.isFetching ||
    cash.isFetching;
  const change = (key: Filtro, value?: string) => {
    if (!blocked) setParams(alterarFiltro(params, key, value));
  };
  const fail = (error: unknown, retry: () => void, contexto: string) => (
    <ErroApi
      error={error}
      contexto={contexto}
      intent="leitura"
      destination={location.pathname + location.search}
      actions={{ tentar: retry }}
    />
  );
  const data = analysis.data;
  return (
    <main className="pagina analises-page numero">
      <header>
        <Link to={'/painel' + location.search}>Voltar ao Painel</Link>
        <h1>Análises</h1>
        <p>Onde seus resultados se concentram.</p>
        <button
          disabled={blocked}
          onClick={() => {
            void analysis.refetch();
            void cash.refetch();
          }}
        >
          Atualizar análises
        </button>
      </header>
      <nav aria-label="Seções das análises" className="analises-ancoras">
        <a href="#analises-esportes">Por esporte</a>
        <a href="#analises-outros">Outros recortes</a>
        <a href="#analises-caixa">Evolução de caixa</a>
        <Link to={'/painel' + location.search}>Lucro por dia</Link>
      </nav>
      <details className="analises-filtros">
        <summary>Filtros e período</summary>
        <p>
          Aplicados às análises ao vivo: período, casa, tipster e mercado. As
          datas da janela seguem Brasília; o fuso da conta divide os dias e
          horários dentro dela.
        </p>
        <div className="analises-controles">
          <EscolhaFiltro
            label="Período das análises"
            value={periodo}
            selectedLabel={PERIODOS[periodo]}
            options={Object.entries(PERIODOS).map(([value, label]) => ({
              value,
              label,
            }))}
            resetLabel="Últimos 30 dias"
            disabled={blocked}
            onChange={(v) => change('periodo', v ?? '30d')}
          />
          {DIMENSOES_ANALISES.map((key) => {
            const c = catalogos[key];
            return (
              <EscolhaFiltro
                key={key}
                label={DIMENSOES[key]}
                onOpen={c?.abrir}
                value={visao.valores[key]}
                selectedLabel={c?.selecionada?.label}
                options={c?.options ?? []}
                disabled={blocked}
                onChange={(v) => change(key, v)}
                busca={
                  c?.buscar
                    ? {
                        consulta: c.consulta ?? '',
                        buscar: c.buscar,
                        atualizando: c.atualizando,
                      }
                    : undefined
                }
              >
                {c?.erro && <p role="alert">{c.erro}</p>}
                {c?.fase === 'carregando' && (
                  <p role="status">Consultando opções…</p>
                )}
                {c?.fase === 'pronto' && !c.options.length && (
                  <p>Nenhuma opção nesta busca. Tente outro nome.</p>
                )}
                {c?.anterior && (
                  <button onClick={c.anterior}>Opções anteriores</button>
                )}
                {c?.proxima && <button onClick={c.proxima}>Mais opções</button>}
                {c?.tentar && c.fase === 'erro' && (
                  <button onClick={c.tentar}>Tentar consultar opções</button>
                )}
              </EscolhaFiltro>
            );
          })}
        </div>
      </details>
      <div className="analises-pilulas">
        {Object.entries(visao.valores).map(([key, value]) => (
          <button
            key={key}
            disabled={blocked}
            onClick={() => change(key as Filtro)}
          >
            <span className="somente-leitor">Remover filtro </span>
            {FILTRO_LABELS[key] ?? key}:{' '}
            {catalogos[key as keyof typeof catalogos]?.selecionada?.label ??
              (key === 'periodo'
                ? PERIODOS[value as keyof typeof PERIODOS]
                : key === 'apagadas'
                  ? VISIBILIDADE[value]
                  : value)}{' '}
            <span aria-hidden="true">×</span>
          </button>
        ))}
      </div>
      {!!visao.invalidos.length && (
        <p role="status">
          Parâmetros inválidos usam valores padrão. Os demais filtros foram
          preservados.
        </p>
      )}
      {!!preservados.length && (
        <p className="analises-escopo">
          Filtros preservados no endereço, sem efeito nas análises desta página:{' '}
          {preservados.map((k) => FILTRO_LABELS[k] ?? k).join(', ')}. Os valores
          abaixo pertencem à população incluída pela visão canônica da API, não
          ao recorte completo da lista de Apostas.
        </p>
      )}
      <p className="analises-nota">
        Período consultado: {PERIODOS[periodo]}. Casa:{' '}
        {query.casa_id
          ? (catalogos.casa?.selecionada?.label ??
            'Identificador ' + query.casa_id)
          : 'Todas as casas'}
        . Tipster e mercado presentes no endereço também são aplicados.
      </p>
      {analysis.isPending && (
        <p role="status" className="consulta-carregando">
          Consultando análises…
        </p>
      )}
      {!!analysis.error &&
        fail(analysis.error, () => void analysis.refetch(), 'Análises ao vivo')}
      {data && (
        <>
          <p className="analises-nota">
            Visão ao vivo · consultada em{' '}
            {dataHora(data.respondido_em, data.fuso_horario)} · dias/horários em{' '}
            {data.fuso_horario}.{' '}
            {data.replica_atraso_disponivel &&
            data.replica_atraso_segundos !== null
              ? `Defasagem informada na consulta: ${decimal(data.replica_atraso_segundos)} s. `
              : 'Defasagem da leitura não informada. '}
            {analysis.isError
              ? 'A atualização falhou; os valores desta consulta anterior continuam visíveis.'
              : ''}
          </p>
          <section
            className="analises-resumo"
            aria-label="Resultado do recorte"
          >
            <div>
              <span>Lucro liquidado conhecido</span>
              <strong
                className={
                  'numero ' + sinal(data.total_filtrado.lucro_centavos)
                }
              >
                {moeda(data.total_filtrado.lucro_centavos, true)}
              </strong>
              <small>
                {data.total_filtrado.total_apostas} apostas ·{' '}
                {data.total_filtrado.pendentes} pendentes
              </small>
            </div>
            <div>
              <span>ROI</span>
              <strong className="numero">
                {porcentagem(data.total_filtrado.roi)}
              </strong>
              <small>Sobre o valor em risco</small>
            </div>
            <div>
              <span>Odd média</span>
              <strong className="numero">{decimal(data.odd_media)}</strong>
              <small>
                {data.odds_desconhecidas} odds desconhecidas ·{' '}
                {data.odds_nao_aplicaveis} não aplicáveis
                {data.odd_media === null
                  ? ' · Sem odd aplicável ao cálculo.'
                  : ''}
              </small>
            </div>
            <div>
              <span>Fator de lucro</span>
              <strong className="numero">{decimal(data.profit_factor)}</strong>
              <small>
                {data.profit_factor === null
                  ? 'Não informado; pode ocorrer quando não há perdas.'
                  : 'Ganhos em relação às perdas'}
              </small>
            </div>
          </section>
          {data.total_filtrado.total_apostas === 0 ? (
            <section className="analises-secao">
              <h2>Sem apostas neste recorte</h2>
              <p>Escolha outro período ou envie suas apostas para começar.</p>
              <Link to={'/enviar' + location.search}>Enviar apostas</Link>
            </section>
          ) : (
            <>
              <section id="analises-esportes" className="analises-secao">
                <header>
                  <h2>Lucro por esporte</h2>
                  <p>
                    Todos os esportes do recorte, inclusive os não informados.
                  </p>
                  <strong className="numero">
                    Total {moeda(data.total_filtrado.lucro_centavos, true)} ·{' '}
                    {data.total_filtrado.total_apostas} apostas
                  </strong>
                </header>
                <ComparacaoAnalise
                  itens={data.por_esporte}
                  tipo="por_esporte"
                />
              </section>
              <section id="analises-outros" className="analises-secao">
                <h2>Outros recortes</h2>
                <p>
                  Abra o que deseja analisar. Cada comparação usa o mesmo
                  recorte das análises ao vivo.
                </p>
                {RECORTES.map(({ tipo, titulo, ajuda }) => (
                  <details key={tipo} className="analises-recorte">
                    <summary>{titulo}</summary>
                    <p>{ajuda}</p>
                    <p>
                      Total do recorte:{' '}
                      <strong className="numero">
                        {moeda(data.total_filtrado.lucro_centavos, true)} ·{' '}
                        {data.total_filtrado.total_apostas} apostas
                      </strong>
                    </p>
                    {tipo === 'heatmap' ? (
                      <MapaHorarios itens={data.heatmap} />
                    ) : (
                      <ComparacaoAnalise itens={data[tipo]} tipo={tipo} />
                    )}
                  </details>
                ))}
              </section>
            </>
          )}
        </>
      )}
      <section id="analises-caixa" className="analises-secao">
        <h2>Evolução de caixa</h2>
        <p>
          Lucro, depósitos, saques e saldo separados. Esta seção aplica apenas
          período e casa; tipster, mercado e os demais filtros não se aplicam ao
          caixa.
        </p>
        <p className="analises-nota">
          A evolução consolidada tem atualização diferente das análises ao vivo.
          Acumulados incluem histórico anterior ao início da janela. Atualizar a
          consulta não reprocessa os dados consolidados.
        </p>
        {cash.isPending && <p role="status">Consultando evolução de caixa…</p>}
        {!!cash.error &&
          fail(cash.error, () => void cash.refetch(), 'Evolução de caixa')}
        {caixa && (
          <>
            <p className="analises-nota">
              Dados consolidados em{' '}
              {dataHora(caixa.atualizado_em, 'America/Sao_Paulo')} · consulta em{' '}
              {dataHora(caixa.respondido_em, 'America/Sao_Paulo')}.{' '}
              {cash.isError
                ? 'A atualização falhou; os dados anteriores continuam visíveis.'
                : ''}
            </p>
            <EvolucaoCaixa
              pontos={caixa.evolucao}
              serie={
                params.getAll('caixa_serie').length === 1 &&
                Object.hasOwn(SERIES_CAIXA, params.get('caixa_serie')!)
                  ? (params.get('caixa_serie') as SerieCaixa)
                  : 'lucro_acumulado_centavos'
              }
              onChange={(serie) => {
                const next = new URLSearchParams(params);
                next.set('caixa_serie', serie);
                setParams(next);
              }}
            />
          </>
        )}
      </section>
      <p>
        <Link to={'/configuracoes' + location.search}>
          Ajustar o fuso das análises
        </Link>{' '}
        · <Link to={'/painel/metas' + location.search}>Metas opcionais</Link> ·{' '}
        <Link to={'/contas' + location.search}>
          Financeiro por conta e titular
        </Link>
      </p>
    </main>
  );
}
