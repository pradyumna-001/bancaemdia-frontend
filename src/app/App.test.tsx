import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { App } from './App';

test('permite consultar o estado desta versão sem depender de serviços externos', async () => {
  const user = userEvent.setup();
  render(<App />);

  expect(
    screen.getByRole('heading', { name: 'bancaemdia', level: 1 }),
  ).toBeVisible();
  const information = screen.getByText(
    'As telas serão disponibilizadas nas próximas etapas.',
  );
  expect(information).not.toBeVisible();
  await user.click(screen.getByText('Sobre esta versão'));
  expect(information).toBeVisible();
  await user.click(screen.getByText('Sobre esta versão'));
  expect(information).not.toBeVisible();
});
