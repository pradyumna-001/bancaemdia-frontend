import { dataCivil, dataHora } from '../../lib/format';
import {
  BarraExata,
  geometriaExata,
} from '../../components/graficos/BarraExata';
import { ValorPainel } from './MetricasPainel';
import type { Diario } from './protocol';
export function DiarioPainel({
  data,
  busy,
  navegar,
}: {
  data: Diario;
  busy: boolean;
  navegar: (cursor: string) => void;
}) {
  const shapes = geometriaExata(
    data.dias.map((d) => d.metricas.lucro_centavos),
    data.dias.map((d) => d.metricas.total_apostas),
  );
  return (
    <>
      <div className="painel-total">
        <span>Total do período completo</span>
        <ValorPainel metricas={data.total_periodo} />
      </div>
      <nav className="painel-paginacao" aria-label="Intervalos diários">
        <button
          disabled={busy || !data.anterior_cursor}
          onClick={() => navegar(data.anterior_cursor!)}
        >
          Dias anteriores
        </button>
        <p aria-live="polite">
          {data.dias.length
            ? `${dataCivil(data.dias[0]!.dia)} a ${dataCivil(data.dias.at(-1)!.dia)}`
            : 'Nenhum dia disponível'}
        </p>
        <button
          disabled={busy || !data.proximo_cursor}
          onClick={() => navegar(data.proximo_cursor!)}
        >
          Próximos dias
        </button>
      </nav>
      {data.dias.length ? (
        <ul className="painel-dias">
          {data.dias.map((d, i) => (
            <li key={d.dia}>
              <time dateTime={d.dia}>{dataCivil(d.dia)}</time>
              <BarraExata desenho={shapes[i]!} />
              <ValorPainel metricas={d.metricas} />
            </li>
          ))}
        </ul>
      ) : (
        <p>
          Não há datas para comparar. Escolha outro período ou envie apostas.
        </p>
      )}
      <details className="painel-tabela">
        <summary>Ver dados diários em tabela</summary>
        <table>
          <caption>Lucro por dia · BRL</caption>
          <thead>
            <tr>
              <th scope="col">Data</th>
              <th scope="col">Resultado e quantidade</th>
            </tr>
          </thead>
          <tbody>
            {data.dias.map((d) => (
              <tr key={d.dia}>
                <th scope="row">{dataCivil(d.dia)}</th>
                <td>
                  <ValorPainel metricas={d.metricas} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
      <div className="painel-total">
        <span>Somente este intervalo</span>
        <ValorPainel metricas={data.subtotal_intervalo} />
      </div>
      {data.sem_data.total_apostas > 0 && (
        <div className="painel-total">
          <span>Apostas sem data · fora do desenho diário</span>
          <ValorPainel metricas={data.sem_data} />
        </div>
      )}
      <p className="painel-nota">
        Data da aposta · Brasília. Valores e estados aparecem em cada dia. A
        espessura das barras acompanha a quantidade de apostas.
      </p>
      <p className="painel-nota">
        Consulta do diário: {dataHora(data.snapshot_em, data.fuso_horario)} ·
        Dados de apostas ao vivo.
      </p>
    </>
  );
}
