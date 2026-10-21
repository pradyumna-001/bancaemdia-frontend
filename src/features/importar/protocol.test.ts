import { expect, it } from 'vitest';
import {
  sameSource,
  address,
  cell,
  pageNumber,
  validated,
  sameResource,
  SOURCE,
} from './protocol';

it('confere fonte sem inferir a partir do nome ou arquivo', () => {
  expect(sameSource({ source_id: 'x' }, 'x')).toEqual({ source_id: 'x' });
  expect(sameSource({ source_id: 'x' })).toEqual({ source_id: 'x' });
  expect(() => sameSource({ source_id: 'x' }, 'y')).toThrow();
});
import { source, sourceId } from '../../../tests/fixtures/planilha';
it.each([
  ['', 1],
  ['0', 1],
  ['-2', 1],
  ['nan', 1],
  ['999999999999999999999', 1],
  ['3', 3],
  [null, 1],
])('normaliza página %s', (input, result) =>
  expect(pageNumber(input)).toBe(result),
);
it.each([
  [null, '—'],
  [undefined, '—'],
  [true, 'Sim'],
  [false, 'Não'],
  [2, '2'],
  ['x', 'x'],
  [{}, 'Valor incompatível'],
])('célula não calcula e não expõe objetos', (input, result) =>
  expect(cell(input)).toBe(result),
);
it('valida contrato gerado e identidade sem shape manual', () => {
  expect(validated(source(), `GET ${SOURCE}`)).toEqual(source());
  expect(sameResource(source(), sourceId).id).toBe(sourceId);
  expect(() => sameResource(source(), 'another')).toThrow();
  expect(() => validated({ id: sourceId }, `GET ${SOURCE}`)).toThrow();
  expect(() => validated(source(), 'not-an-operation')).toThrow();
});
it('recupera UUIDs ou cai para endereço seguro sem reenviar', () => {
  expect(
    address(
      new URLSearchParams(`fonte=${sourceId}&fontes_pagina=2&linhas_pagina=4`),
    ),
  ).toMatchObject({
    source: sourceId,
    invalid: false,
    sourcePage: 2,
    rowPage: 4,
  });
  expect(
    address(new URLSearchParams('fonte=x&previa=y&confirmacao=z')),
  ).toMatchObject({ source: undefined, invalid: true });
  expect(
    address(new URLSearchParams(`fonte=${sourceId}&fonte=${sourceId}`)).invalid,
  ).toBe(true);
  expect(address(new URLSearchParams()).invalid).toBe(false);
});
