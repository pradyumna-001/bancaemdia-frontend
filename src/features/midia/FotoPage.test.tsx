import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { expect, it } from 'vitest';
import { FotoPage } from './FotoPage';

it('contexto sem chave conserva recuperação interna', () => {
  render(
    <RouterProvider
      router={createMemoryRouter([{ path: '/', element: <FotoPage /> }])}
    />,
  );
  expect(
    screen.getByRole('link', { name: 'Voltar para Apostas' }),
  ).toHaveAttribute('href', '/');
});

it('preserva a aposta e o recorte nos links internos', () => {
  render(
    <RouterProvider
      router={createMemoryRouter(
        [{ path: '/aposta/:chave/foto', element: <FotoPage /> }],
        { initialEntries: ['/aposta/chave%2Fsegura/foto?casa=7&apagadas=1'] },
      )}
    />,
  );
  expect(screen.getByRole('heading', { name: 'Foto da aposta' })).toBeVisible();
  expect(
    screen.getByRole('link', { name: 'Voltar para a aposta' }),
  ).toHaveAttribute('href', '/aposta/chave%2Fsegura?casa=7&apagadas=1');
  expect(
    screen.getByRole('link', { name: 'Voltar para Apostas' }),
  ).toHaveAttribute('href', '/?casa=7&apagadas=1');
});
