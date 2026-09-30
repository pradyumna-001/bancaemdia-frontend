import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { ConfigFailure } from './ConfigFailure';

it('oculta erros desconhecidos e oferece recuperação acessível', () => {
  render(<ConfigFailure error={new Error('stack trace e dados internos')} />);
  expect(screen.getByRole('alert')).toHaveTextContent(
    'A configuração do site está indisponível.',
  );
  expect(screen.queryByText(/stack trace/)).not.toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'Tentar novamente' }),
  ).toBeVisible();
});
