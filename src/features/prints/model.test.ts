import { expect, it } from 'vitest';
import {
  printIntent,
  printItem,
  printIntentId,
  printItemId,
} from '../../../tests/fixtures/prints';
import {
  printAddress,
  validateFiles,
  validateItem,
  validateIntent,
  PRINT_LIMITS,
  type PrintItem,
  type PrintIntent,
} from './model';

it('normaliza endereços sem transformar parâmetros inválidos em consultas', () => {
  expect(printAddress(new URLSearchParams())).toEqual({
    intent: undefined,
    items: [],
    invalid: false,
  });
  expect(
    printAddress(
      new URLSearchParams(`prints=${printIntentId}&item=${printItemId}`),
    ),
  ).toEqual({ intent: printIntentId, items: [printItemId], invalid: false });
  for (const query of [
    'prints=x',
    `prints=${printIntentId}&prints=${printIntentId}`,
    `item=${printItemId}`,
    `prints=${printIntentId}&item=x`,
    `prints=${printIntentId}&item=${printItemId}&item=${printItemId}`,
    `prints=${printIntentId}&${Array.from({ length: 21 }, () => `item=${crypto.randomUUID()}`).join('&')}`,
  ])
    expect(printAddress(new URLSearchParams(query)).invalid).toBe(true);
});
it('recusa a seleção inteira quando ultrapassa quantidade, formato ou bytes', () => {
  const file = new File(['data'], 'print.png', { type: 'image/png' });
  expect(validateFiles([file], [])).toBe('');
  expect(validateFiles(Array(21).fill(file), [])).toMatch(/20 prints/);
  expect(
    validateFiles([new File([], 'print.png', { type: 'image/png' })], []),
  ).toMatch(/vazias/);
  expect(
    validateFiles([new File(['x'], 'html.html', { type: 'text/html' })], []),
  ).toMatch(/JPEG/);
  const huge = new File(['x'], 'print.png', { type: 'image/png' });
  Object.defineProperty(huge, 'size', { value: PRINT_LIMITS.file + 1 });
  expect(validateFiles([huge], [])).toMatch(/20 MiB/);
  const big = new File(['x'], 'print.png', { type: 'image/png' });
  Object.defineProperty(big, 'size', { value: PRINT_LIMITS.file });
  expect(validateFiles([big], Array(5).fill(big))).toMatch(/100 MiB/);
});
it('preserva estados reais, nulos e resultados de Revisão sem aposta', () => {
  for (const status of [
    'accepted',
    'processing',
    'completed',
    'failed',
  ] as const)
    expect(
      validateItem(printItem({ status }), printIntentId, printItemId).status,
    ).toBe(status);
  for (const outcome of [
    'materialized',
    'review',
    'no_bet',
    'duplicate',
    'failed',
  ] as const)
    expect(
      validateItem(
        printItem({
          outcome,
          progress_percent: 100,
          results: [{ type: 'review', bet_key: null, review_ids: [1] }],
        }),
        printIntentId,
        printItemId,
      ).outcome,
    ).toBe(outcome);
  expect(
    validateItem(printItem(), printIntentId, printItemId).results,
  ).toBeNull();
  expect(
    validateItem(
      printItem({
        results: [{ type: 'materialized', bet_key: 'key', review_ids: [] }],
      }),
      printIntentId,
      printItemId,
    ).results,
  ).toHaveLength(1);
});
it.each([
  undefined,
  { intent_id: 'wrong' },
  { item_id: 'wrong' },
  { status: 'inventado' },
  { outcome: 'inventado' },
  { attempt: 0 },
  { attempt: 4 },
  { attempt: 1.5 },
  { retryable: 1 },
  { duplicate: 1 },
  { progress_percent: -1 },
  { progress_percent: 101 },
  { progress_percent: 1.2 },
  { results: {} },
  { results: [{ type: 'inventado', bet_key: null, review_ids: [] }] },
  { results: [{ type: 'review', bet_key: 123, review_ids: [] }] },
  { results: [{ type: 'review', bet_key: '', review_ids: [] }] },
  { results: [{ type: 'review', bet_key: null, review_ids: 'x' }] },
  { results: [{ type: 'review', bet_key: null, review_ids: [0] }] },
])('recusa resposta de item incompatível (%j)', (values) => {
  expect(() =>
    validateItem(
      values === undefined
        ? undefined
        : printItem(values as Partial<PrintItem>),
      printIntentId,
      printItemId,
    ),
  ).toThrow();
});
it('valida o conjunto recebido sem inferir que toda seleção foi enviada', () => {
  for (const state of ['processing', 'complete', 'partial', 'failed'] as const)
    expect(
      validateIntent(printIntent([printItem()], { state }), printIntentId)
        .state,
    ).toBe(state);
  for (const value of [
    undefined,
    printIntent([], { intent_id: 'wrong' }),
    printIntent([], { state: 'x' as PrintIntent['state'] }),
    printIntent([], { items: null as unknown as PrintItem[] }),
    printIntent(Array(21).fill(printItem())),
    printIntent([printItem(), printItem()]),
    printIntent([], { received_items: 1 }),
    printIntent([], { terminal_items: -1 }),
    printIntent([], { terminal_items: 1 }),
    printIntent([printItem({ attempt: 9 })]),
  ])
    expect(() => validateIntent(value, printIntentId)).toThrow();
});
