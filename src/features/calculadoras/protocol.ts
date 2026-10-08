import type { components } from '../../api/schema';
import { ApiError } from '../../api/error';
import {
  centavosDaEntrada,
  decimal,
  moeda,
  moedaCentavosDecimais,
  odd,
  porcentagem,
} from '../../lib/format';

export const TOOLS = {
  'mercado-justo': {
    title: 'Mercado justo',
    description:
      'Retire a margem das odds de todos os resultados de um mercado.',
  },
  'distribuir-entre-resultados': {
    title: 'Distribuir entre resultados',
    description: 'Veja a distribuição e o lucro ou perda em cada cenário.',
  },
  'cobertura-ao-vivo': {
    title: 'Cobertura ao vivo',
    description: 'Compare os dois cenários de uma cobertura com dinheiro.',
  },
  'percentual-banca': {
    title: 'Percentual da banca',
    description:
      'Consulte um valor a partir do percentual ou o percentual de um valor.',
  },
} as const;
export type Tool = keyof typeof TOOLS;
export type Calculation = components['schemas']['CalculationResponse'];
type Json = components['schemas']['JsonValue'];
export function toolFromUrl(value: string | null): Tool {
  return value && Object.hasOwn(TOOLS, value)
    ? (value as Tool)
    : 'mercado-justo';
}
export function decimalInput(text: string): string {
  const value = text.trim().replace(',', '.');
  if (!/^(?:0|[1-9]\d{0,11})(?:\.\d{1,8})?$/.test(value) || value.length > 22)
    throw new Error(
      'Informe um decimal positivo, com até oito casas, sem separador de milhares.',
    );
  return value;
}
export function moneyInput(text: string, zero = false): number {
  const value = centavosDaEntrada(text);
  if (!zero && value === 0) throw new Error('Informe um valor maior que zero.');
  return value;
}
function invalid(): never {
  throw new ApiError('invalid_response', { mutation: true });
}
function object(value: Json | undefined): Calculation['data'] {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return invalid();
  return value;
}
function text(value: Json | undefined): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 80)
    return invalid();
  return value;
}
function exact(value: Json | undefined): string {
  if (typeof value !== 'string' || !/^-?\d{1,16}(?:\.\d{1,8})?$/.test(value))
    return invalid();
  return value;
}
function cents(value: Json | undefined): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value))
    return invalid();
  return value;
}
function yes(value: Json | undefined): string {
  if (typeof value !== 'boolean') return invalid();
  return value ? 'Sim, conforme as premissas abaixo' : 'Não';
}
const METHODS = {
  proportional_normalization_largest_remainder:
    'Normalização proporcional, com distribuição dos restos',
  inverse_odds_equal_gross_largest_remainder:
    'Retornos brutos equivalentes, com distribuição dos restos',
  equal_net_profit: 'Lucro líquido equivalente nos dois cenários',
  bankroll_times_percentage: 'Percentual aplicado à banca informada',
  stake_divided_by_bankroll: 'Valor informado em relação à banca',
} as const;
const NOTES: Record<string, string> = {
  'All mutually exclusive outcomes must be supplied; completeness cannot be verified from odds.':
    'Informe todos os resultados, distintos e que não possam acontecer juntos. As odds não comprovam que o mercado está completo.',
  'Margin removal is not a prediction of true probabilities.':
    'Retirar a margem não prevê as probabilidades reais.',
  'Guaranteed profit assumes every quoted price is executable and one outcome wins.':
    'O lucro depende de conseguir apostar nas odds informadas e de exatamente um dos resultados vencer.',
  'At least one rounded scenario is not profitable.':
    'Pelo menos um cenário após o arredondamento não apresenta lucro.',
  'Theoretical arbitrage disappears after cent rounding.':
    'A arbitragem teórica desaparece após o arredondamento em centavos.',
  'Exactly two mutually exclusive cash-stake outcomes; no freebet, partial cashout or Asian push.':
    'Somente dois resultados distintos, com aposta em dinheiro. Freebet, cashout parcial e devolução asiática não são suportados.',
  "Commission applies only to the winning leg's odds profit, before cent rounding.":
    'A comissão incide somente sobre o lucro da aposta vencedora, antes do arredondamento em centavos.',
  'Profit subtracts both stakes; quoted prices must be executable.':
    'O lucro desconta as duas entradas. É necessário conseguir apostar nas odds informadas.',
  'At least one realized scenario has a residual loss.':
    'Pelo menos um cenário ainda apresenta perda.',
  'The ideal hedge rounds to zero cents.':
    'O valor ideal da cobertura foi arredondado para zero centavos.',
};
// Presentation only. The schema publishes a generic JsonValue map; do not invent a DTO.
export function presentCalculation(tool: Tool, result: Calculation) {
  if (
    !result ||
    !result.data ||
    typeof result.data !== 'object' ||
    Array.isArray(result.data) ||
    !Object.hasOwn(METHODS, result.method) ||
    result.precision !== 'fraction:8; percent:6; money:cent; intermediate:48' ||
    result.rounding !==
      'ROUND_HALF_UP; allocation:largest_remainder_input_order' ||
    !Array.isArray(result.assumptions) ||
    !Array.isArray(result.warnings)
  )
    return invalid();
  const accepted =
    tool === 'percentual-banca'
      ? ['bankroll_times_percentage', 'stake_divided_by_bankroll']
      : tool === 'mercado-justo'
        ? ['proportional_normalization_largest_remainder']
        : tool === 'distribuir-entre-resultados'
          ? ['inverse_odds_equal_gross_largest_remainder']
          : ['equal_net_profit'];
  if (!accepted.includes(result.method)) return invalid();
  const notes = (items: string[]) =>
    items.map((item) => {
      if (!Object.hasOwn(NOTES, item)) return invalid();
      return NOTES[item]!;
    });
  const data = result.data;
  const metrics: Array<readonly [string, string]> = [];
  let columns: readonly string[] = [];
  const rows: string[][] = [];
  const money = (value: Json | undefined) => moeda(cents(value));
  const profit = (value: Json | undefined) => moeda(cents(value), true);
  const dec = (value: Json | undefined) => decimal(exact(value));
  const pct = (value: Json | undefined) => `${dec(value)}%`;
  if (tool === 'mercado-justo' || tool === 'distribuir-entre-resultados') {
    const items = data[tool === 'mercado-justo' ? 'outcomes' : 'scenarios'];
    if (!Array.isArray(items) || items.length < 2 || items.length > 20)
      return invalid();
    columns =
      tool === 'mercado-justo'
        ? [
            'Resultado',
            'Odd informada',
            'Probabilidade implícita',
            'Probabilidade sem margem',
            'Odd sem margem',
          ]
        : [
            'Resultado',
            'Odd informada',
            'Entrada',
            'Retorno bruto',
            'Lucro ou perda',
          ];
    for (const item of items) {
      const row = object(item);
      rows.push(
        tool === 'mercado-justo'
          ? [
              text(row.name),
              odd(exact(row.odd)),
              porcentagem(exact(row.implied_probability)),
              porcentagem(exact(row.fair_probability)),
              odd(exact(row.fair_odd)),
            ]
          : [
              text(row.name),
              odd(exact(row.odd)),
              money(row.stake_centavos),
              money(row.return_centavos),
              profit(row.profit_centavos),
            ],
      );
    }
    metrics.push([
      'Soma das probabilidades implícitas',
      porcentagem(exact(data.inverse_odds_sum)),
    ]);
    if (tool === 'mercado-justo')
      metrics.push([
        'Margem do mercado',
        porcentagem(exact(data.overround), true),
      ]);
    else
      metrics.push(
        ['Entrada total', money(data.total_stake_centavos)],
        ['Menor lucro ou perda', profit(data.minimum_profit_centavos)],
        ['Menor ROI', pct(data.minimum_roi_percentage)],
        ['Arbitragem teórica', yes(data.theoretical_arbitrage)],
        [
          'Lucro em todos os cenários arredondados',
          yes(data.guaranteed_profit),
        ],
      );
  } else if (tool === 'cobertura-ao-vivo') {
    if (data.objective !== 'equalize_profit') return invalid();
    metrics.push(
      ['Entrada original', money(data.original_stake_centavos)],
      ['Odd original', odd(exact(data.original_odd))],
      ['Odd oposta', odd(exact(data.opposing_odd))],
      ['Comissão', pct(data.commission_percentage)],
      ['Entrada para cobertura', money(data.hedge_stake_centavos)],
      [
        'Cobertura ideal antes de arredondar',
        moedaCentavosDecimais(exact(data.ideal_hedge_stake_centavos)),
      ],
      [
        'Diferença de arredondamento',
        moedaCentavosDecimais(exact(data.rounding_difference_centavos), true),
      ],
      ['Dois cenários sem perda', yes(data.both_outcomes_protected)],
    );
    columns = ['Cenário', 'Retorno bruto', 'Lucro ou perda'];
    for (const [key, label] of [
      ['original_wins', 'Aposta original vence'],
      ['hedge_wins', 'Cobertura vence'],
    ] as const) {
      const row = object(data[key]);
      rows.push([
        label,
        money(row.return_centavos),
        profit(row.profit_centavos),
      ]);
    }
  } else {
    if (data.mode !== 'direct' && data.mode !== 'inverse') return invalid();
    if (
      (data.mode === 'direct') !==
      (result.method === 'bankroll_times_percentage')
    )
      return invalid();
    metrics.push(
      ['Banca informada', money(data.banca_centavos)],
      ['Valor da entrada', money(data.stake_centavos)],
      ['Percentual da banca', pct(data.percentage)],
    );
    metrics.push(
      data.mode === 'direct'
        ? [
            'Valor ideal antes de arredondar',
            moedaCentavosDecimais(exact(data.ideal_stake_centavos)),
          ]
        : ['Percentual antes de arredondar', pct(data.exact_percentage)],
    );
  }
  return {
    metrics,
    columns,
    rows,
    method: METHODS[result.method as keyof typeof METHODS],
    assumptions: notes(result.assumptions),
    warnings: notes(result.warnings),
    precision:
      'Probabilidades: 8 casas; percentuais: 6 casas; dinheiro: centavos; cálculo intermediário: 48 dígitos.',
    rounding:
      'Valores monetários: metade arredondada para cima. Distribuição dos restos: desempate pela ordem informada.',
  };
}
