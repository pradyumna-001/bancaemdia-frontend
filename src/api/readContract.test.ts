import { expect, it } from 'vitest';
import { corresponde, objeto, respostaPublicada } from './readContract';
import { SITE_READ_CONTRACT } from './site-read.generated';
import { paginaExemplo } from '../../tests/fixtures/apostas';

it('valida a página e os contextos opcionais do documento real, incluindo IDs textuais exatos', () => {
  const page = paginaExemplo();
  expect(
    respostaPublicada(page, SITE_READ_CONTRACT['/api/v1/apostas'].response),
  ).toBe(page);
  for (const input of [
    undefined,
    null,
    [],
    { ...page, data: null },
    { ...page, pagination: { ...page.pagination, total: 1.2 } },
    { ...page, data: [{ ...page.data[0], conta_contexto: { id: 4 } }] },
  ])
    expect(() =>
      respostaPublicada(input, SITE_READ_CONTRACT['/api/v1/apostas'].response),
    ).toThrow();
  expect(() => respostaPublicada(page, undefined)).toThrow();
  expect(() => objeto([])).toThrow();
});
it('valida as restrições OpenAPI sem coerção, valores padrões ou formatos inventados', () => {
  expect(
    corresponde(null, { anyOf: [{ type: 'string' }, { type: 'null' }] }),
  ).toBe(true);
  expect(
    corresponde('x', {
      type: 'string',
      enum: ['x'],
      const: 'x',
      pattern: '^x$',
      minLength: 1,
      maxLength: 1,
    }),
  ).toBe(true);
  expect(corresponde('z', { enum: ['x'], type: 'string' })).toBe(false);
  expect(corresponde('y', { const: 'x', type: 'string' })).toBe(false);
  expect(corresponde('', { type: 'string', minLength: 1 })).toBe(false);
  expect(corresponde('long', { type: 'string', maxLength: 1 })).toBe(false);
  expect(corresponde('z', { type: 'string', pattern: '^x$' })).toBe(false);
  expect(corresponde(5, { type: 'string' })).toBe(false);
  expect(corresponde(2, { type: 'integer', minimum: 1, maximum: 3 })).toBe(
    true,
  );
  expect(corresponde(0, { type: 'integer', minimum: 1 })).toBe(false);
  expect(corresponde(4, { type: 'integer', maximum: 3 })).toBe(false);
  expect(corresponde(2.5, { type: 'number' })).toBe(true);
  expect(corresponde(NaN, { type: 'number' })).toBe(false);
  expect(corresponde('2', { type: 'number' })).toBe(false);
  expect(corresponde(2.5, { type: 'integer' })).toBe(false);
  expect(corresponde(true, { type: 'boolean' })).toBe(true);
  expect(corresponde('true', { type: 'boolean' })).toBe(false);
  expect(corresponde([], { type: 'array' })).toBe(false);
  expect(
    corresponde([true, false], { type: 'array', items: { type: 'boolean' } }),
  ).toBe(true);
  expect(corresponde({}, { type: 'object', required: ['x'] })).toBe(false);
  expect(corresponde({}, { type: 'object' })).toBe(true);
  expect(
    corresponde(
      { x: null },
      { type: 'object', properties: { x: { type: 'null' } } },
    ),
  ).toBe(true);
  expect(corresponde(null, { type: 'object' })).toBe(false);
  expect(corresponde({}, {})).toBe(false);
});
