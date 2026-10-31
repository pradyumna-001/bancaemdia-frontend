import { render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { LinhaCaixa } from './LinhaCaixa';
import { caixaAnalises } from '../../../tests/fixtures/analises';

it('expõe datas, primeiro acumulado, capital inicial e contribuições sem calcular abertura ou deltas', () => {
  const points = caixaAnalises.evolucao.filter((p) => p.banca_id === 1);
  render(
    <LinhaCaixa
      pontos={[...points].reverse()}
      serie="lucro_acumulado_centavos"
    />,
  );
  expect(screen.getByText('Primeiro registro · 20/09/2026')).toBeVisible();
  expect(screen.getByText('Acumulado até 10/10/2026')).toBeVisible();
  expect(screen.getByText('Saldo inicial cadastrado')).toBeVisible();
  const rows = within(screen.getByRole('table')).getAllByRole('row');
  expect(rows).toHaveLength(4);
  expect(rows[2]).toHaveTextContent('01/10/2026+R$ 180,00+R$ 380,00');
  expect(rows[3]).toHaveTextContent('10/10/2026+R$ 148,00+R$ 528,00');
  expect(screen.queryByText('+R$ 328,00')).not.toBeInTheDocument();
});

it('não liga saldo através de null nem substitui por zero, mantém referência inicial ausente', () => {
  const points = caixaAnalises.evolucao
    .filter((p) => p.banca_id === 1)
    .map((p) => ({ ...p, saldo_inicial_centavos: null }));
  const { container } = render(
    <LinhaCaixa pontos={points} serie="saldo_centavos" />,
  );
  expect(container.querySelectorAll('polyline')).toHaveLength(2);
  expect(screen.getByText('Saldo em 10/10/2026')).toBeVisible();
  const rows = within(screen.getByRole('table')).getAllByRole('row');
  expect(rows[2]).toHaveTextContent('01/10/2026Não informado');
  expect(
    container.querySelector('.serie-referencias > div:last-child'),
  ).toHaveTextContent('Não informado');
});
