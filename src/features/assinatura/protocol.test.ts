import { describe, expect, it } from 'vitest';
import { billingStatus } from '../../../tests/fixtures/acesso';
import {
  hostedUrl,
  offersCancel,
  offersCheckout,
  STATUS_LABELS,
} from './protocol';

describe('destinos hospedados da versão integrada', () => {
  it.each(['checkout', 'portal'] as const)(
    'aceita somente o destino HTTPS %s',
    (kind) => {
      const host =
        kind === 'checkout' ? 'checkout.stripe.com' : 'billing.stripe.com';
      expect(hostedUrl(`https://${host}/c/test`, kind)).toBe(
        `https://${host}/c/test`,
      );
    },
  );
  it.each([
    'http://checkout.stripe.com/c/test',
    'https://checkout.stripe.com.evil/c/test',
    'https://evil/c/test',
    'https://user:secret@checkout.stripe.com/c/test',
    'https://checkout.stripe.com:444/c/test',
    'javascript:alert(1)',
    ' https://checkout.stripe.com/c/test',
    'https://checkout.stripe.com/',
    'https://checkout.stripe.com/c/test#secret',
    'https:\\checkout.stripe.com/c/test',
    'https://checkout.stripe.com/c/\ntest',
  ])('recusa destino sem expor seu conteúdo', (raw) => {
    expect(() => hostedUrl(raw, 'checkout')).toThrow(
      'Não foi possível ler a resposta',
    );
    try {
      hostedUrl(raw, 'checkout');
    } catch (error) {
      expect(JSON.stringify(error)).not.toContain(raw);
    }
  });
  it('não aceita URL do outro fluxo', () =>
    expect(() =>
      hostedUrl('https://billing.stripe.com/p/session/test', 'checkout'),
    ).toThrow());
});
it('orienta ações pelo estado publicado, sem conceder acesso ou usar relógio', () => {
  for (const status of Object.keys(STATUS_LABELS) as Array<
    keyof typeof STATUS_LABELS
  >) {
    const data = {
      ...billingStatus,
      status,
      can_manage: true,
      prices: [
        {
          id: 1,
          amount_minor: 12345,
          currency: 'BRL',
          frequency: 'MONTHLY' as const,
        },
      ],
      checkout_available: true,
    };
    expect(offersCheckout(data)).toBe(
      ['AWAITING_CARD', 'CANCELED', 'EXPIRED'].includes(status),
    );
    expect(offersCancel(data)).toBe(!['CANCELED', 'EXPIRED'].includes(status));
  }
  expect(
    offersCheckout({
      ...billingStatus,
      status: 'AWAITING_CARD',
      checkout_available: true,
    }),
  ).toBe(false);
  expect(
    offersCancel({
      ...billingStatus,
      can_manage: true,
      cancel_at_period_end: true,
    }),
  ).toBe(false);
  expect(
    offersCancel({ ...billingStatus, can_manage: true, status: null }),
  ).toBe(false);
});
