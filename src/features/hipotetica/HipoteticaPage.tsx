import { useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getApiClient, type createApiClient } from '../../api/client';
import { ApiError } from '../../api/error';
import { recuperacaoErro } from '../../api/recovery';
import { SITE_READ_CONTRACT } from '../../api/site-read.generated';
import { useAuth } from '../../auth/ProvedorAuth';
import { ErroApi } from '../../components/ErroApi';
import { Filtros, useFiltros } from '../../components/filtros/Filtros';
import { useCatalogos } from '../apostas/catalogos';
import { dataHora, moeda, porcentagem } from '../../lib/format';
import { serializarConsulta } from '../../lib/params';
import { useRetryAfter } from '../../lib/useRetryAfter';
import {
  comparacaoPublicada,
  ENDPOINT_HIPOTETICA,
  ESTADOS,
  LIMITACOES,
  type Cenario,
} from './protocol';
import './hipotetica.css';

function Valores({ cenario, title }: { cenario: Cenario; title: string }) {
  return (
    <section className="hipotetica-cenario" aria-label={title}>
      <h2>{title}</h2>
      <p className="hipotetica-lucro">
        <span>Lucro das liquidadas</span>
        <strong className="numero">
          {moeda(cenario.lucro_centavos, true)}
        </strong>
      </p>
      <dl>
        <div>
          <dt>Giro</dt>
          <dd className="numero">{moeda(cenario.giro_centavos)}</dd>
        </div>
        <div>
          <dt>Retorno</dt>
          <dd className="numero">{moeda(cenario.retorno_centavos)}</dd>
        </div>
        <div>
          <dt>Base do ROI</dt>
          <dd className="numero">{moeda(cenario.base_roi_centavos)}</dd>
        </div>
        <div>
          <dt>ROI</dt>
          <dd className="numero">{porcentagem(cenario.roi)}</dd>
        </div>
        <div>
          <dt>Taxa de acerto</dt>
          <dd className="numero">{porcentagem(cenario.win_rate)}</dd>
        </div>
        <div>
          <dt>Liquidadas</dt>
          <dd className="numero">{cenario.liquidadas}</dd>
        </div>
        <div>
          <dt>Pendentes</dt>
          <dd className="numero">{cenario.pendentes}</dd>
        </div>
        <div>
          <dt>Exposição pendente</dt>
          <dd className="numero">
            {moeda(cenario.exposicao_pendente_centavos)}
          </dd>
        </div>
        <div>
          <dt>Valor de face pendente</dt>
          <dd className="numero">{moeda(cenario.face_pendente_centavos)}</dd>
        </div>
      </dl>
      <details>
        <summary>Composição do conjunto</summary>
        <dl>
          <div>
            <dt>Total de apostas</dt>
            <dd>{cenario.total_apostas}</dd>
          </div>
          <div>
            <dt>Em revisão</dt>
            <dd>{cenario.em_revisao}</dd>
          </div>
          <div>
            <dt>Fora do financeiro</dt>
            <dd>{cenario.fora_do_financeiro}</dd>
          </div>
          <div>
            <dt>Anuladas</dt>
            <dd>{cenario.anuladas}</dd>
          </div>
          <div>
            <dt>Resultado não informado</dt>
            <dd>{cenario.resultados_desconhecidos}</dd>
          </div>
          <div>
            <dt>Freebets</dt>
            <dd>{cenario.freebets}</dd>
          </div>
        </dl>
      </details>
    </section>
  );
}

