import { expect, it } from 'vitest';
import { diaCivil, diaValido, deslocarDia, inicioDia } from './datasFiltro';
it.each([
  '2026-02-30',
  '2025-02-29',
  '0000-01-01',
  '2026-13-01',
  '01/01/2026',
  '2026-1-1',
  '2026-01-01T00:00Z',
])('recusa data civil inválida %s', (day) => {
  expect(diaValido(day)).toBe(false);
  expect(() => inicioDia(day)).toThrow('Data inválida.');
});
it.each(['0001-01-01', '2024-02-29', '2026-10-06', '9999-12-31'])(
  'preserva o dia real e encontra sua fronteira em %s',
  (day) => {
    expect(diaValido(day)).toBe(true);
    expect(diaCivil(new Date(inicioDia(day)))).toBe(day);
    expect(diaCivil(new Date(Date.parse(inicioDia(day)) - 1000))).not.toBe(day);
  },
);
it('usa São Paulo e respeita início de verão com meia-noite inexistente', () => {
  expect(diaCivil(new Date('2026-10-06T02:59:59Z'))).toBe('2026-10-05');
  expect(inicioDia('2026-10-06')).toBe('2026-10-06T03:00:00.000Z');
  expect(inicioDia('2018-11-04')).toBe('2018-11-04T03:00:00.000Z');
  expect(inicioDia('2018-11-05')).toBe('2018-11-05T02:00:00.000Z');
  expect(inicioDia('2019-02-16')).toBe('2019-02-16T02:00:00.000Z');
  expect(inicioDia('2019-02-17')).toBe('2019-02-17T03:00:00.000Z');
});
it('atalhos e fronteiras deslocam dias civis, inclusive bissexto e virada de ano', () => {
  expect(deslocarDia('2024-02-28', 1)).toBe('2024-02-29');
  expect(deslocarDia('2024-02-29', 1)).toBe('2024-03-01');
  expect(deslocarDia('2026-01-01', -1)).toBe('2025-12-31');
  expect(deslocarDia('9999-12-31', 1)).toBe('+010000-01-01');
});
