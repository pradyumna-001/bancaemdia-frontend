import type { components } from '../../src/api/schema';

export const billingStatus = {
  access: 'FULL_WRITE',
  status: 'TRIALING',
  trial_started_at: '2026-10-01T12:00:00Z',
  trial_ends_at: '2026-10-08T12:00:00Z',
  current_period_ends_at: null,
  price_id: null,
  trial_confirmed: true,
  cancel_at_period_end: false,
  card_required: true,
  prices: [],
  checkout_available: false,
  can_manage: false,
} satisfies components['schemas']['BillingStatusResponse'];
