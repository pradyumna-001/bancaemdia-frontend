import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { SistemaPage } from './SistemaPage';

it('troca cenários sem manter seleção antiga e recupera a comparação após vazio', async () => {
  const user = userEvent.setup();
  render(<SistemaPage />);
  expect(screen.getByRole('note')).toHaveTextContent('dados fictícios');
  await user.click(
    screen.getByRole('button', { name: '29/09/2026: +R$ 180,00' }),
  );
  expect(screen.getByRole('tooltip')).toBeVisible();
  await user.click(screen.getByRole('radio', { name: 'Sem dados' }));
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  expect(screen.getAllByText(/Escolha outro período ou envie/)).toHaveLength(2);
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  await user.click(screen.getByRole('radio', { name: 'Comparação' }));
  expect(screen.getByRole('radio', { name: 'Comparação' })).toBeChecked();
  expect(screen.getByText('29 apostas · 3 grupos exibidos')).toBeVisible();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it.each([
  ['Um ponto', '16 apostas · 1 grupo exibido', '+R$ 240,00'],
  ['Zero', '0 apostas · 3 grupos exibidos', 'R$ 0,00'],
  ['Extremos', '29 apostas · 3 grupos exibidos', '+R$ 90.071.992.547.409,91'],
])(
  'apresenta %s com resumo legível e sem valor financeiro inválido',
  async (scenario, count, total) => {
    const user = userEvent.setup();
    render(<SistemaPage />);
    await user.click(screen.getByRole('radio', { name: scenario! }));
    expect(screen.getByRole('radio', { name: scenario! })).toBeChecked();
    const comparison = within(
      screen.getByRole('region', { name: 'Lucro por grupo' }),
    );
    expect(comparison.getByText(count!)).toBeVisible();
    expect(
      comparison.getByText(total!, { selector: 'strong.grafico-total' }),
    ).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText(/NaN|Infinity/)).not.toBeInTheDocument();
  },
);
