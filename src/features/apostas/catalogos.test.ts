import { expect, it } from 'vitest';
import { FILTER_READ_CONTRACT } from '../../../tests/fixtures/apostas-contract.generated';
import { opcoesApresentacao } from './catalogos';

it('catálogo publicado conserva BIGINT, nomes históricos e paginação sem inferir autorização', () => {
  const response = {
    dimensao: 'casas',
    data: [
      { id: '9007199254740993', nome: 'Casa antiga', ativa: false },
      { id: '7', nome: 'Casa atual', ativa: true },
    ],
    pagination: { page: 1, page_size: 2, total: 3 },
  };
  expect(opcoesApresentacao(response, FILTER_READ_CONTRACT, 'casas')).toEqual({
    options: [
      { value: '9007199254740993', label: 'Casa antiga (inativa)' },
      { value: '7', label: 'Casa atual' },
    ],
    pagina: 1,
    temMais: true,
  });
  for (const change of [
    { dimensao: 'tipsters' },
    { data: null },
    { data: [{ id: 9007199254740992, nome: 'Casa', ativa: true }] },
    { pagination: { page: 0, page_size: 2, total: 3 } },
    { pagination: { page: 1, page_size: 0, total: 3 } },
    { pagination: { page: 1, page_size: 2, total: -1 } },
  ])
    expect(() =>
      opcoesApresentacao(
        { ...response, ...change },
        FILTER_READ_CONTRACT,
        'casas',
      ),
    ).toThrow();
  expect(() => opcoesApresentacao(response, {}, 'casas')).toThrow();
});
