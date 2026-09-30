import { expect, it } from 'vitest';
import { paginacaoConsulta } from './query';
it.each([
  'page=0',
  'page=-1',
  'page=1.5',
  'page=Infinity',
  'page=9007199254740992',
  'page=2&page=3',
  'page=',
  'page_size=101',
  'page_size=0',
  'page_size=-5',
  'page=NaN',
  '',
])('normaliza paginação inválida %s sem mudar filtros na URL', (query) => {
  const search = new URLSearchParams(query + '&estado=PENDENTE&apagadas=1');
  const before = search.toString();
  expect(paginacaoConsulta('GET /api/v1/apostas', search)).toEqual({
    page: 1,
    page_size: 50,
  });
  expect(search.toString()).toBe(before);
});
it('preserva valores válidos inclusive limites por recurso', () => {
  expect(
    paginacaoConsulta(
      'GET /api/v1/apostas',
      new URLSearchParams('page=2&page_size=100'),
    ),
  ).toEqual({ page: 2, page_size: 100 });
  expect(
    paginacaoConsulta(
      'GET /api/v1/caixa',
      new URLSearchParams('page=9007199254740991&page_size=1'),
    ).page,
  ).toBe(Number.MAX_SAFE_INTEGER);
});
