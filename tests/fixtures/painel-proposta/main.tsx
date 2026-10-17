import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Logo } from '../../../src/components/Logo';
import { Icone } from '../../../src/components/Icone';
import { ABAS } from '../../../src/app/nav';
import { moeda, dataCivil } from '../../../src/lib/format';
import { escalaZero } from '../../../src/components/graficos/geometria';
import { grupos, dias } from './exemplos';
import '../../../src/styles/base.css';
import './proposta.css';

function Barra({
  valor,
  quantidade,
  maxQuantidade,
  eixo,
}: {
  valor: number | null;
  quantidade: number | null;
  maxQuantidade: number;
  eixo: ReturnType<typeof escalaZero>;
}) {
  const fim = valor === null ? eixo.zero : eixo.coordenada(valor);
  const espessura =
    quantidade === null ? 0 : 22 * Math.sqrt(quantidade / maxQuantidade);
  return (
    <svg
      className="proposta-barra"
      viewBox="0 0 300 30"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <line x1={eixo.zero} x2={eixo.zero} y1="0" y2="30" />
      <rect
        className={valor !== null && valor < 0 ? 'perda' : 'lucro'}
        x={Math.min(eixo.zero, fim)}
        y={15 - espessura / 2}
        width={Math.abs(fim - eixo.zero)}
        height={espessura}
        rx="2"
      />
    </svg>
  );
}

