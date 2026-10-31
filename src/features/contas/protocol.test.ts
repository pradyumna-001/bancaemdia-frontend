import { expect, it } from 'vitest';
import { conta, financeiro } from '../../../tests/fixtures/contas';
import {
  identificador,
  horario,
  contaValidada,
  financeiroValidado,
  metricas,
  validar,
} from './protocol';
it('rejects missing/unsafe identifiers without coercion', () => {
  for (const value of [
    undefined,
    '',
    '0',
    '-1',
    '1.2',
    '01',
    'a',
    '9007199254740992',
  ])
    expect(identificador(value)).toBeUndefined();
  expect(identificador('7')).toBe(7);
});
it('validates generated receipts, timestamps and exact money before rendering', () => {
  expect(() => validar({}, 'absent')).toThrow();
  expect(() => validar(undefined, '/api/v1/titulares')).toThrow();
  expect(horario(null)).toBe('Não informado');
  expect(() => contaValidada({ ...conta, conta_casa_id: 0 })).toThrow();
  expect(() => contaValidada({ ...conta, casa_id: 0 })).toThrow();
  expect(() =>
    contaValidada({
      ...conta,
      historico_uso: [
        { vigente_de: 'invalid', vigente_ate: null, origem: 'LEGADO' },
      ],
    }),
  ).toThrow();
  expect(
    contaValidada({
      ...conta,
      intervalo_ativo: {
        vigente_de: null,
        vigente_ate: null,
        origem: 'LEGADO',
      },
    }),
  ).toBeTruthy();
  expect(() =>
    financeiroValidado({
      ...financeiro,
      total: { lucro_centavos: 'impreciso' },
    }),
  ).toThrow();
  expect(metricas({}).every((m) => m.value === 'Não informado')).toBe(true);
  expect(financeiroValidado(financeiro)).toBe(financeiro);
});
