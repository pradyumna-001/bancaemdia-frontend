import { useId } from 'react';
import { useLeitura } from './useLeitura';
import { moeda } from '../../lib/format';
import { barras, type GrupoLucro } from './geometria';
import './graficos.css';

export function BarrasLucro({
  dados,
  titulo,
  periodo,
}: {
  dados: readonly GrupoLucro[];
  titulo: string;
  periodo: string;
}) {
  const id = useId();
  const [selecionado, selecionar] = useLeitura();
  let desenho;
  try {
    desenho = barras(dados);
  } catch {
    return (
      <section className="grafico">
        <h2>{titulo}</h2>
        <p role="alert">
          Não foi possível exibir a comparação. Atualize os dados ou escolha
          outro período.
        </p>
      </section>
    );
  }
  const { itens, eixo } = desenho;
  const atual = selecionado === null ? undefined : itens[selecionado];
  const nome = (d: GrupoLucro) => d.nome?.trim() || 'Sem identificação';
  return (
    <section className="grafico" aria-labelledby={id + '-titulo'}>
      <header>
        <h2 id={id + '-titulo'}>{titulo}</h2>
        <p>{periodo} · Lucro em reais</p>
      </header>
      {itens.length === 0 ? (
        <p>Sem grupos para comparar. Escolha outro período ou envie apostas.</p>
      ) : (
        <>
          <p className="grafico-nota">
            Comprimento: valor do lucro ou prejuízo. Espessura: raiz quadrada da
            quantidade de apostas. O traço vertical marca R$ 0.
          </p>
          <ul className="barras-lista">
            {itens.map((item, i) => (
              <li key={i}>
                <button
                  type="button"
                  className="barra-item"
                  aria-describedby={
                    atual === item ? id + '-leitura' : undefined
                  }
                  onFocus={() => selecionar(i)}
                  onBlur={() => selecionar(null)}
                  onMouseEnter={() => selecionar(i)}
                  onClick={() => selecionar(i)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') selecionar(null);
                  }}
                >
                  <span className="barra-cabecalho">
                    <span>{nome(item.dado)}</span>
                    <strong className="numero">
                      {moeda(item.dado.metricas.lucro_centavos, true)}
                    </strong>
                  </span>
                  <svg
                    viewBox="0 0 300 40"
                    preserveAspectRatio="none"
                    className="barra-svg"
                    aria-hidden="true"
                  >
                    <line
                      className="grafico-zero"
                      x1={eixo.zero}
                      x2={eixo.zero}
                      y1="0"
                      y2="40"
                    />
                    <rect
                      className={
                        item.dado.metricas.lucro_centavos < 0
                          ? 'barra-perda'
                          : 'barra-lucro'
                      }
                      x={item.x}
                      y={20 - item.espessura / 2}
                      width={item.largura}
                      height={item.espessura}
                    />
                  </svg>
                  <span className="grafico-nota">
                    {item.dado.metricas.total_apostas} apostas
                    {item.dado.metricas.lucro_centavos === 0
                      ? ' · Sem lucro ou prejuízo'
                      : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="grafico-leitura numero">
            {atual ? (
              <span role="tooltip" id={id + '-leitura'}>
                {nome(atual.dado)}:{' '}
                {moeda(atual.dado.metricas.lucro_centavos, true)} ·{' '}
                {atual.dado.metricas.total_apostas} apostas
              </span>
            ) : (
              <span>Toque ou foque uma linha para conferir os dados.</span>
            )}
          </div>
          <details className="grafico-tabela">
            <summary>Ver dados da comparação</summary>
            <div
              className="grafico-rolagem"
              role="region"
              aria-label="Tabela da comparação. Role para ver todas as colunas quando necessário."
              // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Região rolável precisa de foco para rolagem por teclado; coberta no e2e.
              tabIndex={0}
            >
              <table>
                <caption>
                  {titulo} — {periodo}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Grupo</th>
                    <th scope="col">Lucro</th>
                    <th scope="col">Apostas</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map(({ dado }, i) => (
                    <tr key={i}>
                      <th scope="row">{nome(dado)}</th>
                      <td className="numero">
                        {moeda(dado.metricas.lucro_centavos, true)}
                      </td>
                      <td className="numero">{dado.metricas.total_apostas}</td>
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
