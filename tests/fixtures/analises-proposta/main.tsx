import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Logo } from '../../../src/components/Logo';
import {
  BarraExata,
  geometriaExata,
} from '../../../src/components/graficos/BarraExata';
import { moeda, porcentagem } from '../../../src/lib/format';
import '../../../src/styles/base.css';
import './proposta.css';

// Entirely synthetic presentation data. No API request or financial aggregation.
const sports = [
  { nome: 'Futebol', lucro: '58200', n: 74, roi: '0.1616667' },
  { nome: 'Tênis', lucro: '-14600', n: 32, roi: '-0.09125' },
  { nome: 'Basquete', lucro: '12400', n: 18, roi: '0.155' },
  {
    nome: 'Esportes eletrônicos · Counter-Strike',
    lucro: '-3200',
    n: 10,
    roi: '-0.128',
  },
  { nome: 'Esporte não informado', lucro: '0', n: 8, roi: '0' },
];
const geometry = geometriaExata(
  sports.map((s) => s.lucro),
  sports.map((s) => s.n),
);
const moneyClass = (value: string) =>
  BigInt(value) < 0n ? 'perda' : BigInt(value) > 0n ? 'lucro' : '';

function Proposta() {
  const [params, setParams] = useState(new URLSearchParams(location.search));
  const table = params.get('visual') === 'tabela';
  const [theme, setTheme] = useState(
    document.documentElement.dataset.tema ?? 'claro',
  );
  const choose = (value: string) => {
    const next = new URLSearchParams(params);
    next.set('visual', value);
    history.replaceState(null, '', '?' + next.toString());
    setParams(next);
  };
  return (
    <>
      <aside className="proposta-aviso" aria-label="Escolha da proposta visual">
        <div>
          <strong>Proposta de Análises · dados fictícios</strong>
          <p>Compare a organização. Esta página não consulta sua conta.</p>
        </div>
        <fieldset>
          <legend>Visualização proposta</legend>
          <label>
            <input
              type="radio"
              name="visual"
              checked={!table}
              onChange={() => choose('barras')}
            />{' '}
            A · Comparação visual
          </label>
          <label>
            <input
              type="radio"
              name="visual"
              checked={table}
              onChange={() => choose('tabela')}
            />{' '}
            B · Tabela compacta
          </label>
        </fieldset>
        <button
          type="button"
          onClick={() => {
            const next = theme === 'claro' ? 'escuro' : 'claro';
            document.documentElement.dataset.tema = next;
            setTheme(next);
          }}
        >
          Ver tema {theme === 'claro' ? 'escuro' : 'claro'}
        </button>
      </aside>
      <header className="proposta-topo">
        <Logo />
        <span>Painel / Análises</span>
      </header>
      <main id="conteudo" className="analises-proposta">
        <header className="analises-titulo">
          <div>
            <p className="eyebrow">PAINEL</p>
            <h1>Análises</h1>
            <p>Onde seus resultados se concentram.</p>
          </div>
          <span className="recorte">Últimos 30 dias · Todas as casas</span>
        </header>
        <nav className="analises-ancoras" aria-label="Seções das análises">
          <a href="#esportes">Por esporte</a>
          <a href="#outros">Outros recortes</a>
          <a href="#caixa">Evolução de caixa</a>
        </nav>
        <section className="analises-resumo" aria-label="Resultado do recorte">
          <div>
            <span>Lucro do recorte</span>
            <strong className="numero lucro">{moeda('52800', true)}</strong>
            <small>142 apostas · 21 pendentes</small>
          </div>
          <div>
            <span>ROI</span>
            <strong className="numero">{porcentagem('0.0825')}</strong>
            <small>Sobre a base calculada pela API</small>
          </div>
          <div>
            <span>Odd média</span>
            <strong className="numero">2,14</strong>
            <small>5 odds desconhecidas · 21 não aplicáveis</small>
          </div>
          <div>
            <span>Fator de lucro</span>
            <strong className="numero">1,42</strong>
            <small>Ganhos em relação às perdas</small>
          </div>
        </section>
        <section
          id="esportes"
          className="analises-secao"
          aria-labelledby="esporte-titulo"
        >
          <div className="secao-cabecalho">
            <div>
              <h2 id="esporte-titulo">Lucro por esporte</h2>
              <p>Todos os esportes do recorte, inclusive os não informados.</p>
            </div>
            <span className="total-secao numero">
              Total {moeda('52800', true)}
            </span>
          </div>
          {table ? (
            <div
              className="proposta-tabela"
              role="region"
              aria-label="Resultados por esporte"
              tabIndex={0}
            >
              <table>
                <caption>Resultado por esporte · 142 apostas</caption>
                <thead>
                  <tr>
                    <th scope="col">Esporte</th>
                    <th scope="col">Lucro</th>
                    <th scope="col">Apostas</th>
                    <th scope="col">ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {sports.map((s) => (
                    <tr key={s.nome}>
                      <th scope="row">{s.nome}</th>
                      <td className={'numero ' + moneyClass(s.lucro)}>
                        {moeda(s.lucro, true)}
                      </td>
                      <td className="numero">{s.n}</td>
                      <td className="numero">{porcentagem(s.roi)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <>
              <p className="escala-nota">
                Barras à esquerda: prejuízo · à direita: lucro · espessura:
                quantidade de apostas
              </p>
              <ul className="esportes-comparacao">
                {sports.map((s, i) => (
                  <li key={s.nome}>
                    <div className="esporte-nome">
                      <strong>{s.nome}</strong>
                      <span>
                        {s.n} apostas · ROI {porcentagem(s.roi)}
                      </span>
                    </div>
                    <BarraExata desenho={geometry[i]!} />
                    <strong
                      className={'esporte-valor numero ' + moneyClass(s.lucro)}
                    >
                      {moeda(s.lucro, true)}
                    </strong>
                  </li>
                ))}
              </ul>
              <details className="dados-equivalentes">
                <summary>Ver os mesmos dados em tabela</summary>
                <div
                  className="proposta-tabela"
                  role="region"
                  aria-label="Tabela equivalente dos esportes"
                  tabIndex={0}
                >
                  <table>
                    <caption>Resultado por esporte</caption>
                    <thead>
                      <tr>
                        <th scope="col">Esporte</th>
                        <th scope="col">Lucro</th>
                        <th scope="col">Apostas</th>
                        <th scope="col">ROI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sports.map((s) => (
                        <tr key={s.nome}>
                          <th scope="row">{s.nome}</th>
                          <td className={'numero ' + moneyClass(s.lucro)}>
                            {moeda(s.lucro, true)}
                          </td>
                          <td>{s.n}</td>
                          <td>{porcentagem(s.roi)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </>
          )}
          <p className="fonte-nota">
            Visão ao vivo · divisão dos dias em Brasília · valores desta
            proposta são fictícios.
          </p>
        </section>
        <section
          id="outros"
          className="analises-secao"
          aria-labelledby="outros-titulo"
        >
          <h2 id="outros-titulo">Outros recortes</h2>
          <p>Abra o que deseja analisar.</p>
          <details className="recorte-detalhe">
            <summary>Faixas de odds</summary>
            <p>Comparação por faixa, com odd desconhecida separada.</p>
            <dl className="recorte-exemplo">
              <div>
                <dt>1,50 a 1,99 · 48 apostas</dt>
                <dd className="numero lucro">{moeda('24000', true)}</dd>
              </div>
              <div>
                <dt>Odd desconhecida · 5 apostas</dt>
                <dd className="numero">Não informada</dd>
              </div>
            </dl>
            <p className="fonte-nota">
              Exemplos de apresentação; não representam a distribuição completa.
            </p>
          </details>
          <details className="recorte-detalhe">
            <summary>Dias da semana e horários</summary>
            <p>
              Comparação entre madrugada, manhã, tarde e noite no fuso salvo na
              conta. O lucro de cada data continua no Painel.
            </p>
            <p className="fonte-nota">
              Esta proposta define a hierarquia; a matriz será desenhada com os
              valores retornados pela API.
            </p>
          </details>
          <details className="recorte-detalhe">
            <summary>Faixas de valor de face</summary>
            <p>
              Quartis definidos pela API, com limites e itens não aplicáveis
              visíveis. Freebet mantém seu valor de face.
            </p>
          </details>
          <details className="recorte-detalhe">
            <summary>Progressão por banca</summary>
            <dl className="recorte-exemplo">
              <div>
                <dt>Banca principal</dt>
                <dd className="numero">{porcentagem('0.0528')}</dd>
              </div>
              <div>
                <dt>Banca sem capital informado</dt>
                <dd>Progressão indisponível</dd>
              </div>
            </dl>
            <p>Capital ausente não é zero. O site não calcula a progressão.</p>
          </details>
        </section>
        <section
          id="caixa"
          className="analises-secao"
          aria-labelledby="caixa-titulo"
        >
          <h2 id="caixa-titulo">Evolução de caixa</h2>
          <p>Lucro, depósitos, saques e saldo aparecem separados.</p>
          <p className="fonte-nota">
            Exemplo de leitura de um período. A evolução usa agregados
            materializados e pode ter atualização diferente das análises ao
            vivo.
          </p>
          <dl className="caixa-exemplo">
            <div>
              <dt>Lucro acumulado</dt>
              <dd className="numero lucro">{moeda('52800', true)}</dd>
            </div>
            <div>
              <dt>Depósitos acumulados</dt>
              <dd className="numero">{moeda('200000')}</dd>
            </div>
            <div>
              <dt>Saques acumulados</dt>
              <dd className="numero">{moeda('50000')}</dd>
            </div>
            <div>
              <dt>Saldo</dt>
              <dd>Não informado</dd>
            </div>
          </dl>
          <p className="fonte-nota">
            Depósitos não são lucro. Na implementação, a série completa terá
            gráfico e tabela com o escopo próprio indicado.
          </p>
        </section>
      </main>
    </>
  );
}
createRoot(document.getElementById('root')!).render(<Proposta />);
