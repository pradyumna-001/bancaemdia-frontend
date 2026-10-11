import { apresentarMetricas, type Metricas } from './protocol';
export function ValorPainel({ metricas }: { metricas: Metricas }) {
  const v = apresentarMetricas(metricas);
  return (
    <span className="painel-valor">
      <strong className={`numero ${v.sinal}`}>{v.lucro}</strong>
      <small>
        {v.estado} · {metricas.total_apostas} apostas
      </small>
      {metricas.lucro_centavos === null && (
        <small>
          Parte conhecida: <span className="numero">{v.conhecido}</span>
        </small>
      )}
      {metricas.pendentes_financeiras > 0 && (
        <small>{metricas.pendentes_financeiras} pendentes no financeiro</small>
      )}
      {metricas.revisoes_financeiras > 0 && (
        <small>{metricas.revisoes_financeiras} em revisão no financeiro</small>
      )}
      {metricas.fontes_excluidas_financeiro > 0 && (
        <small>
          {metricas.fontes_excluidas_financeiro} fontes fora do financeiro
        </small>
      )}
    </span>
  );
}
export function ResumoPainel({ metricas }: { metricas: Metricas }) {
  const v = apresentarMetricas(metricas);
  return (
    <section className="painel-resumo" aria-label="Resumo financeiro do diário">
      <div>
        <span>Lucro no período</span>
        <ValorPainel metricas={metricas} />
      </div>
      <div>
        <span>Apostas</span>
        <strong className="numero">{metricas.total_apostas}</strong>
        <small>
          {metricas.pendentes} pendentes · {metricas.em_revisao} em revisão
        </small>
      </div>
      <div>
        <span>Giro no período</span>
        <strong className="numero">{v.giro}</strong>
        <small>Moeda: BRL</small>
      </div>
      <div>
        <span>ROI</span>
        <strong className="numero">{v.roi}</strong>
        <small>Resultado sobre a base de ROI</small>
      </div>
    </section>
  );
}
