import { expect, it } from 'vitest';
import {
  caixaSaldo,
  caixaFixture,
  caixaExtrato,
  caixaMatriz,
  caixaMovimentos,
} from '../../../tests/fixtures/caixa';
import {
  lerCaixa,
  pedido,
  validar,
  validarRecibo,
  validarSaldo,
  instanteDaEntrada,
  rotuloConta,
} from './protocol';
import { centavosComSinalDaEntrada } from '../../lib/format';
const input = {
  tipo: 'DEPOSITO' as const,
  valor: '10,00',
  origem: '11',
  destino: '12',
  instante: '13/10/2026 14:30-03:00',
  descricao: 'Entrada',
};
it('valida saldo desconhecido sem inventar zero e recusa inteiros imprecisos', () => {
  expect(validarSaldo(caixaSaldo).saldo_total_centavos).toBeNull();
  expect(() =>
    validarSaldo({
      ...caixaSaldo,
      contas: [{ ...caixaSaldo.contas[0]!, saldo_atual_centavos: null }],
    }),
  ).toThrow();
  expect(() =>
    validarSaldo({
      ...caixaSaldo,
      saldo_conhecido_centavos: Number.MAX_SAFE_INTEGER + 1,
    }),
  ).toThrow();
  expect(() => validarSaldo(undefined)).toThrow();
});
it('valida a união do extrato e recusa origem/campo inválidos', () => {
  expect(validar(caixaExtrato, '/api/v1/caixa/extrato')).toEqual(caixaExtrato);
  expect(() =>
    validar(
      { ...caixaExtrato, data: [{ ...caixaExtrato.data[0], origem: 'outra' }] },
      '/api/v1/caixa/extrato',
    ),
  ).toThrow();
  expect(() =>
    validar(
      { ...caixaExtrato, data: [{ origem: 'aposta' }] },
      '/api/v1/caixa/extrato',
    ),
  ).toThrow();
  expect(validar(caixaMovimentos, '/api/v1/caixa')).toEqual(caixaMovimentos);
  expect(() => validar({}, 'não publicado')).toThrow();
});
it('converte entrada com sinal no formatador, sem calcular saldo', () => {
  expect(centavosComSinalDaEntrada('-1,25')).toBe(-125);
  expect(centavosComSinalDaEntrada('+1,25')).toBe(125);
  expect(centavosComSinalDaEntrada('1')).toBe(100);
  for (const value of ['--1', '+-1', '1.001', 'abc', '9007199254740991'])
    expect(() => centavosComSinalDaEntrada(value)).toThrow();
  expect(
    pedido({ ...input, tipo: 'AJUSTE', origem: 'global', valor: '-1,25' }),
  ).toMatchObject({ conta_casa_id: null, valor_centavos: -125 });
});
it('exige duas contas explícitas e mantém free-form como entrada, sem decidir finanças', () => {
  expect(pedido({ ...input, tipo: 'TRANSFERENCIA' })).toMatchObject({
    conta_casa_id: 11,
    conta_casa_destino_id: 12,
    valor_centavos: 1000,
  });
  expect(pedido({ ...input, descricao: ' ' })).toMatchObject({
    descricao: null,
    ocorrido_em: '2026-10-13T14:30:00-03:00',
  });
  for (const values of [
    { origem: '' },
    { tipo: 'TRANSFERENCIA' as const, destino: '11' },
    { tipo: 'TRANSFERENCIA' as const, destino: '' },
    { valor: '0' },
    { tipo: 'SAQUE' as const, valor: '-1' },
  ])
    expect(() => pedido({ ...input, ...values })).toThrow();
});
it('valida datas civis, hora e offset sem date nativo', () => {
  expect(instanteDaEntrada('13/10/2026 14:30:20Z')).toBe(
    '2026-10-13T14:30:20Z',
  );
  for (const value of [
    '2026-10-13',
    '31/02/2026 14:30Z',
    '13/10/2026 25:30Z',
    '13/10/2026 14:30+25:00',
  ])
    expect(() => instanteDaEntrada(value)).toThrow();
});
it('parâmetros inválidos usam defaults e dias incluem limite final exclusivo', () => {
  const view = lerCaixa(
    new URLSearchParams(
      'caixa=extrato&caixa_conta=11&caixa_titular=1&caixa_tipo=BONUS&caixa_desde=2026-10-10&caixa_ate=2026-10-12&data_corte=2026-10-11&caixa_pagina=2',
    ),
  );
  expect(view).toMatchObject({
    secao: 'extrato',
    tipo: 'BONUS',
    corte: '2026-10-11',
    page: 2,
    conta: 11,
    titular: 1,
  });
  expect(view.query).toMatchObject({
    desde: '2026-10-10T03:00:00.000Z',
    ate: '2026-10-13T03:00:00.000Z',
  });
  expect(
    lerCaixa(
      new URLSearchParams(
        'caixa=x&caixa_pagina=-1&caixa_conta=x&caixa_titular=9007199254740992&caixa_tipo=x&caixa_desde=x&data_corte=x',
      ),
    ),
  ).toMatchObject({
    secao: 'saldos',
    page: 1,
    conta: undefined,
    titular: undefined,
  });
  expect(
    lerCaixa(new URLSearchParams('caixa_desde=2026-10-13&caixa_ate=2026-10-12'))
      .desde,
  ).toBeUndefined();
  expect(
    lerCaixa(
      new URLSearchParams(
        'caixa_conta=11&caixa_conta=12&caixa_pagina=2&caixa_pagina=3',
      ),
    ).page,
  ).toBe(1);
});
it('recibo de transferência liga as duas pontas e falha de contrato fica incerta', () => {
  const f = caixaFixture(),
    body = pedido({ ...input, tipo: 'TRANSFERENCIA' });
  const r = f.handle(
    'POST',
    new URL('https://site.example.org/api/v1/caixa'),
    body,
    'id',
  ).data;
  const receipt = validarRecibo(r as Parameters<typeof validarRecibo>[0], body);
  expect(receipt.movimentos).toHaveLength(2);
  for (const broken of [
    { ...receipt, tipo: 'DEPOSITO' as const },
    { ...receipt, movimentos: [] },
    { ...receipt, transferencia_id: null },
    {
      ...receipt,
      movimentos: [receipt.movimentos[0]!, receipt.movimentos[0]!],
    },
    {
      ...receipt,
      movimentos: receipt.movimentos.map((m) => ({
        ...m,
        transferencia_id: null,
      })),
    },
  ])
    expect(() => validarRecibo(broken, body)).toThrow();
  const deposit = pedido(input),
    data = f.handle(
      'POST',
      new URL('https://site.example.org/api/v1/caixa'),
      deposit,
      'another',
    ).data as Parameters<typeof validarRecibo>[0];
  expect(validarRecibo(data, deposit).tipo).toBe('DEPOSITO');
  expect(() =>
    validarRecibo(
      {
        ...data!,
        movimentos: data!.movimentos.map((m) => ({ ...m, conta_casa_id: 12 })),
      },
      deposit,
    ),
  ).toThrow();
});
it('rótulos preservam conta sem titular e ausência de identificação', () => {
  expect(rotuloConta(caixaSaldo.contas[1]!, caixaMatriz)).toContain(
    'Sem titular',
  );
  expect(rotuloConta({ ...caixaSaldo.contas[1]!, apelido: '' })).toContain(
    'identificação pendente',
  );
});
