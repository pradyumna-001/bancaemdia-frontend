import {
  act,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from '@testing-library/react';
import {
  createMemoryRouter,
  RouterProvider,
  Link,
  useLocation,
} from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Filtros, useFiltros, type CatalogosFiltros } from './Filtros';
import { DataFiltro } from './DataFiltro';
import { EscolhaFiltro } from './EscolhaFiltro';
import { trocarPagina } from '../../lib/params';

const originalShow = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  'showModal',
);
const originalClose = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  'close',
);
beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    },
  });
});
afterEach(() => {
  for (const [name, original] of [
    ['showModal', originalShow],
    ['close', originalClose],
  ] as const) {
    if (original)
      Object.defineProperty(HTMLDialogElement.prototype, name, original);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, name);
  }
  vi.restoreAllMocks();
});
function mount(query = '', catalogos?: CatalogosFiltros) {
  function Page({ recurso }: { recurso: 'apostas' | 'painel' }) {
    const location = useLocation();
    const { visao, adapter } = useFiltros(recurso);
    return (
      <main>
        <Filtros recurso={recurso} catalogos={catalogos} />
        <output aria-label="Parâmetros">
          {JSON.stringify(adapter.apostas ?? adapter.painel ?? null)}
        </output>
        <Link
          to={{
            pathname: recurso === 'apostas' ? '/painel' : '/',
            search: location.search,
          }}
        >
          Outra área
        </Link>
        <Link
          to={{
            pathname: location.pathname,
            search: trocarPagina(
              new URLSearchParams(location.search),
              visao.page + 1,
            ).toString(),
          }}
        >
          Próxima página
        </Link>
      </main>
    );
  }
  const router = createMemoryRouter(
    [
      { path: '/', element: <Page recurso="apostas" /> },
      { path: '/painel', element: <Page recurso="painel" /> },
    ],
    { initialEntries: ['/?' + query] },
  );
  render(<RouterProvider router={router} />);
  return router;
}
it('URL é fonte dos controles, seleção reseta página, Back restaura e remoção é explícita', async () => {
  const router = mount('estado=GREEN&page=4&page_size=25&grupo=8', {
    casa: {
      fase: 'pronto',
      options: [{ value: '2', label: 'Casa autorizada' }],
    },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Estado Green' }));
  fireEvent.click(
    within(screen.getByRole('dialog', { name: 'Estado' })).getByRole('button', {
      name: 'Red',
    }),
  );
  await waitFor(() =>
    expect(router.state.location.search).toContain('estado=RED'),
  );
  expect(router.state.location.search).not.toContain('page=4');
  expect(router.state.location.search).toContain('page_size=25');
  expect(router.state.location.search).toContain('grupo=8');
  await act(() => router.navigate(-1));
  expect(screen.getByRole('button', { name: 'Estado Green' })).toBeVisible();
  fireEvent.click(
    screen.getByRole('button', { name: 'Remover filtro Estado' }),
  );
  await waitFor(() =>
    expect(router.state.location.search).not.toContain('estado'),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Casa Sem filtro' }));
  fireEvent.click(
    within(screen.getByRole('dialog', { name: 'Casa' })).getByRole('button', {
      name: 'Casa autorizada',
    }),
  );
  expect(
    screen.getByRole('button', { name: 'Remover filtro Casa' }),
  ).toHaveTextContent('Casa autorizada');
  fireEvent.click(screen.getByRole('link', { name: 'Outra área' }));
  await waitFor(() => expect(router.state.location.pathname).toBe('/painel'));
  expect(router.state.location.search).toContain('grupo=8');
  expect(screen.getByText(/Esta área não aplica: Grupo/)).toBeVisible();
  fireEvent.click(
    screen.getByRole('button', { name: 'Período Últimos 30 dias' }),
  );
  fireEvent.click(
    within(screen.getByRole('dialog', { name: 'Período' })).getByRole(
      'button',
      { name: 'Todo o período' },
    ),
  );
  expect(screen.getByLabelText('Parâmetros')).toHaveTextContent(
    '"periodo":"all"',
  );
});
it('apagadas e dimensões sem contrato permanecem salvas; padrão de paginação não esconde o bloqueio', async () => {
  const router = mount('apagadas=1&conta=8&page=NaN&page_size=999&extra=keep');
  expect(screen.getByRole('alert')).toHaveTextContent('somente apagadas');
  expect(screen.getByLabelText('Parâmetros')).toHaveTextContent('null');
  expect(
    screen.getByRole('button', { name: 'Remover filtro Conta' }),
  ).toHaveTextContent('nome indisponível');
  fireEvent.click(screen.getByRole('link', { name: 'Próxima página' }));
  await waitFor(() => expect(router.state.location.search).toContain('page=2'));
  expect(router.state.location.search).toContain('apagadas=1');
  expect(router.state.location.search).toContain('page_size=50');
  fireEvent.click(
    screen.getByRole('button', { name: 'Remover filtro Visibilidade' }),
  );
  expect(screen.queryByRole('alert')).toBeNull();
  expect(screen.getByLabelText('Parâmetros')).toHaveTextContent(
    '"incluir_apagadas":false',
  );
});
it('catálogos ausentes, carregando, vazios e recusados não inventam opções', () => {
  const retry = vi.fn();
  mount(
    'casa=88&estado=PENDENTE&origem=telegram&desde=2026-10-01&ate=2026-10-02&revisao=1&periodo=7d&apagadas=todas',
    {
      casa: {
        fase: 'carregando',
        options: [{ value: '88', label: 'não usar' }],
      },
      tipster: { fase: 'erro', options: [], tentar: retry },
      mercado: { fase: 'pronto', options: [] },
      origem: { fase: 'erro', options: [], tentar: retry },
    },
  );
  expect(
    screen.getByRole('button', { name: 'Casa Identificador 88' }),
  ).toBeDisabled();
  expect(screen.getByText('Carregando opções…')).toBeVisible();
  expect(
    screen.getByText('Nenhuma opção disponível para sua conta.'),
  ).toBeVisible();
  fireEvent.click(
    screen.getByRole('button', { name: 'Tentar carregar tipster' }),
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Tentar carregar origem' }),
  );
  expect(retry).toHaveBeenCalledTimes(2);
  for (const label of ['De', 'Até', 'Revisão grave', 'Origem', 'Período'])
    expect(
      screen.getByRole('button', { name: 'Remover filtro ' + label }),
    ).toBeVisible();
  expect(
    screen.getByRole('button', { name: 'Remover filtro Período' }),
  ).toHaveTextContent('preservado');
});
it('opções de origem vêm da consumidora, sem catálogo falso', () => {
  mount('', {
    origem: {
      fase: 'pronto',
      options: [{ value: 'telegram', label: 'Telegram' }],
    },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Origem Sem filtro' }));
  fireEvent.click(
    within(screen.getByRole('dialog', { name: 'Origem' })).getByRole('button', {
      name: 'Telegram',
    }),
  );
  expect(screen.getByLabelText('Parâmetros')).toHaveTextContent(
    '"origem":"telegram"',
  );
});
it('dialog de opções fecha sem alterar e restaurar padrão não promete todas', () => {
  const onChange = vi.fn();
  render(
    <EscolhaFiltro
      label="Teste"
      value="desconhecido"
      options={[]}
      onChange={onChange}
    />,
  );
  const button = screen.getByRole('button', {
    name: 'Teste Identificador desconhecido',
  });
  fireEvent.click(button);
  fireEvent.click(screen.getByRole('button', { name: 'Fechar opções' }));
  expect(onChange).not.toHaveBeenCalled();
  expect(button).toHaveFocus();
  fireEvent.click(button);
  fireEvent.click(screen.getByRole('button', { name: 'Sem filtro' }));
  expect(onChange).toHaveBeenCalledWith(undefined);
});
it('calendário próprio navega por teclado, troca mês e devolve dia civil', async () => {
  const onChange = vi.fn();
  render(<DataFiltro label="Data" value="2026-10-06" onChange={onChange} />);
  const trigger = screen.getByRole('button', {
    name: 'Data 6 de outubro de 2026',
  });
  fireEvent.click(trigger);
  const day = screen.getByRole('button', {
    name: 'Selecionar 6 de outubro de 2026',
  });
  await waitFor(() => expect(day).toHaveFocus());
  for (const [key, date] of [
    ['ArrowRight', '7'],
    ['ArrowLeft', '5'],
    ['ArrowUp', '29 de setembro'],
    ['ArrowDown', '13'],
    ['Home', '4'],
    ['End', '10'],
  ] as const) {
    fireEvent.keyDown(day, { key });
    expect(
      screen.getByRole('button', {
        name: new RegExp('Selecionar ' + date + '( de outubro| de 2026)'),
      }),
    ).toHaveAttribute('tabindex', '0');
  }
  fireEvent.keyDown(
    screen.getByRole('button', { name: 'Selecionar 10 de outubro de 2026' }),
    { key: 'PageUp' },
  );
  expect(screen.getByText('setembro de 2026')).toBeVisible();
  fireEvent.keyDown(
    screen.getByRole('button', { name: 'Selecionar 1 de setembro de 2026' }),
    { key: 'PageDown' },
  );
  expect(screen.getByText('outubro de 2026')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Mês anterior' }));
  fireEvent.click(screen.getByRole('button', { name: 'Próximo mês' }));
  fireEvent.keyDown(
    screen.getByRole('button', { name: 'Selecionar 1 de outubro de 2026' }),
    { key: 'Tab' },
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Selecionar 6 de outubro de 2026' }),
  );
  expect(onChange).toHaveBeenCalledWith('2026-10-06');
  expect(trigger).toHaveFocus();
});
it('atalhos, remover e Escape não criam input date nativo nem alteram ao fechar', () => {
  const change = vi.fn();
  const { container } = render(<DataFiltro label="Dia" onChange={change} />);
  const open = () =>
    fireEvent.click(screen.getByRole('button', { name: 'Dia Sem limite' }));
  open();
  fireEvent.click(screen.getByRole('button', { name: 'Hoje' }));
  expect(change).toHaveBeenCalledWith(
    expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
  );
  open();
  fireEvent.click(screen.getByRole('button', { name: 'Ontem' }));
  open();
  fireEvent.click(screen.getByRole('button', { name: 'Remover limite' }));
  expect(change).toHaveBeenLastCalledWith(undefined);
  open();
  fireEvent.click(screen.getByRole('button', { name: 'Fechar calendário' }));
  expect(change).toHaveBeenCalledTimes(3);
  expect(container.querySelector('input[type=date],select')).toBeNull();
});
