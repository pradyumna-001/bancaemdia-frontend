import {
  BarraExata,
  geometriaExata,
} from '../../../components/graficos/BarraExata';
import { moeda, porcentagem } from '../../../lib/format';
import {
  nomeBucket,
  motivoProgressao,
  sinal,
  type Bucket,
  type Particao,
} from './protocol';

const NOMES: Record<Particao, string> = {
  por_esporte: 'esportes',
  faixas_odds: 'faixas de odds',
  heatmap: 'dias e horários',
  quartis_stake: 'faixas de valor de face',
  por_banca_progressao: 'progressão por banca',
};

export function ComparacaoAnalise({
  itens,
  tipo,
}: {
  itens: readonly Bucket[];
  tipo: Particao;
}) {
  const desenho = geometriaExata(
    itens.map((b) => String(b.lucro_centavos)),
    itens.map((b) => b.total_apostas),
  );
  if (!itens.length)
    return (
      <p>
        Sem categorias neste recorte. Escolha outro período ou envie apostas.
      </p>
    );
  return (
    <>
      <p className="analises-nota">
        Esquerda: prejuízo · direita: lucro · espessura: quantidade de apostas.
      </p>
      <ul className="analises-barras">
        {itens.map((b, i) => (
          <li key={b.chave}>
            <div>
              <strong>{nomeBucket(b, tipo)}</strong>
              <small>
                {b.total_apostas} apostas · {b.pendentes} pendentes · ROI{' '}
                {porcentagem(b.roi)}
              </small>
              {tipo === 'por_banca_progressao' && (
                <small>Progressão: {motivoProgressao(b)}</small>
              )}
            </div>
            <BarraExata desenho={desenho[i]!} />
            <strong className={'numero ' + sinal(b.lucro_centavos)}>
              {moeda(b.lucro_centavos, true)}
            </strong>
          </li>
        ))}
      </ul>
      <details className="analises-tabela-detalhe">
        <summary>Ver os mesmos dados em tabela</summary>
        <div
          className="analises-tabela"
          role="region"
          aria-label={'Dados da comparação: ' + NOMES[tipo]}
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Região rolável exige foco para rolagem por teclado, verificada em e2e.
          tabIndex={0}
        >
          <table>
            <caption>Valores e quantidades deste recorte</caption>
            <thead>
              <tr>
                <th scope="col">Categoria</th>
                <th scope="col">Lucro</th>
                <th scope="col">Apostas</th>
                <th scope="col">Pendentes</th>
                <th scope="col">ROI</th>
                <th scope="col">Acertos</th>
                {tipo === 'por_banca_progressao' && (
                  <>
                    <th scope="col">Capital da banca</th>
                    <th scope="col">Progressão</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {itens.map((b) => (
                <tr key={b.chave}>
                  <th scope="row">{nomeBucket(b, tipo)}</th>
                  <td className={'numero ' + sinal(b.lucro_centavos)}>
                    {moeda(b.lucro_centavos, true)}
                  </td>
                  <td className="numero">{b.total_apostas}</td>
                  <td className="numero">{b.pendentes}</td>
                  <td className="numero">{porcentagem(b.roi)}</td>
                  <td className="numero">{porcentagem(b.hit_rate)}</td>
                  {tipo === 'por_banca_progressao' && (
                    <>
                      <td className="numero">
                        {moeda(b.capital_banca_centavos ?? null)}
                      </td>
                      <td>{motivoProgressao(b)}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
