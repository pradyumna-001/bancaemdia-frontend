import { afterEach, expect, it, vi } from 'vitest';
import { createIdentityTransport, sessionContext } from './protocol';
const body = () => ({
  usuario_id: 1,
  nome: 'Teste',
  email: 'sandbox@example.org',
  session_version: `${crypto.randomUUID()}:1`,
  csrf_token: crypto.randomUUID(),
  access_expires_at: '2030-01-01T00:00:00Z',
  session_expires_at: '2030-01-02T00:00:00Z',
  refresh_required: false,
});
afterEach(() => vi.useRealTimers());
it.each([
  null,
  [],
  {},
  { ...body(), usuario_id: 2 ** 53 },
  { ...body(), session_version: 'bad' },
  { ...body(), csrf_token: 'bad\r\n' },
  { ...body(), access_expires_at: 'amanhã' },
  { ...body(), refresh_required: 'true' },
])('não autoriza resposta inválida (%#)', (value) => {
  expect(() => sessionContext(value)).toThrow();
});
it('transporta apenas cookie e prova atual, sem reter campos extras da resposta', async () => {
  const value = body();
  const fetcher = vi.fn<typeof fetch>(async () =>
    Response.json({ ...value, private_trace: 'PRIVATE' }),
  );
  const transport = createIdentityTransport(
    'https://site.example.org',
    fetcher,
  );
  const signal = new AbortController().signal;
  expect(await transport.read(signal)).not.toHaveProperty('private_trace');
  await transport.renew(signal, value.csrf_token);
  expect(fetcher.mock.calls[1]![1]).toMatchObject({
    method: 'POST',
    credentials: 'include',
    redirect: 'error',
    cache: 'no-store',
    headers: { 'X-CSRF-Token': value.csrf_token },
  });
});
it('logout somente confirma resposta válida e permite all_sessions explícito', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ logged_out: true }))
    .mockResolvedValueOnce(Response.json({ logged_out: false }));
  const transport = createIdentityTransport(
    'https://site.example.org',
    fetcher,
  );
  const signal = new AbortController().signal;
  await transport.logout(signal, crypto.randomUUID(), true);
  expect(String(fetcher.mock.calls[0]![0])).toContain('all_sessions=true');
  await expect(
    transport.logout(signal, crypto.randomUUID()),
  ).rejects.toMatchObject({ kind: 'invalid_response', outcomeUnknown: true });
});
it.each([
  [
    'http',
    Response.json(
      { code: 'refresh_reused', detail: 'PRIVATE' },
      { status: 401 },
    ),
  ],
  ['invalid_response', new Response('PRIVATE')],
])('normaliza falha %s sem payload', async (kind, response) => {
  const transport = createIdentityTransport(
    'https://site.example.org',
    vi.fn(async () => response as Response),
  );
  await expect(
    transport.read(new AbortController().signal),
  ).rejects.toMatchObject({ kind });
});
it('timeout cobre corpo, rejeita cedo e aborto tardio não restitui resposta', async () => {
  vi.useFakeTimers();
  const response = Response.json(body());
  vi.spyOn(response, 'text').mockImplementation(() => new Promise(() => {}));
  const transport = createIdentityTransport(
    'https://site.example.org',
    vi.fn(async () => response),
  );
  const result = transport.read(new AbortController().signal);
  const assertion = expect(result).rejects.toMatchObject({ kind: 'timeout' });
  await vi.advanceTimersByTimeAsync(10_000);
  await assertion;
});
it('cancelamento antes/durante chamada não vira erro de rede', async () => {
  const controller = new AbortController();
  const fetcher = vi.fn(() => new Promise<Response>(() => {}));
  const transport = createIdentityTransport(
    'https://site.example.org',
    fetcher,
  );
  const result = transport.read(controller.signal);
  const assertion = expect(result).rejects.toMatchObject({ kind: 'cancelled' });
  controller.abort();
  await assertion;
  await expect(transport.read(controller.signal)).rejects.toMatchObject({
    kind: 'cancelled',
  });
  expect(fetcher).toHaveBeenCalledOnce();
});
it('exceção de rede não expõe URL ou mensagem original', async () => {
  const transport = createIdentityTransport(
    'https://site.example.org',
    vi.fn(async () => {
      throw new Error('PRIVATE');
    }),
  );
  await expect(
    transport.read(new AbortController().signal),
  ).rejects.toMatchObject({ kind: 'network' });
});
