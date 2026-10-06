import { expect, it } from 'vitest';
import { rotuloEstado, TERMOS } from './termos';

it('mantém os conceitos financeiros distintos e o vocabulário do dono', () => {
  expect([
    TERMOS.face,
    TERMOS.custo,
    TERMOS.retorno,
    TERMOS.lucro,
    TERMOS.saldo,
  ]).toEqual(['Valor de face', 'Custo próprio', 'Retorno', 'Lucro', 'Saldo']);
  expect([
    TERMOS.titular,
    TERMOS.conta,
    TERMOS.banca,
    TERMOS.assinatura,
  ]).toEqual(['Titular', 'Conta', 'Banca', 'Assinatura']);
  expect(TERMOS.painel).toBe('Painel');
});
it.each([
  ['PENDENTE', 'Pendente'],
  ['GREEN', 'Green'],
  ['RED', 'Red'],
  ['ANULADA', 'Anulada'],
  ['CASHOUT', 'Cashout'],
  ['MEIO_GREEN', 'Meio green'],
  ['MEIO_RED', 'Meio red'],
])('preserva o estado %s', (estado, label) => {
  expect(rotuloEstado(estado)).toBe(label);
});
it.each([null, '', 'GREEN_PRIVADO', 'green', 'toString', '__proto__'])(
  'estado desconhecido %s não vira pendente nem corpo cru',
  (estado) => {
    expect(rotuloEstado(estado)).toBe('Estado desconhecido');
  },
);
