// @vitest-environment node
import { expect, it } from 'vitest';
import { violations } from '../../scripts/check-formatters.mjs';

it.each([
  'new Intl.NumberFormat("pt-BR").format(valor)',
  'Intl.DateTimeFormat("pt-BR").format(data)',
  'const reais = resposta.saldo_centavos / 100;',
  'const lucro = aposta.retorno_centavos - aposta.stake_centavos;',
  'const total = dados.reduce((n, dado) => n + dado.lucro_centavos, 0);',
])('barra apresentação/cálculo local %s', (source) => {
  expect(
    violations(source, 'src/features/apostas/Page.tsx').length,
  ).toBeGreaterThan(0);
});
it('permite o formatador, geometria e decisões de apresentação sem calcular resultados', () => {
  expect(
    violations('const reais = saldo_centavos / 100;', 'src/lib/format.ts'),
  ).toEqual([]);
  expect(
    violations(
      'const largura = lucro_centavos / escala;',
      'src/components/graficos/geometria.ts',
    ),
  ).toEqual([]);
  expect(
    violations(
      'const negativo = item.lucro_centavos < 0; moeda(item.lucro_centavos);',
      'src/components/graficos/BarrasLucro.tsx',
    ),
  ).toEqual([]);
  expect(
    violations(
      'const x = indice * 10; const texto = "Intl.NumberFormat";',
      'src/features/apostas/Page.tsx',
    ),
  ).toEqual([]);
});
