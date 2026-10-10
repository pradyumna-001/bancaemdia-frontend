import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { GraficoEvolucao } from './GraficoEvolucao';
import { BarrasLucro } from './BarrasLucro';
import type { PontoEvolucao, GrupoLucro } from './geometria';

const dados: PontoEvolucao[] = [
  {
    periodo_inicio: '2026-01-01',
    lucro_acumulado_centavos: 1234,
    lucro_periodo_centavos: 9876,
    depositos_acumulados_centavos: 0,
    depositos_periodo_centavos: 0,
    saques_acumulados_centavos: 0,
    saques_periodo_centavos: 0,
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

it('mostra o acumulado final recebido, sem somar os pontos', () => {
  render(
    <GraficoEvolucao
      dados={[
        ...dados,
        {
          ...dados[0]!,
          periodo_inicio: '2026-01-02',
          lucro_acumulado_centavos: 500,
        },
      ]}
      titulo="Evolução"
      periodo="Janeiro"
    />,
  );
  expect(screen.getByText('Acumulado até 02/01/2026')).toBeVisible();
  expect(screen.getByText('+R$ 5,00', { selector: 'strong' })).toBeVisible();
});

it('usa resumo informado pela API e não soma grupos nem inventa total ausente', () => {
  const grupo: GrupoLucro = {
    id: 1,
    nome: 'Grupo',
    familia: null,
    metricas: {
      lucro_centavos: 100,
      total_apostas: 2,
      base_roi_centavos: 0,
      freebets: 0,
      giro_centavos: 0,
      greens: 0,
      pendentes: 0,
      reds: 0,
      retorno_centavos: 0,
      roi: '0',
      roi_basis_points: 0,
      win_rate: '0',
      win_rate_basis_points: 0,
    },
  };
  const { rerender } = render(
    <BarrasLucro
      dados={[grupo]}
      titulo="Comparação"
      periodo="Janeiro"
      resumo={{ lucro_centavos: 999, total_apostas: 7 }}
    />,
  );
  expect(screen.getByText('+R$ 9,99')).toBeVisible();
  expect(screen.getByText('7 apostas · 1 grupo exibido')).toBeVisible();
  rerender(
    <BarrasLucro dados={[grupo]} titulo="Comparação" periodo="Janeiro" />,
  );
  expect(screen.getByText('Total não informado')).toBeVisible();
});
