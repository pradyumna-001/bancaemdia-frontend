import type { components } from '../../src/api/schema';
export const unlinkedTelegram = {
  linked: false,
  linked_at: null,
  last_inbound_at: null,
  last_outbound_at: null,
} satisfies components['schemas']['LinkStatusResponse'];
export const linkedTelegram = {
  linked: true,
  linked_at: '2026-10-08T12:00:00Z',
  last_inbound_at: '2026-10-08T12:05:00Z',
  last_outbound_at: null,
} satisfies components['schemas']['LinkStatusResponse'];
export const temporaryTelegramCode = () =>
  ({
    code: 'ABCDEFGH',
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  }) satisfies components['schemas']['LinkCodeResponse'];
