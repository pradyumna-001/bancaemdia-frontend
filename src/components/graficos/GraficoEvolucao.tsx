import { useId } from 'react';
import { useLeitura } from './useLeitura';
import { moeda, dataCivil } from '../../lib/format';
import { evolucao, type PontoEvolucao } from './geometria';
import './graficos.css';

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
          <div
            className="escala-valores numero"
            aria-label="Limites do eixo vertical"
          >
            <span>Máximo {moeda(eixo.max)}</span>
            <span>Mínimo {moeda(eixo.min)}</span>
          </div>
          <svg
            className="evolucao-svg"
            viewBox="0 0 320 210"
            role="group"
            aria-label="Evolução do lucro acumulado. Explore os pontos ou consulte a tabela."
          >
            <line className="grafico-grade" x1="40" x2="280" y1="40" y2="40" />
            <line
              className="grafico-grade"
              x1="40"
              x2="280"
              y1="160"
              y2="160"
            />
            <line
              className="grafico-zero"
              x1="40"
              x2="280"
              y1={eixo.zero}
              y2={eixo.zero}
            />
            <polyline
              className="grafico-linha"
              points={pontos.map((p) => `${p.x},${p.y}`).join(' ')}
            />
            {pontos.map((p, i) => (
              <g key={p.dado.periodo_inicio}>
                <circle className="grafico-ponto" cx={p.x} cy={p.y} r="4" />
                <circle
                  className="grafico-alvo"
                  cx={p.x}
                  cy={p.y}
                  r="32"
                  tabIndex={0}
                  role="button"
                  aria-label={texto(p)}
                  aria-describedby={atual === p ? id + '-leitura' : undefined}
                  onFocus={() => selecionar(i)}
                  onBlur={() => selecionar(null)}
                  onMouseEnter={() => selecionar(i)}
                  onClick={() => selecionar(i)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') selecionar(null);
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      selecionar(i);
                    }
                  }}
                />
              </g>
            ))}
          </svg>
          <div className="escala-datas">
            <span>{dataCivil(pontos[0]!.dado.periodo_inicio)}</span>
            {pontos.length > 1 && (
              <span>{dataCivil(pontos.at(-1)!.dado.periodo_inicio)}</span>
            )}
          </div>
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
            O traço horizontal marca R$ 0. O espaço entre pontos acompanha os
            dias do calendário. A linha liga observações; não preenche dias sem
            dados.
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
