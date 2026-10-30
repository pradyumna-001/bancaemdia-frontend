// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import { prepareMeasurementSession } from '../../scripts/prepare-measurement-session.mjs';

const previous = {
  usuario_id: 7,
  session_version: 'session:1',
  csrf_token: 'private-proof',
};
const renewed = {
  ...previous,
  session_version: 'session:2',
  refresh_required: false,
};
function setup(responses) {
  const lock = vi.fn(async (_name, work) => work());
  vi.stubGlobal('navigator', { locks: { request: lock } });
  const fetcher = vi.fn();
  for (const response of responses) fetcher.mockResolvedValueOnce(response);
  vi.stubGlobal('fetch', fetcher);
  return { lock, fetcher };
}
afterEach(() => vi.unstubAllGlobals());

async function setupFailure() {
  const error = await prepareMeasurementSession().catch((failure) => failure);
  expect(error).toBeInstanceOf(Error);
  expect(error.message).toBe('MEASUREMENT_SESSION_SETUP_FAILED');
  expect(Object.hasOwn(error, 'cause')).toBe(false);
}

it('renova na trava real antes da amostra, mantendo prova somente no pedido', async () => {
  const { lock, fetcher } = setup([
    Response.json(previous),
    Response.json(renewed),
  ]);
  await expect(prepareMeasurementSession()).resolves.toBe(true);
  expect(lock).toHaveBeenCalledWith(
    'bancaemdia:identity',
    expect.any(Function),
  );
  expect(fetcher.mock.calls.map(([path]) => path)).toEqual([
    '/auth/session',
    '/auth/refresh',
  ]);
  expect(fetcher.mock.calls[1][1]).toMatchObject({
    method: 'POST',
    cache: 'no-store',
    credentials: 'same-origin',
    redirect: 'error',
    headers: { 'X-CSRF-Token': previous.csrf_token },
  });
});
it('sessão recusada não inicia refresh nem repete a consulta', async () => {
  const { fetcher } = setup([new Response(null, { status: 401 })]);
  await setupFailure();
  expect(fetcher).toHaveBeenCalledOnce();
});
it('JSON malformado não reproduz credenciais no erro', async () => {
  setup([new Response('private-proof malformed')]);
  await setupFailure();
});
it.each([
  { ...renewed, usuario_id: 8 },
  { ...renewed, session_version: 'other:2' },
  { ...renewed, session_version: previous.session_version },
  { ...renewed, refresh_required: true },
])('recusa troca de identidade ou renovação inválida', async (next) => {
  const { fetcher } = setup([Response.json(previous), Response.json(next)]);
  await setupFailure();
  expect(fetcher).toHaveBeenCalledTimes(2);
});
