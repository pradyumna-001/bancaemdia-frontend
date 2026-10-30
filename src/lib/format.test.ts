import { expect, it } from 'vitest';
import {
  dataCivil,
  dataHora,
  decimal,
  moeda,
  moedaEixo,
  moedaMenor,
  odd,
  porcentagem,
  porcentagemPontosBase,
  precoAssinatura,
} from './format';
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

it.each([
  ['9223372036854775807', 'R$ 92.233.720.368.547.758,07'],
  [-9223372036854775808n, '−R$ 92.233.720.368.547.758,08'],
  [null, 'Não informado'],
  [-0, 'R$ 0,00'],
  ['0', 'R$ 0,00'],
])('preserva inteiro exato/ausência %s', (valor, esperado) => {
  expect(moeda(valor)).toBe(esperado);
});
it.each([
  '',
  '1.00',
  '01',
  '+1',
  '1e2',
  ' 1',
  'NaN',
  '1'.repeat(130),
  NaN,
  Infinity,
])('recusa inteiro malformado %s', (valor) =>
  expect(() => moeda(valor)).toThrow('Valor indisponível.'),
);
it('recusa BigInt excessivo e números JSON inseguros sem tentar recuperar', () => {
  expect(() => moeda(BigInt('1'.repeat(130)))).toThrow();
  expect(() => moeda(Number.MAX_SAFE_INTEGER + 1)).toThrow();
});
it.each([
  [123456, 'USD', 'USD 1.234,56'],
  [1234, 'JPY', 'JPY 1.234'],
  [12345, 'KWD', 'KWD 12,345'],
  [-100n, 'BRL', '−R$ 1,00'],
])('usa a unidade menor de %s %s', (valor, currency, esperado) => {
  expect(moedaMenor(valor, currency)).toBe(esperado);
});
it('aceita escala explícita e sinal; recusa moeda/escala não publicadas', () => {
  expect(moedaMenor(100, 'JPY', true, 2)).toBe('+JPY 1,00');
  for (const currency of ['ABC', 'brl', '', '<script>'])
    expect(() => moedaMenor(100, currency)).toThrow('Valor indisponível.');
  for (const casas of [-1, 5, 1.2, NaN])
    expect(() => moedaMenor(100, 'BRL', false, casas)).toThrow();
});
it.each([
  [9900, 'BRL', 'MONTHLY', 'R$ 99,00 por mês'],
  [99000, 'USD', 'YEARLY', 'USD 990,00 por ano'],
  [500, 'JPY', 'MONTHLY', 'JPY 500 por mês'],
  [500, 'ISK', 'MONTHLY', 'ISK 5,00 por mês'],
  [500, 'UGX', 'MONTHLY', 'UGX 5,00 por mês'],
  [500, 'MGA', 'MONTHLY', 'MGA 500 por mês'],
  [null, 'BRL', 'MONTHLY', 'Preço não informado'],
  [100, null, 'MONTHLY', 'Preço não informado'],
  [100, 'BRL', 'WEEKLY', 'Preço não informado'],
  [100, 'BRL', null, 'Preço não informado'],
])(
  'apresenta preço/cadência recebidos %s %s %s',
  (valor, currency, cadence, esperado) => {
    expect(precoAssinatura(valor, currency, cadence)).toBe(esperado);
  },
);
it.each([
  ['9007199254740993.123456789', '9.007.199.254.740.993,123456789'],
  ['-0.000001', '−0,000001'],
  ['1.2300', '1,2300'],
  ['1e-7', '0,0000001'],
  ['1.23e3', '1.230'],
  ['1.23e1', '12,3'],
  ['+0', '0'],
  ['-0.00', '0,00'],
  [0.5, '0,5'],
  [null, 'Não informado'],
])('não arredonda decimal recebido %s', (valor, esperado) => {
  expect(decimal(valor)).toBe(esperado);
});
it.each([
  '',
  '1,5',
  ' 1.5',
  '<script>',
  'Infinity',
  '1e129',
  '1e-129',
  '1'.repeat(257),
  Infinity,
  NaN,
  Number.MAX_SAFE_INTEGER + 1,
])('recusa decimal sem precisão/gramática %s', (valor) =>
  expect(() => decimal(valor)).toThrow(),
);
it('recusa tipo inválido em runtime e não reinterpreta odd como porcentagem', () => {
  expect(() => decimal({} as string)).toThrow();
  expect(odd('2.10')).toBe('2,10');
  expect(odd(2)).toBe('2,00');
  expect(odd('2.123456')).toBe('2,123456');
  expect(odd(null)).toBe('Não informado');
  expect(porcentagem('0.125')).toBe('12,5%');
  expect(porcentagem('-0.0001', true)).toBe('−0,01%');
  expect(porcentagem('0.12', true)).toBe('+12%');
  expect(porcentagem('0', true)).toBe('0%');
  expect(porcentagem(null)).toBe('Não informado');
  expect(porcentagemPontosBase(1250, true)).toBe('+12,50%');
  expect(porcentagemPontosBase(-1)).toBe('−0,01%');
  expect(porcentagemPontosBase(0)).toBe('0,00%');
  expect(porcentagemPontosBase(null)).toBe('Não informado');
});
it('exibe data civil sem fuso e aceita ano inicial/bissexto', () => {
  expect(dataCivil('0001-01-01')).toBe('01/01/0001');
  expect(dataCivil('2024-02-29')).toBe('29/02/2024');
  expect(dataCivil(null)).toBe('Não informado');
});
it.each([
  '',
  '2026-02-29',
  '2024-02-30',
  '2026-13-01',
  '2026-01-32',
  '2026-01-01T00:00:00Z',
  '0000-01-01',
  'não é data',
])('recusa data civil %s', (data) => {
  expect(() => dataCivil(data)).toThrow('Data indisponível.');
});
it('preserva instante, explicita fuso e atravessa o dia sem mudar data civil', () => {
  expect(dataHora('2026-10-06T01:30:00Z', 'America/Sao_Paulo')).toBe(
    '05/10/2026, 22:30 (America/Sao_Paulo)',
  );
  expect(dataHora('2026-10-05T22:30:00-03:00', 'UTC')).toBe(
    '06/10/2026, 01:30 (UTC)',
  );
  expect(dataHora('2026-10-06T00:00:00.123456Z', 'UTC')).toBe(
    '06/10/2026, 00:00 (UTC)',
  );
  expect(dataHora(null, 'UTC')).toBe('Não informado');
});
it.each([
  '2026-10-06',
  '2026-10-06T12:00:00',
  '2026-02-30T12:00:00Z',
  '2026-10-06T24:00:00Z',
  '2026-10-06T12:00:00+23:99',
])('recusa instante %s', (data) => {
  expect(() => dataHora(data, 'UTC')).toThrow('Data indisponível.');
});
it('não assume fuso do browser nem expõe fuso inválido', () => {
  for (const fuso of ['', '<script>', 'Fuso privado inválido'])
    expect(() => dataHora('2026-10-06T12:00:00Z', fuso)).toThrow(
      'Data indisponível.',
    );
});
it('mantém compactação de eixo separada dos valores exatos', () => {
  expect(moedaEixo(12345)).toContain('123,45');
  expect(moedaEixo(1234500)).toContain('mil');
  expect(() => moedaEixo(0.5)).toThrow();
});
