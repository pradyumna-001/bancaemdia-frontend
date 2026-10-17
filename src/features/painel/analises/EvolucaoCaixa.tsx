import {
  LinhaCaixa,
  SERIES_CAIXA,
  type SerieCaixa,
} from '../../../components/graficos/LinhaCaixa';
import { moeda, dataCivil } from '../../../lib/format';
import type { Evolucao } from './protocol';
import '../../../components/graficos/graficos.css';

export function EvolucaoCaixa({
  pontos,
  serie = 'lucro_acumulado_centavos',
  onChange,
}: {
  pontos: readonly Evolucao[];
  serie?: SerieCaixa;
  onChange?: (serie: SerieCaixa) => void;
}) {
  if (!pontos.length)
    return (
      <p>Sem evolução consolidada. Escolha outro período ou envie apostas.</p>
    );
  return (
    <>
      <fieldset className="analises-series">
        <legend>Série do gráfico</legend>
        {(Object.keys(SERIES_CAIXA) as SerieCaixa[]).map((k) => (
          <label key={k}>
            <input
              type="radio"
              name="serie-caixa"
              checked={serie === k}
              onChange={() => onChange?.(k)}
            />
            {SERIES_CAIXA[k]}
          </label>
        ))}
      </fieldset>
      {[...new Set(pontos.map((p) => p.banca_id))].map((id) => {
        const values = pontos.filter((p) => p.banca_id === id);
        return (
          <section className="analises-banca" key={String(id)}>
            <h3>{values[0]!.banca_nome ?? 'Sem banca atribuída'}</h3>
            <p>
              {SERIES_CAIXA[serie]} · datas no eixo horizontal, reais no
              vertical.
            </p>
            {values.every((p) => p[serie] === null) ? (
              <p>Saldo não informado para esta série.</p>
            ) : (
              <LinhaCaixa pontos={values} serie={serie} />
            )}
            <details>
              <summary>Ver todos os valores de caixa em tabela</summary>
              <div
                className="analises-tabela"
                role="region"
                aria-label={
                  'Tabela de evolução de caixa: ' +
                  (id === null
                    ? 'sem banca atribuída'
                    : `${values[0]!.banca_nome ?? 'Banca sem nome'}, banca ${id}`)
                }
                // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Região rolável exige foco para rolagem por teclado, verificada em e2e.
                tabIndex={0}
              >
                <table>
                  <caption>Valores por período e acumulados</caption>
                  <thead>
                    <tr>
                      <th scope="col">Data inicial</th>
                      {Object.values(SERIES_CAIXA).map((name) => (
                        <th scope="col" key={name}>
                          {name}
                        </th>
                      ))}
                      <th scope="col">Lucro no período</th>
                      <th scope="col">Depósitos no período</th>
                      <th scope="col">Saques no período</th>
                    </tr>
                  </thead>
                  <tbody>
                    {values.map((p) => (
                      <tr key={p.periodo_inicio}>
                        <th scope="row">{dataCivil(p.periodo_inicio)}</th>
                        {(Object.keys(SERIES_CAIXA) as SerieCaixa[]).map(
                          (k) => (
                            <td className="numero" key={k}>
                              {moeda(p[k], k === 'lucro_acumulado_centavos')}
                            </td>
                          ),
                        )}
                        <td className="numero">
                          {moeda(p.lucro_periodo_centavos, true)}
                        </td>
                        <td className="numero">
                          {moeda(p.depositos_periodo_centavos)}
                        </td>
                        <td className="numero">
                          {moeda(p.saques_periodo_centavos)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </section>
        );
      })}
      <p className="analises-nota">
        Depósitos não são lucro. Lacunas de saldo permanecem sem linha; não são
        convertidas em zero.
      </p>
    </>
  );
}
