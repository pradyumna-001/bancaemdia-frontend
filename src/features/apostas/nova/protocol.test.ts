import { expect, it } from 'vitest';
import {
  inicial,
  pedido,
  validarRecibo,
  destinoRecibo,
  uuidValido,
} from './protocol';
import { manualId, reciboManual } from '../../../../tests/fixtures/manual';
import { centavosExatosDaEntrada } from '../../../lib/format';
import { novaApostaDestino } from '../../../lib/novaApostaDestino';

it('preserves face, exact commission, body text, temporal input and explicit account', () => {
  const body = pedido(
    {
      ...inicial,
      odd: '2,35',
      unidades: '1,5',
      freebet: true,
      evento: ' Jogo ',
      descricao: ' Texto ',
      mercado: 'Mercado',
      aposta: '15/10/2026 14:00-03:00',
      jogo: '16/10/2026 19:00-03:00',
      comissao: '90071992547409,93',
      conta: '9007199254740995',
    },
    'Betano',
  );
  expect(body).toEqual({
    casa: 'Betano',
    odd: 2.35,
    stake_unidades: 1.5,
    freebet: true,
    evento: ' Jogo ',
    descricao: ' Texto ',
    mercado_bruto: 'Mercado',
    data_aposta: '2026-10-15T14:00:00-03:00',
    data_jogo: '2026-10-16T19:00:00-03:00',
    comissao_centavos: '9007199254740993',
    conta_casa_id: '9007199254740995',
  });
});
it('leaves clock, account and financial decisions to the server', () => {
  expect(
    pedido({ ...inicial, odd: '1.01', unidades: '0.1' }, 'Betano'),
  ).toMatchObject({
    data_aposta: null,
    data_jogo: null,
    conta_casa_id: null,
    comissao_centavos: '0',
    evento: null,
    descricao: null,
    mercado_bruto: null,
  });
});
it.each(['', 'NaN', '1e2', '-2', '0', '1.001', '1001'])(
  'rejects invalid odd %s',
  (odd) => {
    expect(() =>
      pedido({ ...inicial, odd, unidades: '1' }, 'Betano'),
    ).toThrow();
  },
);
it.each(['0', '-1', 'Infinity', '1e300', '9007199254740992'])(
  'rejects invalid units %s',
  (unidades) => {
    expect(() =>
      pedido({ ...inicial, odd: '2', unidades }, 'Betano'),
    ).toThrow();
  },
);
it('requires an explicit catalog house and valid instant', () => {
  expect(() => pedido({ ...inicial, odd: '2', unidades: '1' }, '')).toThrow(
    'Escolha',
  );
  expect(() =>
    pedido(
      { ...inicial, odd: '2', unidades: '1', jogo: '31/02/2026 10:00-03:00' },
      'Betano',
    ),
  ).toThrow();
});
it('accepts BIGINT cents exactly and rejects overflow or fractions beyond cents', () => {
  expect(centavosExatosDaEntrada('92233720368547758,07')).toBe(
    '9223372036854775807',
  );
  expect(() => centavosExatosDaEntrada('92233720368547758,08')).toThrow();
  expect(() => centavosExatosDaEntrada('1,001')).toThrow();
});
it('new intent links remove only the previous intent by an explicit action', () => {
  expect(
    novaApostaDestino('?casa=7&apagadas=1&manual_intencao=' + manualId),
  ).toBe('/aposta/nova?casa=7&apagadas=1');
  expect(novaApostaDestino('?manual_intencao=' + manualId)).toBe(
    '/aposta/nova',
  );
});
it('validates the published receipt and constructs only a local destination', () => {
  expect(validarRecibo(reciboManual, manualId)).toBe(reciboManual);
  expect(validarRecibo(reciboManual, manualId.toUpperCase())).toBe(
    reciboManual,
  );
  expect(
    destinoRecibo(reciboManual, new URLSearchParams('casa=7&apagadas=1')),
  ).toContain('casa=7&apagadas=1&manual_intencao=');
  expect(uuidValido(manualId)).toBe(true);
  expect(uuidValido('bad')).toBe(false);
});
it.each([
  undefined,
  { ...reciboManual, intencao_id: crypto.randomUUID() },
  { ...reciboManual, estado: 'pending' },
  { ...reciboManual, aposta_chave: 'https://evil.test' },
  { ...reciboManual, detalhe_url: 'https://evil.test' },
  { ...reciboManual, confirmado_em: 'invalid' },
  {
    ...reciboManual,
    confirmacao_original: {
      ...reciboManual.confirmacao_original,
      stake_centavos: '1.5',
    },
  },
])('rejects invalid receipt %#', (value) => {
  expect(() => validarRecibo(value as typeof reciboManual, manualId)).toThrow();
});