function Proposta() {
  const raw = new URLSearchParams(location.search).get('trecho');
  const initial = raw !== null && /^[0-6]$/.test(raw) ? Number(raw) : 5;
  const [trecho, setTrecho] = useState(initial);
  const [escuro, setEscuro] = useState(
    document.documentElement.dataset.tema === 'escuro',
  );
  const [todos, setTodos] = useState(false);
  const visiveis = todos ? dias : dias.slice(trecho * 14, trecho * 14 + 14);
  const eixoDias = escalaZero(
    dias.flatMap((d) => (d.lucro === null ? [] : [d.lucro])),
    4,
    296,
  );
  const eixoGrupos = escalaZero(
    grupos.map((g) => g.lucro),
    4,
    296,
  );
  const trocarTrecho = (n: number) => {
    setTrecho(n);
    const url = new URL(location.href);
    url.searchParams.set('trecho', String(n));
    history.replaceState(null, '', url);
  };
  return (
    <>
      <aside className="proposta-aviso">
        Proposta visual • exemplos fictícios • integração do Painel ainda
        pendente
      </aside>
      <header className="proposta-topo">
        <Logo />
        <nav aria-label="Áreas ilustradas">
          {ABAS.filter((a) => a.mobile && a.path !== '/revisao').map((a) => (
            <a
              key={a.path}
              href={
                a.path === '/painel'
                  ? '/painel'
                  : `http://127.0.0.1:4196${a.path}`
              }
              aria-current={a.path === '/painel' ? 'page' : undefined}
            >
              <Icone nome={a.icone} />
              {a.title}
            </a>
          ))}
        </nav>
        <button
          onClick={() => {
            const next = !escuro;
            document.documentElement.dataset.tema = next ? 'escuro' : 'claro';
            setEscuro(next);
          }}
        >
          {escuro ? 'Ver tema claro' : 'Ver tema escuro'}
        </button>
      </header>
      <main className="proposta-pagina">
        <header className="proposta-titulo">
          <div>
            <p className="proposta-sobre">RESULTADO E ESTADO DOS DADOS</p>
            <h1>Painel</h1>
            <p>13 de julho a 10 de outubro de 2026 · 90 dias</p>
          </div>
          <a href="#lucro-diario">Conferir dia a dia</a>
        </header>
        <div className="proposta-contexto">
          <span>Todos os grupos</span>
          <span>Todas as casas</span>
          <span>Data da aposta · Brasília</span>
        </div>
        <section
          className="proposta-resumo"
          aria-label="Resumo ilustrativo do período"
        >
          <div>
            <span>Lucro no período</span>
            <strong className="numero lucro">{moeda(78000, true)}</strong>
            <small>Valores de exemplo</small>
          </div>
          <div>
            <span>Apostas</span>
            <strong className="numero">114</strong>
            <small>8 ainda pendentes</small>
          </div>
          <div>
            <span>ROI</span>
            <strong className="numero">22,29%</strong>
            <small>Resultado sobre a base de ROI</small>
          </div>
          <div>
            <span>Saldo total · todo o histórico</span>
            <strong className="proposta-indisponivel">
              Ainda não confirmado
            </strong>
            <small>
              Parte conhecida: <span className="numero">{moeda(2075000)}</span>
              <br />1 conta sem saldo confiável
            </small>
          </div>
        </section>
        <p className="proposta-frescor">
          Última consolidação: 10/10/2026, às 09:00 · Consulta: 09:02. As novas
          entradas podem aparecer após a próxima consolidação.
        </p>
        <div className="proposta-colunas">
          <section
            className="proposta-secao"
            id="lucro-diario"
            aria-labelledby="diario-titulo"
          >
            <header>
              <h2 id="diario-titulo">Lucro por dia</h2>
              <p>
                Datas e valores sempre visíveis. Cada barra representa um dia.
              </p>
            </header>
            <div className="proposta-total">
              <span>Total do período de 90 dias</span>
              <strong className="numero">{moeda(78000, true)}</strong>
            </div>
            <div className="proposta-paginacao">
              <button
                disabled={trecho === 0 || todos}
                onClick={() => trocarTrecho(trecho - 1)}
                aria-label="Dias anteriores"
              >
                ←
              </button>
              <p aria-live="polite">
                {dataCivil(visiveis[0]!.data)} a{' '}
                {dataCivil(visiveis.at(-1)!.data)}
              </p>
              <button
                disabled={trecho === 6 || todos}
                onClick={() => trocarTrecho(trecho + 1)}
                aria-label="Próximos dias"
              >
                →
              </button>
            </div>
            <div className="proposta-eixo" aria-hidden="true">
              <span>Prejuízo ←</span>
              <span>→ Lucro</span>
            </div>
            <ul className="proposta-dias">
              {visiveis.map((d) => (
                <li key={d.data}>
                  <span>
                    <time dateTime={d.data}>{dataCivil(d.data)}</time>
                    <small>{d.estado}</small>
                  </span>
                  <Barra
                    valor={d.lucro}
                    quantidade={d.apostas}
                    maxQuantidade={12}
                    eixo={eixoDias}
                  />
                  <span className="proposta-valor">
                    <strong
                      className={`numero ${d.lucro === null || d.lucro === 0 ? '' : d.lucro < 0 ? 'perda' : 'lucro'}`}
                    >
                      {d.lucro === null
                        ? 'Não informado'
                        : moeda(d.lucro, true)}
                    </strong>
                    <small>
                      {d.apostas === null
                        ? 'Quantidade ausente'
                        : `${d.apostas} apostas`}
                    </small>
                  </span>
                </li>
              ))}
            </ul>
            <button className="proposta-todos" onClick={() => setTodos(!todos)}>
              {todos
                ? 'Voltar aos intervalos de 14 dias'
                : 'Mostrar os 90 dias em lista'}
            </button>
            <p className="proposta-nota">
              Zero confirmado, dia sem atividade, pendências e dado ausente têm
              indicações próprias. A espessura das barras acompanha a quantidade
              de apostas.
            </p>
          </section>
          <section className="proposta-secao" aria-labelledby="grupos-titulo">
            <header>
              <h2 id="grupos-titulo">Lucro por grupo</h2>
              <p>
                Abra um grupo para conferir seus tipsters. O total fica sempre à
                vista.
              </p>
            </header>
            <div className="proposta-total">
              <span>Total do mesmo período</span>
              <strong className="numero">{moeda(78000, true)}</strong>
            </div>
            <div className="proposta-grupos">
              {grupos.map((g) => (
                <details key={g.nome} open={g.nome === grupos[0]!.nome}>
                  <summary>
                    <span className="proposta-grupo-nome">
                      <Icone nome="expandir" />
                      <span>
                        {g.nome}
                        <small>
                          {g.apostas} apostas ·{' '}
                          {g.tipsters.length
                            ? `${g.tipsters.length} tipsters`
                            : 'Sem atribuição'}
                        </small>
                      </span>
                    </span>
                    <strong
                      className={`numero ${g.lucro < 0 ? 'perda' : 'lucro'}`}
                    >
                      {moeda(g.lucro, true)}
                    </strong>
                    <Barra
                      valor={g.lucro}
                      quantidade={g.apostas}
                      maxQuantidade={80}
                      eixo={eixoGrupos}
                    />
                  </summary>
                  {g.tipsters.length ? (
                    <ul aria-label={`Tipsters de ${g.nome}`}>
                      {g.tipsters.map((t) => (
                        <li key={t.nome}>
                          <span>
                            <span>{t.nome}</span>
                            <small>{t.apostas} apostas</small>
                          </span>
                          <strong
                            className={`numero ${t.lucro < 0 ? 'perda' : 'lucro'}`}
                          >
                            {moeda(t.lucro, true)}
                          </strong>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>
                      Entradas sem grupo atribuído continuam no total e aparecem
                      nesta seção.
                    </p>
                  )}
                </details>
              ))}
            </div>
            <p className="proposta-nota">
              André aparece em dois grupos; cada linha representa as entradas
              daquele grupo. A atribuição e os valores serão fornecidos pelo
              servidor.
            </p>
            <aside className="proposta-limite">
              Estes dados servem para avaliar a disposição da tela. Não são
              respostas da API nem prova de conciliação dos totais.
            </aside>
          </section>
        </div>
      </main>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<Proposta />);
