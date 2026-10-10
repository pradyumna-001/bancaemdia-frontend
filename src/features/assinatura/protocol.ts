import type { components } from '../../api/schema';
import { ApiError } from '../../api/error';

export type Subscription = components['schemas']['BillingStatusResponse'];
export type Price = components['schemas']['PublicPrice'];
export type Subscribe = components['schemas']['SubscribeRequest'];

export const STATUS_LABELS = {
  AWAITING_CARD: 'Confirmação do cartão pendente',
  TRIALING: 'Período gratuito confirmado',
  ACTIVE: 'Assinatura ativa',
  PAST_DUE: 'Pagamento pendente',
  CANCELED: 'Assinatura cancelada',
  EXPIRED: 'Período encerrado',
} satisfies Record<NonNullable<Subscription['status']>, string>;

export function hostedUrl(raw: string, kind: 'checkout' | 'portal'): string {
  try {
    const url = new URL(raw);
    if (
      raw !== raw.trim() ||
      /[\\\r\n\t]/.test(raw) ||
      url.protocol !== 'https:' ||
      url.hostname !==
        (kind === 'checkout' ? 'checkout.stripe.com' : 'billing.stripe.com') ||
      url.username ||
      url.password ||
      url.port ||
      url.hash ||
      url.pathname === '/'
    )
      throw new Error();
    return url.href;
  } catch {
    // Never retain the hosted URL or its credentials in an error.
    throw new ApiError('invalid_response', { mutation: true });
  }
}

export function offersCheckout(status: Subscription): boolean {
  return (
    status.checkout_available &&
    status.prices.length > 0 &&
    (status.status === 'AWAITING_CARD' ||
      status.status === 'CANCELED' ||
      status.status === 'EXPIRED')
  );
}

export function offersCancel(status: Subscription): boolean {
  return (
    status.can_manage &&
    !status.cancel_at_period_end &&
    status.status !== null &&
    status.status !== 'CANCELED' &&
    status.status !== 'EXPIRED'
  );
}
