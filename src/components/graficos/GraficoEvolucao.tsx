import { useId } from 'react';
import { evolucao, type PontoEvolucao } from './geometria';
import './graficos.css';
import { LinhaCaixa } from './LinhaCaixa';

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
  const { pontos } = desenho;
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
        <LinhaCaixa
          pontos={pontos.map((p) => p.dado)}
          serie="lucro_acumulado_centavos"
        />
      )}
    </section>
  );
}
