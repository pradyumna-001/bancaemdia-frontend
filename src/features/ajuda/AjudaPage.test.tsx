import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { AjudaPage } from './AjudaPage';

const routers: ReturnType<typeof createMemoryRouter>[] = [];
afterEach(() => {
  routers.splice(0).forEach((r) => r.dispose());
  vi.restoreAllMocks();
});
function open(path = '/tutorial') {
  const router = createMemoryRouter(
    [
      { path: '/tutorial', element: <AjudaPage /> },
      { path: '/extensao', element: <AjudaPage extensao /> },
    ],
    { initialEntries: [path] },
  );
  routers.push(router);
  render(<RouterProvider router={router} />);
  return router;
}

it('mantém a ajuda pública sem consultas de identidade ou dados privados', async () => {
  const fetcher = vi.spyOn(globalThis, 'fetch');
  const router = open('/tutorial?casa=7&apagadas=1&entrada=prints');
  expect(
    screen.getByRole('heading', { name: 'Tutorial', level: 1 }),
  ).toBeVisible();
  expect(screen.getByRole('link', { name: 'Abrir Enviar' })).toHaveAttribute(
    'href',
    '/enviar?casa=7&apagadas=1',
  );
  expect(
    screen.getByText(/result.json sozinho não contém as fotos/),
  ).toBeVisible();
  await act(() => router.navigate('/extensao?casa=7&apagadas=1'));
  expect(
    screen.getByRole('heading', {
      name: 'O download ainda não está disponível',
    }),
  ).toBeVisible();
  expect(fetcher).not.toHaveBeenCalled();
});

it.each([
  [
    'coleta',
    'Conectar a extensão',
    'Gerenciar dispositivos em Coleta',
    '/coleta',
    null,
  ],
  ['prints', 'Prints', 'Enviar Prints', '/enviar', 'prints'],
  ['planilha', 'Planilha', 'Importar planilha', '/enviar', 'planilha'],
  ['manual', 'Nova aposta', 'Abrir Nova aposta', '/aposta/nova', null],
  ['bot', 'Bot do Telegram', 'Abrir Conexões', '/configuracoes/conexoes', null],
  ['excel', 'Excel do Painel', 'Abrir Painel para exportar', '/painel', null],
])(
  'abre o guia %s e conserva o recorte na tarefa',
  async (guia, title, action, path, entrada) => {
    const user = userEvent.setup();
    const router = open('/tutorial?casa=7&apagadas=1');
    await user.click(
      within(
        screen.getByRole('navigation', { name: 'Assuntos do tutorial' }),
      ).getByRole('link', { name: new RegExp(`^${title}`) }),
    );
    expect(router.state.location.search).toContain(`guia=${guia}`);
    const region = screen.getByRole('region', { name: title });
    expect(region).toHaveFocus();
    const target = new URL(
      within(region).getByRole('link', { name: action }).getAttribute('href')!,
      'https://site.example',
    );
    expect(target.pathname).toBe(path);
    expect(target.searchParams.get('casa')).toBe('7');
    expect(target.searchParams.get('apagadas')).toBe('1');
    expect(target.searchParams.get('entrada')).toBe(entrada);
  },
);

it('separa exportação do Painel, exportação global e bot ainda sem endereço', async () => {
  const router = open('/tutorial?guia=excel&tipster=8');
  expect(
    screen.getByText(/a janela de dias visível não limita o arquivo/),
  ).toBeVisible();
  expect(
    screen.getByRole('link', { name: 'Configurações → Privacidade' }),
  ).toHaveAttribute('href', '/configuracoes/privacidade?guia=excel&tipster=8');
  await act(() => router.navigate('/tutorial?guia=bot'));
  expect(screen.getByText(/link ilustrativo.*é fictício/)).toBeVisible();
  expect(document.querySelector('a[href*="t.me"]')).toBeNull();
  await act(() => router.navigate('/tutorial?guia=telegram'));
  expect(
    screen.getByRole('link', { name: /Instruções oficiais do Telegram/ }),
  ).toHaveAttribute('rel', 'noopener noreferrer');
});

it.each(['inexistente', '__proto__', 'constructor'])(
  'assunto inválido %s usa o guia padrão e mantém filtros',
  (guia) => {
    open(`/tutorial?guia=${guia}&casa=7`);
    expect(
      screen.getByRole('region', { name: 'Export do Telegram' }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Abrir Enviar' })).toHaveAttribute(
      'href',
      `/enviar?guia=${guia}&casa=7`,
    );
  },
);

it('extensão sem release não oferece binário, checksum inventado ou tutorial de protótipo', async () => {
  const user = userEvent.setup();
  const router = open('/extensao?casa=7&apagadas=1');
  expect(document.querySelector('a[href*="github.com"]')).toBeNull();
  expect(document.querySelector('a[download]')).toBeNull();
  expect(screen.queryByText(/chrome:\/\/extensions/)).not.toBeInTheDocument();
  expect(
    screen
      .getByRole('navigation', { name: 'Ajuda pública' })
      .querySelector('[aria-current="page"]'),
  ).toHaveTextContent('Extensão');
  await user.click(screen.getByRole('link', { name: 'Como enviar Prints' }));
  expect(router.state.location.search).toBe('?casa=7&apagadas=1&guia=prints');
  expect(screen.getByRole('region', { name: 'Prints' })).toHaveFocus();
});
