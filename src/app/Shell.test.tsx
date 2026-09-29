import { act, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter } from 'react-router-dom';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { App } from './App';
import { createAppRoutes } from './routes';
import { createAppQueryClient } from './queryClient';
import { ABAS, abaAtual } from './nav';
import { Icone, NOMES_ICONES, type NomeIcone } from '../components/Icone';
import {
  CHAVE_REVISAO,
  validarTotalRevisao,
  mensagemFalhaRevisao,
  type EstatisticasRevisao,
} from '../features/revisao/estatisticas';

const limpar: Array<() => void> = [];
it.each([
  [429, 'Muitas consultas'],
  [503, 'temporariamente indisponível'],
  [500, 'Não foi possível atualizar'],
] as const)('erro %s tem orientação segura', (status, texto) => {
  expect(mensagemFalhaRevisao({ status, message: 'segredo' })).toContain(texto);
  expect(mensagemFalhaRevisao({ status, message: 'segredo' })).not.toContain(
    'segredo',
  );
});
afterEach(() => limpar.splice(0).forEach((fn) => fn()));
function dados(total: number): EstatisticasRevisao {
  return {
    total,
    por_motivo: {},
    mais_antiga_em: null,
    idade_maxima_segundos: 0,
  };
}
function abrir(total: number, sessao = true) {
  const consultar = vi.fn(async () => dados(total));
  const client = createAppQueryClient();
  const router = createMemoryRouter(
    createAppRoutes(() => sessao, consultar),
    { initialEntries: ['/?apagadas=1'] },
  );
  limpar.push(() => {
    router.dispose();
    client.clear();
  });
  render(<App router={router} queryClient={client} />);
  return { client, consultar };
}

it('catálogo canônico mantém rotas e ícones registrados', () => {
  expect(ABAS.map((a) => [a.path, a.title, a.icone])).toMatchInlineSnapshot(`
    [
      [
        "/",
        "Apostas",
        "apostas",
      ],
      [
        "/painel",
        "Painel",
        "painel",
      ],
      [
        "/enviar",
        "Enviar",
        "enviar",
      ],
      [
        "/coleta",
        "Coleta",
        "coleta",
      ],
      [
        "/banca",
        "Caixa",
        "caixa",
      ],
      [
        "/resultados",
        "Resultados",
        "resultados",
      ],
      [
        "/revisao",
        "Revisão",
        "revisao",
      ],
    ]
  `);
  for (const aba of ABAS) expect(NOMES_ICONES).toContain(aba.icone);
  expect(() =>
    renderToStaticMarkup(<Icone nome={'ausente' as NomeIcone} />),
  ).toThrow('Ícone não registrado');
  expect(abaAtual('/', '/aposta/abc')).toBe(true);
  expect(abaAtual('/', '/painel')).toBe(false);
});

it('contador atualizado pelo cache aparece e desaparece nas duas navegações', async () => {
  const { client } = abrir(12);
  await screen.findByRole('heading', { name: 'Apostas' });
  const desktop = screen.getByRole('navigation', {
    name: 'Navegação principal',
  });
  const mobile = screen.getByRole('navigation', {
    name: 'Navegação principal no celular',
  });
  await within(desktop).findByRole('link', { name: /Revisão.*12 pendências/ });
  expect(within(desktop).getAllByRole('link')).toHaveLength(ABAS.length);
  expect(within(mobile).getAllByRole('link')).toHaveLength(
    ABAS.filter((a) => a.mobile).length,
  );
  act(() => client.setQueryData(CHAVE_REVISAO, dados(0)));
  await waitFor(() =>
    expect(
      within(desktop).queryByRole('link', { name: /Revisão/ }),
    ).not.toBeInTheDocument(),
  );
  expect(
    within(mobile).queryByRole('link', { name: /Revisão/ }),
  ).not.toBeInTheDocument();
  act(() => client.setQueryData(CHAVE_REVISAO, dados(120)));
  await within(desktop).findByRole('link', { name: /Revisão.*120 pendências/ });
  expect(within(desktop).getByText('99+')).toBeVisible();
});

it('não consulta fila nem mostra shell sem sessão', async () => {
  const { consultar } = abrir(12, false);
  await screen.findByRole('heading', { name: 'Entrar' });
  expect(consultar).not.toHaveBeenCalled();
  expect(
    screen.queryByRole('navigation', {
      name: 'Navegação principal',
    }),
  ).not.toBeInTheDocument();
});

it.each([-1, 1.5, NaN, Infinity])('rejeita contador inválido %s', (total) => {
  expect(() => validarTotalRevisao(dados(total))).toThrow();
});
