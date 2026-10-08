import { expect, it } from 'vitest';
import golden from '../../../tests/fixtures/calculadoras-golden.json';
import {
  decimalInput,
  moneyInput,
  presentCalculation,
  toolFromUrl,
  TOOLS,
  type Tool,
  type Calculation,
} from './protocol';
import { centavosDaEntrada, moedaCentavosDecimais } from '../../lib/format';

it('oferece exatamente quatro ferramentas e defaults seguros', () => {
  expect(Object.keys(TOOLS)).toHaveLength(4);
  for (const value of [null, 'linhas', '__proto__', 'NaN'])
    expect(toolFromUrl(value)).toBe('mercado-justo');
  for (const value of Object.keys(TOOLS))
    expect(toolFromUrl(value)).toBe(value);
});
it.each(golden.cases)(
  'apresenta o vetor real $name sem cálculo no cliente',
  ({ tool, response }) => {
    const view = presentCalculation(tool as Tool, response as Calculation);
    expect(view.metrics.length).toBeGreaterThan(0);
    expect(view.method).not.toContain('_');
    expect(JSON.stringify(view)).not.toContain('NaN');
    if (tool === 'mercado-justo')
      expect(view.rows.length).toBe(response.data.outcomes?.length);
  },
);
it('preserva probabilidade, zero, negativos e frações em centavos publicados', () => {
  const fair = presentCalculation(
    'mercado-justo',
    golden.cases[1]!.response as Calculation,
  );
  expect(fair.rows[0]![3]).toBe('33,333334%');
  const loss = presentCalculation(
    'distribuir-entre-resultados',
    golden.cases[3]!.response as Calculation,
  );
  expect(loss.rows[0]![4]).toBe('−R$ 5,00');
  expect(loss.warnings).toContain(
    'Pelo menos um cenário após o arredondamento não apresenta lucro.',
  );
  expect(moedaCentavosDecimais('123.456789')).toBe('R$ 1,23456789');
  expect(moedaCentavosDecimais('-0.5', true)).toBe('R$ −0,005');
  expect(moneyInput('0', true)).toBe(0);
});
it('converte somente representação de entrada, sem float ou milhares', () => {
  expect(decimalInput(' 2,00000001 ')).toBe('2.00000001');
  expect(moneyInput('123,45')).toBe(12345);
  expect(centavosDaEntrada('10000000000,00')).toBe(1000000000000);
  for (const value of [
    'NaN',
    '1e10',
    'Infinity',
    '1.000,00',
    '1.23',
    '01',
    '-1',
    '1,234',
  ])
    expect(() => moneyInput(value)).toThrow();
  expect(() => moneyInput('0')).toThrow('maior que zero');
  expect(() => centavosDaEntrada('10000000000,01')).toThrow('limite');
  for (const value of ['', '-1', '1e9', '0.000000001', '0002', '1,2,3'])
    expect(() => decimalInput(value)).toThrow();
});
it.each([
  { method: 'unknown' },
  { precision: 'float' },
  { rounding: 'unknown' },
  { assumptions: ['Unknown premise'] },
  { warnings: ['unknown warning'] },
  { data: null },
  { data: [] },
  { assumptions: null },
  { data: { ...golden.cases[0]!.response.data, outcomes: [] } },
  { data: { ...golden.cases[0]!.response.data, outcomes: [null, null] } },
  {
    data: {
      ...golden.cases[0]!.response.data,
      outcomes: [{ name: 'A', odd: 'NaN' }, {}],
    },
  },
])(
  'recusa resposta incompatível ou incompleta sem inventar valor (%j)',
  (patch) => {
    expect(() =>
      presentCalculation('mercado-justo', {
        ...golden.cases[0]!.response,
        ...patch,
      } as Calculation),
    ).toThrow();
  },
);
it('recusa forma, unidade ou operação incorretas nos demais resultados', () => {
  const cases: Array<[Tool, Calculation]> = [
    ['mercado-justo', golden.cases[8]!.response as Calculation],
    [
      'distribuir-entre-resultados',
      {
        ...golden.cases[2]!.response,
        data: { ...golden.cases[2]!.response.data, guaranteed_profit: null },
      } as Calculation,
    ],
    [
      'distribuir-entre-resultados',
      {
        ...golden.cases[2]!.response,
        data: {
          ...golden.cases[2]!.response.data,
          total_stake_centavos: '100',
        },
      } as Calculation,
    ],
    [
      'cobertura-ao-vivo',
      {
        ...golden.cases[5]!.response,
        data: { ...golden.cases[5]!.response.data, objective: 'unknown' },
      } as Calculation,
    ],
    [
      'percentual-banca',
      {
        ...golden.cases[8]!.response,
        data: { ...golden.cases[8]!.response.data, mode: 'unknown' },
      } as Calculation,
    ],
    [
      'percentual-banca',
      {
        ...golden.cases[8]!.response,
        data: { ...golden.cases[8]!.response.data, mode: 'inverse' },
      } as Calculation,
    ],
    [
      'mercado-justo',
      {
        ...golden.cases[0]!.response,
        data: {
          ...golden.cases[0]!.response.data,
          outcomes: [{ name: '', odd: '2' }, {}],
        },
      } as Calculation,
    ],
  ];
  for (const [tool, value] of cases)
    expect(() => presentCalculation(tool, value)).toThrow();
});
