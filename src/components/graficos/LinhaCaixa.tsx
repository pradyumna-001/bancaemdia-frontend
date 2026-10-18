import { useId } from 'react';
import { dataCivil, moeda } from '../../lib/format';
import type { PontoEvolucao } from './geometria';
import { LinhaEvolucao } from './LinhaEvolucao';
import { useLeitura } from './useLeitura';
import './graficos.css';
import { SERIES_CAIXA, type SerieCaixa } from './series';
export { SERIES_CAIXA, type SerieCaixa } from './series';
const PERIODO = {
  lucro_acumulado_centavos: 'lucro_periodo_centavos',
  depositos_acumulados_centavos: 'depositos_periodo_centavos',
  saques_acumulados_centavos: 'saques_periodo_centavos',
  saldo_centavos: null,
} as const;
const ROTULO_PERIODO = {
  lucro_acumulado_centavos: 'Lucro no período',
  depositos_acumulados_centavos: 'Depósitos no período',
  saques_acumulados_centavos: 'Saques no período',
  saldo_centavos: null,
} as const;

/** Leitura compartilhada por Análises e Painel; nenhum valor é reconstruído. */
export function LinhaCaixa({
  pontos,
  serie,
}: {
  pontos: readonly PontoEvolucao[];
  serie: SerieCaixa;
}) {
  const id = useId();
  const [selecionado, selecionar] = useLeitura();
  const ordered = [...pontos].sort((a, b) =>
    a.periodo_inicio.localeCompare(b.periodo_inicio),
  );
  if (!ordered.length)
    return <p>Sem registros. Escolha outro período ou envie apostas.</p>;
  const first = ordered[0]!,
    last = ordered.at(-1)!;
  const signed = serie === 'lucro_acumulado_centavos';
  const campo = PERIODO[serie];
  const atual = selecionado === null ? undefined : ordered[selecionado];
  return (
    <div className="serie-temporal">
      <dl className="serie-referencias">
        <div>
          <dt>Primeiro registro · {dataCivil(first.periodo_inicio)}</dt>
          <dd className="numero">{moeda(first[serie], signed)}</dd>
        </div>
        <div>
          <dt>
            {serie === 'saldo_centavos' ? 'Saldo em' : 'Acumulado até'}{' '}
            {dataCivil(last.periodo_inicio)}
          </dt>
          <dd className="numero grafico-total">{moeda(last[serie], signed)}</dd>
        </div>
        <div>
          <dt>Saldo inicial cadastrado</dt>
          <dd className="numero">
            {moeda(first.saldo_inicial_centavos ?? null)}
            <small>
              Referência da banca, anterior aos resultados e movimentos. Não é a
              abertura do recorte.
            </small>
          </dd>
        </div>
      </dl>
      <p className="grafico-nota">
        {SERIES_CAIXA[serie]} · o primeiro ponto já inclui seu período. Os
        valores podem incluir histórico anterior ao recorte.
      </p>
      {ordered.every((p) => p[serie] === null) ? (
        <p>Saldo não informado para esta série.</p>
      ) : (
        <LinhaEvolucao
          pontos={ordered}
          serie={serie}
          selecionado={selecionado}
          selecionar={selecionar}
          leituraId={id + '-leitura'}
        />
      )}
      <div className="serie-leitura numero">
        {atual ? (
          <span role="tooltip" id={id + '-leitura'}>
            {dataCivil(atual.periodo_inicio)}: {moeda(atual[serie], signed)}
          </span>
        ) : (
          <span>Confira cada período abaixo ou toque em um ponto.</span>
        )}
      </div>
      <div
        className="serie-valores"
        role="region"
        aria-label={
          'Valores por período: ' +
          SERIES_CAIXA[serie] +
          ', ' +
          (first.banca_nome ?? 'sem banca atribuída') +
          ', ' +
          String(first.banca_id ?? 'não atribuída')
        }
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Tabela rolável deve permitir navegação por teclado.
        tabIndex={0}
      >
        <table>
          <caption>
            Valores por período · {ordered.length}{' '}
            {ordered.length === 1 ? 'registro' : 'registros'}
          </caption>
          <thead>
            <tr>
              <th scope="col">Início do período</th>
              {campo && <th scope="col">{ROTULO_PERIODO[serie]}</th>}
              <th scope="col">{SERIES_CAIXA[serie]}</th>
            </tr>
          </thead>
          <tbody>
            {ordered.map((p) => (
              <tr key={p.periodo_inicio}>
                <th scope="row">
                  <time dateTime={p.periodo_inicio}>
                    {dataCivil(p.periodo_inicio)}
                  </time>
                </th>
                {campo && <td className="numero">{moeda(p[campo], signed)}</td>}
                <td className="numero">{moeda(p[serie], signed)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="grafico-nota">
        As datas indicam o início de cada período, que pode agrupar dias,
        semanas ou meses. Datas ausentes não significam resultado zero.
      </p>
    </div>
  );
}
