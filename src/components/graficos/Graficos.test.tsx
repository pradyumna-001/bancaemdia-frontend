import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { GraficoEvolucao } from './GraficoEvolucao';
import { BarrasLucro } from './BarrasLucro';
import type { PontoEvolucao } from './geometria';

const dados: PontoEvolucao[] = [
  {
    periodo_inicio: '2026-01-01',
    lucro_acumulado_centavos: 1234,
    lucro_periodo_centavos: 9876,
    banca_id: null,
    banca_nome: null,
    saldo_centavos: null,
  },
];
it('tooltip permanece ao mover ponteiro até a leitura e Escape o dispensa', async () => {
  const user = userEvent.setup();
  render(<GraficoEvolucao dados={dados} titulo="Evolução" periodo="Janeiro" />);
  await user.hover(
    screen.getByRole('button', { name: '01/01/2026: +R$ 12,34' }),
  );
  await user.hover(screen.getByRole('tooltip'));
  expect(screen.getByRole('tooltip')).toHaveTextContent('+R$ 12,34');
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
});
it('dado inválido tem erro seguro e nova resposta recupera gráfico sem inventar valor', () => {
  const { rerender } = render(
    <GraficoEvolucao
      dados={[{ ...dados[0]!, lucro_acumulado_centavos: NaN }]}
      titulo="Evolução"
      periodo="Janeiro"
    />,
  );
  expect(screen.getByRole('alert')).toHaveTextContent('Atualize os dados');
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  rerender(
    <GraficoEvolucao dados={dados} titulo="Evolução" periodo="Janeiro" />,
  );
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.getByRole('button')).toHaveAccessibleName(
    '01/01/2026: +R$ 12,34',
  );
});
it('vazio sugere próximo passo nos dois componentes', () => {
  render(
    <>
      <GraficoEvolucao dados={[]} titulo="Evolução" periodo="Janeiro" />
      <BarrasLucro dados={[]} titulo="Comparação" periodo="Janeiro" />
    </>,
  );
  expect(screen.getAllByText(/Escolha outro período ou envie/)).toHaveLength(2);
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
});