export function HipoteticaPage({
  client,
}: {
  client?: ReturnType<typeof createApiClient>;
}) {
  const auth = useAuth();
  const api = client ?? getApiClient();
  const location = useLocation();
  const { visao, adapter } = useFiltros('hipotetica');
  const catalogos = useCatalogos(SITE_READ_CONTRACT, api, visao);
  const embargo = useRef<{ deadline: number; error?: ApiError }>({
    deadline: 0,
  });
  const [embargoError, setEmbargoError] = useState<ApiError>();
  const waiting = useRetryAfter(embargoError);
  const query = useQuery({
    queryKey: [
      'hipotetica',
      auth?.state.privateEpoch,
      auth?.state.person?.id,
      adapter.query,
    ],
    enabled: auth?.state.phase === 'authenticated' && !adapter.bloqueios.length,
    retryOnMount: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async ({ signal }) => {
      if (embargo.current.deadline > Date.now()) throw embargo.current.error;
      try {
        return await auth!.service.read(async () => {
          const response = await api.GET(ENDPOINT_HIPOTETICA, {
            signal,
            params: { query: {} },
            querySerializer: () => serializarConsulta(adapter.query),
          });
          return comparacaoPublicada(response.data, adapter.query);
        });
      } catch (error) {
        if (error instanceof ApiError && error.retryAfterMs) {
          embargo.current = { deadline: error.retryAfterDeadline!, error };
          setEmbargoError(error);
        }
        throw error;
      }
    },
  });
  const data = adapter.bloqueios.length ? undefined : query.data;
  const canRetry =
    !query.error || recuperacaoErro(query.error, 'leitura').action === 'tentar';
  function consult() {
    if (query.isFetching || waiting || adapter.bloqueios.length || !canRetry)
      return;
    void query.refetch();
  }
  return (
    <main className="pagina hipotetica">
      <header className="hipotetica-cabecalho">
        <Link to={{ pathname: '/', search: location.search }}>
          ← Voltar às Apostas
        </Link>
        <p className="hipotetica-sobretitulo">
          Comparação histórica · Hipotética
        </p>
        <h1>E se eu seguisse a stake do tipster?</h1>
        <p>
          Compare o que aconteceu com o cenário em que você usou a stake da dica
          confirmada. A odd e o resultado permanecem os da sua aposta.
        </p>
        <p className="hipotetica-nota">
          Esta visão não altera suas apostas nem os valores do Painel, Caixa ou
          Excel real.
        </p>
      </header>
      <details className="hipotetica-filtros">
        <summary>Filtrar comparação</summary>
        <Filtros recurso="hipotetica" catalogos={catalogos} />
      </details>
      {!!Object.keys(visao.valores).length && (
        <p>
          Há filtros salvos no endereço. Abra “Filtrar comparação” para conferir
          ou remover cada um.
        </p>
      )}
      {!!visao.invalidos.length && (
        <p role="status">
          Filtros inválidos usam o padrão. Abra os filtros para conferir.
        </p>
      )}
      {adapter.bloqueios.map((text) => (
        <p role="alert" key={text}>
          {text}
        </p>
      ))}
      {query.isPending && !adapter.bloqueios.length && (
        <p role="status">Consultando a comparação…</p>
      )}
      {!!query.error && !adapter.bloqueios.length && (
        <>
          <ErroApi
            error={query.error}
            intent="leitura"
            destination={location.pathname + location.search}
            actions={{
              tentar: query.isFetching || waiting ? undefined : consult,
            }}
          />
          {query.error instanceof ApiError && query.error.status === 422 && (
            <p>
              Confira os filtros. Esta comparação aceita até 10 mil apostas por
              consulta; reduza o período se necessário.
            </p>
          )}
        </>
      )}
      {data && (
        <>
          <section
            className="hipotetica-estado"
            aria-label="Situação da comparação"
          >
            <h2>{ESTADOS[data.estado][0]}</h2>
            <p>{ESTADOS[data.estado][1]}</p>
            <p className="numero">
              {data.apostas_consideradas} apostas no recorte ·{' '}
              {data.vinculos_confirmados} vínculos confirmados ·{' '}
              {data.apostas_alteradas} apostas alteradas na hipótese
            </p>
            {(data.estado === 'sem_apostas' ||
              data.estado === 'sem_vinculos_elegiveis') && (
              <Link
                to={{
                  pathname: data.estado === 'sem_apostas' ? '/' : '/revisao',
                  search: location.search,
                }}
              >
                {data.estado === 'sem_apostas' ? 'Ver Apostas' : 'Ver Revisão'}
              </Link>
            )}
            {query.isFetching && <p role="status">Atualizando comparação…</p>}
            {query.isError && (
              <p>
                Esta é a última consulta disponível; não foi possível
                atualizá-la.
              </p>
            )}
          </section>
          <div className="hipotetica-cenarios">
            <Valores cenario={data.real} title="O que aconteceu" />
            <Valores
              cenario={data.hipotetico}
              title="Seguindo a stake do tipster"
            />
          </div>
          <section
            className="hipotetica-diferencas"
            aria-labelledby="diferenca-titulo"
          >
            <h2 id="diferenca-titulo">O que mudaria</h2>
            <p>
              Hipotético menos real, calculado para o mesmo conjunto de apostas.
            </p>
            <dl>
              <div>
                <dt>Lucro</dt>
                <dd className="numero">
                  {moeda(data.diferencas.lucro_centavos, true)}
                </dd>
              </div>
              <div>
                <dt>Giro</dt>
                <dd className="numero">
                  {moeda(data.diferencas.giro_centavos, true)}
                </dd>
              </div>
              <div>
                <dt>Retorno</dt>
                <dd className="numero">
                  {moeda(data.diferencas.retorno_centavos, true)}
                </dd>
              </div>
              <div>
                <dt>Base do ROI</dt>
                <dd className="numero">
                  {moeda(data.diferencas.base_roi_centavos, true)}
                </dd>
              </div>
              <div>
                <dt>Exposição pendente</dt>
                <dd className="numero">
                  {moeda(data.diferencas.exposicao_pendente_centavos, true)}
                </dd>
              </div>
            </dl>
          </section>
          {!!data.limitacoes.length && (
            <section
              className="hipotetica-limitacoes"
              aria-labelledby="limites-titulo"
            >
              <h2 id="limites-titulo">Limitações deste recorte</h2>
              <ul>
                {data.limitacoes.map((item, index) => (
                  <li key={`${item.motivo}-${index}`}>
                    {LIMITACOES[item.motivo]}:{' '}
                    <span className="numero">{item.quantidade}</span>
                  </li>
                ))}
              </ul>
              <p>
                {data.apostas_indisponiveis} apostas sem hipótese disponível.{' '}
                {data.stakes_diferentes} apostas com stake diferente.
              </p>
            </section>
          )}
          <section
            className="hipotetica-escopo"
            aria-label="Escopo da comparação"
          >
            <h2>Sobre os dados</h2>
            <p>
              Valores em reais (BRL). Giro, retorno e lucro consideram as
              liquidadas, sem revisão grave e sem contar novamente as dicas
              consolidadas. Pendentes mostram exposição; não são previsão de
              retorno.
            </p>
            <p>
              Visibilidade:{' '}
              {data.filtros.visibilidade === 'ativas'
                ? 'apostas ativas'
                : data.filtros.visibilidade === 'apagadas'
                  ? 'somente apostas apagadas (auditoria)'
                  : 'apostas ativas e apagadas (auditoria)'}
              .
            </p>
            <p>
              Período pela data da aposta, no fuso São Paulo.{' '}
              {data.filtros.desde
                ? `De ${dataHora(data.filtros.desde, data.fuso_horario!)}. `
                : 'Sem limite inicial. '}
              {data.filtros.ate
                ? `Até ${dataHora(data.filtros.ate, data.fuso_horario!)}, exclusivo.`
                : 'Sem limite final.'}
            </p>
            <p>
              Dados consultados em{' '}
              {dataHora(data.snapshot_em, data.fuso_horario!)}. Fonte: apostas
              consultadas diretamente.
            </p>
            <details>
              <summary>Como a comparação funciona</summary>
              <p>
                Sem dica confirmada ou com stake igual, a aposta conserva os
                valores reais. A dica fornece somente a stake: sua odd e seu
                resultado não substituem os da aposta. Freebet preserva o valor
                de face e seu custo definido pelo servidor. CASHOUT, taxas,
                bônus e dados incompletos podem impedir a comparação; “Não
                informado” não representa zero.
              </p>
            </details>
          </section>
        </>
      )}
      {canRetry && !adapter.bloqueios.length && (
        <button
          type="button"
          disabled={query.isFetching || waiting}
          onClick={consult}
        >
          Atualizar comparação
        </button>
      )}
    </main>
  );
}
