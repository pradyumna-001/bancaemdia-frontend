import { memo } from 'react';
import { Icone } from '../../components/Icone';
import {
  BarraExata,
  geometriaExata,
} from '../../components/graficos/BarraExata';
import { dataHora } from '../../lib/format';
import {
  chaveGrupo,
  chaveTipster,
  nomeGrupo,
  nomeTipster,
  type Grupo,
  type Hierarquia,
} from './protocol';
import { ValorPainel } from './MetricasPainel';
// Rows are memoized by the page; settling other Painel queries skips them.
export const GruposPainel = memo(function GruposPainel({
  grupos,
  pagina,
}: {
  grupos: Grupo[];
  pagina: Hierarquia;
}) {
  const shapes = geometriaExata(
    grupos.map((g) => g.metricas.lucro_centavos),
    grupos.map((g) => g.metricas.total_apostas),
  );
  return (
    <>
      <div className="painel-total">
        <span>Total do período · grupos</span>
        <ValorPainel metricas={pagina.total_periodo} />
      </div>
      {!grupos.length && (
        <p>
          Não há grupos neste recorte. Escolha outros filtros ou envie apostas.
        </p>
      )}
      <div className="painel-grupos">
        {grupos.map((g, i) => (
          <details key={chaveGrupo(g)}>
            <summary>
              <span className="painel-grupo-nome">
                <Icone nome="expandir" />
                <span>
                  <span>{nomeGrupo(g)}</span>
                  <small>
                    {g.ativo === false ? 'Arquivado · ' : ''}
                    {g.tipsters.length} de {g.total_filhos} tipsters carregados
                  </small>
                </span>
              </span>
              <ValorPainel metricas={g.metricas} />
              <BarraExata desenho={shapes[i]!} />
            </summary>
            <ul aria-label={`Tipsters de ${nomeGrupo(g)}`}>
              {g.tipsters.map((t) => (
                <li key={chaveTipster(t)}>
                  <span>{nomeTipster(t)}</span>
                  <ValorPainel metricas={t.metricas} />
                </li>
              ))}
            </ul>
            {g.tipsters.length < g.total_filhos && (
              <p>
                Há mais tipsters deste grupo. Use “Carregar mais grupos e
                tipsters” para conferi-los; o total acima já abrange todos.
              </p>
            )}
          </details>
        ))}
      </div>
      <p className="painel-nota">
        {pagina.total_grupos} grupos · {pagina.total_filhos} parcelas de
        tipsters no recorte. Nomes atuais do catálogo; os vínculos pertencem a
        cada aposta.
      </p>
      <p className="painel-nota">
        Consulta dos grupos: {dataHora(pagina.snapshot_em, pagina.fuso_horario)}
        . Cada página é uma consulta separada; após alterações, atualize todo o
        Painel.
      </p>
    </>
  );
});
