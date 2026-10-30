import { moeda } from '../../../lib/format';
import { nomeBucket, sinal, type Bucket } from './protocol';

const DIAS = [
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
  'Domingo',
];
const TURNOS = {
  madrugada: 'Madrugada · 00h–06h',
  manha: 'Manhã · 06h–12h',
  tarde: 'Tarde · 12h–18h',
  noite: 'Noite · 18h–24h',
};
export function MapaHorarios({ itens }: { itens: readonly Bucket[] }) {
  const extras = itens.filter(
    (b) => !/^[0-6]:(madrugada|manha|tarde|noite)$/.test(b.chave),
  );
  return (
    <>
      <p className="analises-nota">
        Deslize a matriz ou use as setas do teclado para ver os quatro horários.
        Os dias permanecem à esquerda.
      </p>
      <div
        className="analises-tabela"
        role="region"
        aria-label="Mapa de dias e horários"
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Região rolável exige foco para rolagem por teclado, verificada em e2e.
        tabIndex={0}
      >
        <table className="analises-mapa">
          <caption>
            Lucro liquidado conhecido e quantidade; valores legíveis sem hover
          </caption>
          <thead>
            <tr>
              <th scope="col">Dia</th>
              {Object.values(TURNOS).map((t) => (
                <th scope="col" key={t}>
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DIAS.map((day, i) => (
              <tr key={day}>
                <th scope="row">{day}</th>
                {Object.keys(TURNOS).map((turn) => {
                  const b = itens.find((b) => b.chave === `${i}:${turn}`);
                  return (
                    <td key={turn} className={b ? sinal(b.lucro_centavos) : ''}>
                      {b ? (
                        <>
                          <strong className="numero">
                            {moeda(b.lucro_centavos, true)}
                          </strong>
                          <small>
                            {b.total_apostas} apostas · {b.pendentes} pendentes
                          </small>
                        </>
                      ) : (
                        'Não informado'
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!!extras.length && (
        <ul>
          {extras.map((b) => (
            <li key={b.chave}>
              {nomeBucket(b, 'heatmap')} · {moeda(b.lucro_centavos, true)} ·{' '}
              {b.total_apostas} apostas
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
