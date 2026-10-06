import { expect, it } from 'vitest';
import { dataCivil, moeda } from './format';
it.each([
  [0, 'R$ 0,00'],
  [1, '+R$ 0,01'],
  [-1, '−R$ 0,01'],
  [123456, '+R$ 1.234,56'],
  [Number.MAX_SAFE_INTEGER, '+R$ 90.071.992.547.409,91'],
])('formata exatamente %s centavos', (valor, esperado) =>
  expect(moeda(valor as number, true)).toBe(esperado),
);
it('rejeita centavos imprecisos e preserva data civil', () => {
  expect(() => moeda(0.1)).toThrow();
  expect(() => moeda(Number.MAX_SAFE_INTEGER + 1)).toThrow();
  expect(dataCivil('2026-01-01')).toBe('01/01/2026');
});
