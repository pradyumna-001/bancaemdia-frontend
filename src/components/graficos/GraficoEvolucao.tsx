import { useId } from 'react';
import { useLeitura } from './useLeitura';
import { moeda, dataCivil } from '../../lib/format';
import { evolucao, type PontoEvolucao } from './geometria';
import './graficos.css';
import { LinhaEvolucao } from './LinhaEvolucao';

export function GraficoEvolucao({
  dados,
  titulo,
  periodo,
}: {
  dados: readonly PontoEvolucao[];
  titulo: string;
  periodo: string;
}) {
  const id = useId();
  const [selecionado, selecionar] = useLeitura();
  let desenho;
  try {
    desenho = evolucao(dados);
  } catch {
    return (
      <section className="grafico">
        <h2>{titulo}</h2>
        <p role="alert">
          Não foi possível exibir a evolução. Atualize os dados ou escolha outra
          série.
        </p>
      </section>
    );
  }
  const { pontos, eixo } = desenho;
  const atual = selecionado === null ? undefined : pontos[selecionado];
  const texto = (p: (typeof pontos)[number]) =>
    `${dataCivil(p.dado.periodo_inicio)}: ${moeda(p.dado.lucro_acumulado_centavos, true)}`;
  return (
    <section className="grafico" aria-labelledby={id + '-titulo'}>
      <header>
        <h2 id={id + '-titulo'}>{titulo}</h2>
        <p>{periodo} · Lucro acumulado em reais</p>
      </header>
      {pontos.length === 0 ? (
        <p>
          Sem dados de evolução neste período. Escolha outro período ou envie
          apostas.
        </p>
      ) : (
        <>
          <div className="grafico-resumo">
            <span>
              Acumulado até {dataCivil(pontos.at(-1)!.dado.periodo_inicio)}
            </span>
            <strong className="numero grafico-total">
              {moeda(pontos.at(-1)!.dado.lucro_acumulado_centavos, true)}
            </strong>
          </div>
          <LinhaEvolucao
            pontos={pontos}
            eixo={eixo}
            selecionado={selecionado}
            selecionar={selecionar}
            leituraId={id + '-leitura'}
          />
          <div className="grafico-leitura numero">
            {atual ? (
              <span role="tooltip" id={id + '-leitura'}>
                {texto(atual)}
              </span>
            ) : (
              <span>Toque ou foque um ponto para conferir o valor.</span>
            )}
          </div>
          <p className="grafico-nota">
            A linha mostra o lucro acumulado em cada data. Dias sem dados mantêm
            seu espaço no calendário.
          </p>
          <details className="grafico-tabela">
            <summary>Ver dados da evolução</summary>
            <div
              className="grafico-rolagem"
              role="region"
              aria-label="Tabela da evolução. Role para ver todas as colunas quando necessário."
              // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Região rolável precisa de foco para rolagem por teclado; coberta no e2e.
              tabIndex={0}
            >
              <table>
                <caption>
                  {titulo} — {periodo}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Data</th>
                    <th scope="col">Lucro acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  {pontos.map((p) => (
                    <tr key={p.dado.periodo_inicio}>
                      <th scope="row">{dataCivil(p.dado.periodo_inicio)}</th>
                      <td className="numero">
                        {moeda(p.dado.lucro_acumulado_centavos, true)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </section>
  );
}
