import { Suspense } from 'react';
import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { paginaCarregavel } from './paginaCarregavel';

const modulo = () => ({
  Pagina: ({ nome }: { nome: string }) => <h1>Página {nome}</h1>,
});

it('renderiza no mesmo passo quando o módulo já chegou', async () => {
  const importar = vi.fn(async () => modulo());
  const Pagina = paginaCarregavel(importar, (m) => m.Pagina);
  Pagina.carregar();
  Pagina.carregar();
  await Promise.resolve();
  await Promise.resolve();
  render(
    <Suspense fallback={<p>Abrindo página…</p>}>
      <Pagina nome="pronta" />
    </Suspense>,
  );
  expect(screen.getByRole('heading', { name: 'Página pronta' })).toBeVisible();
  expect(screen.queryByText('Abrindo página…')).toBeNull();
  expect(importar).toHaveBeenCalledTimes(1);
});

it('sem pré-carga mantém o fallback e falha de download fica com a fronteira', async () => {
  const Pagina = paginaCarregavel(
    async () => modulo(),
    (m) => m.Pagina,
  );
  render(
    <Suspense fallback={<p>Abrindo página…</p>}>
      <Pagina nome="tardia" />
    </Suspense>,
  );
  expect(screen.getByText('Abrindo página…')).toBeVisible();
  expect(
    await screen.findByRole('heading', { name: 'Página tardia' }),
  ).toBeVisible();
  const Falha = paginaCarregavel(
    () => Promise.reject(new Error('rede')),
    (m: ReturnType<typeof modulo>) => m.Pagina,
  );
  // The preload swallows the rejection; React.lazy still reports it on render.
  expect(() => Falha.carregar()).not.toThrow();
});

it('rota protegida só antecipa a leitura depois da sessão confirmada', async () => {
  const { createAppRoutes } = await import('./routes');
  for (const [sessao, chamadas] of [
    [true, 1],
    [false, 0],
  ] as const) {
    const antecipar = vi.fn();
    const route = createAppRoutes(
      () => sessao,
      undefined,
      false,
      antecipar,
    ).find((r) => r.path === '/resultados')!;
    const loader = route.loader as (args: { request: Request }) => unknown;
    expect(
      await loader({
        request: new Request('http://127.0.0.1/resultados?casa=7'),
      }),
    ).toBe(sessao);
    expect(antecipar).toHaveBeenCalledTimes(chamadas);
    if (chamadas)
      expect(antecipar).toHaveBeenCalledWith(
        '/resultados',
        new URLSearchParams('casa=7'),
      );
  }
});
