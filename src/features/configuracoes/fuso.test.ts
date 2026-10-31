import { expect, it, vi } from 'vitest';
import {
  fusoValido,
  fusosDisponiveis,
  nomeFuso,
  preferenciaFuso,
} from './fuso';
import { ApiError } from '../../api/error';

it('aceita fuso IANA e aliases existentes; rejeita respostas ausentes ou inválidas', () => {
  for (const value of [
    undefined,
    null,
    0,
    '',
    'x'.repeat(65),
    'America/Inventada',
  ])
    expect(fusoValido(value)).toBe(false);
  expect(fusoValido('America/Sao_Paulo')).toBe(true);
  expect(preferenciaFuso({ fuso_horario: 'UTC' })).toEqual({
    fuso_horario: 'UTC',
  });
  for (const value of [null, false, {}, { fuso_horario: 'America/Inventada' }])
    expect(() => preferenciaFuso(value)).toThrow(ApiError);
  try {
    preferenciaFuso({}, true);
  } catch (error) {
    expect(error).toMatchObject({ outcomeUnknown: true });
  }
  expect(nomeFuso('America/Sao_Paulo')).toBe('America / Sao Paulo');
  expect(nomeFuso('UTC')).toBe('UTC');
});

it('preserva o fuso atual mesmo se for um alias fora do catálogo do navegador', () => {
  const catalogue = vi
    .spyOn(Intl, 'supportedValuesOf')
    .mockReturnValue(['America/Manaus']);
  expect(fusosDisponiveis('Brazil/East')).toEqual([
    'America/Manaus',
    'Brazil/East',
    'UTC',
  ]);
  catalogue.mockImplementation(() => {
    throw new Error('Catálogo indisponível');
  });
  expect(fusosDisponiveis('UTC')).toContain('America/Sao_Paulo');
  catalogue.mockRestore();
  const original = Intl.supportedValuesOf;
  Object.defineProperty(Intl, 'supportedValuesOf', {
    value: undefined,
    configurable: true,
  });
  expect(fusosDisponiveis('UTC')).toContain('America/Rio_Branco');
  Object.defineProperty(Intl, 'supportedValuesOf', {
    value: original,
    configurable: true,
  });
});
