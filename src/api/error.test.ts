// @vitest-environment node
import { expect, it } from 'vitest';
import { ApiError, httpError, retryAfterMs } from './error';

it.each([
  null,
  '',
  ' ',
  '-1',
  '1.5',
  'Infinity',
  'not a date',
  '9007199254740992',
])('ignora Retry-After inválido %s', (value) => {
  expect(retryAfterMs(value)).toBeUndefined();
});
it('interpreta segundos/HTTP-date e preserva zero', () => {
  const now = Date.UTC(2026, 8, 30, 12);
  expect(retryAfterMs('0', now)).toBe(0);
  expect(retryAfterMs('10', now)).toBe(10_000);
  expect(retryAfterMs('Wed, 30 Sep 2026 12:00:03 GMT', now)).toBe(3000);
  expect(retryAfterMs('Wed, 30 Sep 2026 11:00:00 GMT', now)).toBe(0);
  expect(retryAfterMs('Wed, impossible', now)).toBeUndefined();
});
it.each([
  'http',
  'network',
  'timeout',
  'cancelled',
  'invalid_response',
  'invalid_request',
] as const)('mensagem segura de %s não depende de texto externo', (kind) => {
  const error = new ApiError(kind);
  expect(error.message).toMatch(/pedido|serviço|conectar/);
  expect(error.status).toBe(0);
  expect(error.outcomeUnknown).toBe(false);
});
it('não mantém mensagem, corpo, cause ou código desconhecido do servidor', () => {
  const error = httpError(
    new Response(null, { status: 418 }),
    {
      code: 'PRIVATE_TEST_DATA',
      detail: 'SQL traceback fixture',
    },
    false,
  );
  expect(error.code).toBeUndefined();
  expect(error.message).not.toContain('SQL');
  expect(JSON.stringify(error)).not.toContain('PRIVATE');
  expect(error).not.toHaveProperty('cause');
});
it.each([
  null,
  [],
  'trace text',
  { code: 123 },
  { detail: { code: 'refresh_reused' } },
])('lê só o código permitido de corpo desconhecido', (body) => {
  const error = httpError(new Response(null, { status: 401 }), body, false);
  expect(error.code).toBe(
    typeof body === 'object' && body && 'detail' in body
      ? 'refresh_reused'
      : undefined,
  );
});
it('prioriza código auth do header e descarta request-id inválido', () => {
  const error = httpError(
    new Response(null, {
      status: 401,
      headers: {
        'X-Auth-Error': 'access_expired',
        'X-Request-Id': '<invalid>',
        'Retry-After': '3',
      },
    }),
    { code: 'account_read_only' },
    false,
  );
  expect(error.code).toBe('access_expired');
  expect(error.requestId).toBeUndefined();
  expect(error.retryAfterMs).toBe(3000);
});
it.each([400, 401, 402, 403, 404, 405, 409, 413, 422, 429, 500, 503])(
  'HTTP %s tem copy própria',
  (status) => {
    expect(new ApiError('http', { status }).message).not.toBe(
      new ApiError('http').message,
    );
  },
);
