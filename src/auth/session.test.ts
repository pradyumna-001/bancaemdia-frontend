import { afterEach, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/error';
import {
  browserExclusive,
  createSession,
  type SessionService,
} from './session';
import { sessionContext } from './protocol';

const services: SessionService[] = [];
afterEach(() => {
  services.splice(0).forEach((service) => service.dispose());
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it('mensagens entre abas não transportam segredos e encerramento pendente suspende pedidos', async () => {
  let listener: (event: MessageEvent) => void = () => {};
  const channel = {
    postMessage: vi.fn(),
    addEventListener: (
      type: 'message',
      callback: (event: MessageEvent) => void,
    ) => {
      expect(type).toBe('message');
      listener = callback;
    },
    removeEventListener: vi.fn(),
    close: vi.fn(),
  };
  const initial = context();
  const transport = {
    read: vi.fn(async () => initial),
    renew: vi.fn(async () => initial),
    logout: vi.fn(async () => {}),
  };
  const service = createSession({
    baseUrl: 'https://site.example.org',
    queryClient: new QueryClient(),
    transport,
    channel,
    exclusive: async (_signal, work) => work(),
  });
  services.push(service);
  await service.resume();
  listener(new MessageEvent('message', { data: 'unknown' }));
  expect(service.getSnapshot().phase).toBe('authenticated');
  listener(new MessageEvent('message', { data: 'changed' }));
  await service.resume();
  const scope = service.capture();
  listener(new MessageEvent('message', { data: 'ending' }));
  expect(scope.isCurrent()).toBe(false);
  expect(service.getSnapshot().phase).toBe('ending');
  expect(await service.resume()).toBe(false);
  listener(new MessageEvent('message', { data: 'logout_failed' }));
  expect(service.getSnapshot().logoutUnconfirmed).toBe(true);
  transport.read.mockRejectedValue(new ApiError('http', { status: 401 }));
  await service.logout();
  listener(new MessageEvent('message', { data: 'ended' }));
  expect(service.getSnapshot().phase).toBe('anonymous');
  expect(
    channel.postMessage.mock.calls.every(([message]) =>
      ['changed', 'ending', 'ended', 'logout_failed'].includes(message),
    ),
  ).toBe(true);
  service.dispose();
  expect(channel.close).toHaveBeenCalledOnce();
  expect(channel.removeEventListener).toHaveBeenCalledOnce();
});
it('resposta de consulta anterior ao novo login não restaura o usuário antigo', async () => {
  const { service, transport } = setup();
  let finish: (value: ReturnType<typeof context>) => void = () => {};
  transport.read.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const pending = service.resume();
  service.login('/painel');
  finish(context());
  expect(await pending).toBe(false);
  expect(service.getSnapshot().phase).toBe('anonymous');
});
it('recuperação negada e erros comerciais não repetem leitura, e logout sem trava não revoga', async () => {
  const { service, transport } = setup();
  await service.resume();
  const read = vi.fn().mockRejectedValue(new ApiError('http', { status: 402 }));
  await expect(service.read(read)).rejects.toMatchObject({ status: 402 });
  expect(read).toHaveBeenCalledOnce();
  transport.read.mockRejectedValue(new ApiError('http', { status: 503 }));
  const expired = vi
    .fn()
    .mockRejectedValue(
      new ApiError('http', { status: 401, code: 'access_expired' }),
    );
  await expect(service.read(expired)).rejects.toMatchObject({ status: 401 });
  expect(expired).toHaveBeenCalledOnce();
  const unsupported = setup(context(), false);
  await unsupported.service.resume();
  expect(await unsupported.service.logout()).toBe(false);
  expect(unsupported.transport.logout).not.toHaveBeenCalled();
});
it('trava nativa consulta dentro da região exclusiva e não usa storage como substituto', async () => {
  expect(browserExclusive()).toBeUndefined();
  const request = vi.fn(
    async (name: string, options: unknown, work: () => Promise<unknown>) => {
      expect(name).toBe('bancaemdia:identity');
      expect(options).toMatchObject({ mode: 'exclusive' });
      return work();
    },
  );
  vi.stubGlobal('navigator', { locks: { request } });
  expect(
    await browserExclusive()!(
      new AbortController().signal,
      async () => 'resultado',
    ),
  ).toBe('resultado');
  expect(request.mock.calls[0]![0]).toBe('bancaemdia:identity');
});
function context(
  id = 1,
  family = crypto.randomUUID(),
  version = 1,
  needsRenewal = false,
) {
  return sessionContext({
    usuario_id: id,
    nome: 'Teste',
    email: 'sandbox@example.org',
    session_version: `${family}:${version}`,
    csrf_token: crypto.randomUUID(),
    access_expires_at: '2030-01-01T00:00:00Z',
    session_expires_at: '2030-01-02T00:00:00Z',
    refresh_required: needsRenewal,
  });
}
function setup(initial = context(), exclusive: boolean = true) {
  const queryClient = new QueryClient();
  const transport = {
    read: vi.fn(async () => initial),
    renew: vi.fn(async () => context()),
    logout: vi.fn(async () => {}),
  };
  const navigate = vi.fn();
  const service = createSession({
    baseUrl: 'https://site.example.org',
    queryClient,
    transport,
    navigate,
    exclusive: exclusive ? async (_signal, work) => work() : undefined,
  });
  services.push(service);
  return { service, transport, queryClient, navigate };
}
it('identidade em memória não inclui prova, versão, capacidade comercial ou tokens no estado público', async () => {
  const { service } = setup();
  await service.resume();
  expect(service.getSnapshot()).toMatchObject({
    phase: 'authenticated',
    person: { id: 1 },
  });
  expect(JSON.stringify(service.getSnapshot())).not.toMatch(
    /csrf|proof|token|version|FULL_WRITE/,
  );
  expect(service.capture().isCurrent()).toBe(true);
});
it('agrupa consultas simultâneas sem grants paralelos', async () => {
  const { service, transport } = setup();
  await Promise.all([service.resume(), service.resume(), service.resume()]);
  expect(transport.read).toHaveBeenCalledTimes(1);
  expect(transport.renew).not.toHaveBeenCalled();
});
it('trocar usuário cancela respostas, limpa queries/mutations/arquivos e muda chave dos formulários', async () => {
  const { service, transport, queryClient } = setup();
  await service.resume();
  queryClient.setQueryData(['private'], { person: 1 });
  queryClient
    .getMutationCache()
    .build(queryClient, { mutationFn: async () => 1 });
  const cleanup = vi.fn();
  const unregister = service.registerCleanup(cleanup);
  const scope = service.capture();
  const epoch = service.getSnapshot().privateEpoch;
  transport.read.mockResolvedValue(context(2));
  await service.resume();
  expect(scope.signal.aborted).toBe(true);
  expect(scope.isCurrent()).toBe(false);
  expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  expect(queryClient.getMutationCache().getAll()).toHaveLength(0);
  expect(service.getSnapshot().privateEpoch).toBeGreaterThan(epoch);
  expect(cleanup).toHaveBeenCalledOnce();
  unregister();
});
it('renovação do mesmo usuário mantém formulário, troca prova e cancela pedidos da versão anterior', async () => {
  const family = crypto.randomUUID();
  const { service, transport } = setup(context(1, family));
  await service.resume();
  const scope = service.capture();
  const epoch = service.getSnapshot().privateEpoch;
  transport.read.mockResolvedValue(context(1, family, 1, true));
  transport.renew.mockResolvedValue(context(1, family, 2));
  expect(await service.resume()).toBe(true);
  expect(transport.renew).toHaveBeenCalledOnce();
  expect(scope.signal.aborted).toBe(true);
  expect(service.getSnapshot().privateEpoch).toBe(epoch);
  expect(service.capture().csrfToken).not.toBe(scope.csrfToken);
});
it('sem trava entre abas não faz refresh, mantendo uma saída segura', async () => {
  const { service, transport } = setup(
    context(1, crypto.randomUUID(), 1, true),
    false,
  );
  expect(await service.resume()).toBe(false);
  expect(transport.renew).not.toHaveBeenCalled();
  expect(service.getSnapshot().error?.kind).toBe('invalid_request');
});
it.each([
  'session_expired',
  'refresh_reused',
  'account_inactive',
  'not_authenticated',
])('401 %s remove contexto sem laço', async (code) => {
  const { service, transport } = setup();
  await service.resume();
  const scope = service.capture();
  transport.read.mockRejectedValue(new ApiError('http', { status: 401, code }));
  expect(await service.resume()).toBe(false);
  expect(service.getSnapshot().phase).toBe('anonymous');
  expect(scope.isCurrent()).toBe(false);
  expect(() => service.capture()).toThrow(ApiError);
});
it('503 preserva identidade sem afirmar sessão encerrada ou repetir automaticamente', async () => {
  const { service, transport } = setup();
  await service.resume();
  transport.read.mockRejectedValue(new ApiError('http', { status: 503 }));
  await service.resume();
  expect(service.getSnapshot()).toMatchObject({
    phase: 'error',
    person: { id: 1 },
  });
  expect(transport.read).toHaveBeenCalledTimes(2);
  expect(transport.renew).not.toHaveBeenCalled();
});
it('Retry-After impede novas consultas antes do prazo', async () => {
  vi.useFakeTimers();
  const { service, transport } = setup();
  transport.read.mockRejectedValue(
    new ApiError('http', {
      status: 429,
      headers: new Headers({ 'Retry-After': '60' }),
    }),
  );
  await service.resume();
  await service.resume();
  expect(transport.read).toHaveBeenCalledOnce();
  await vi.advanceTimersByTimeAsync(60_000);
  await service.resume();
  expect(transport.read).toHaveBeenCalledTimes(2);
});
it.each(['user', 'family', 'unchanged', 'required'])(
  'recusa grant que viola identidade/rotação: %s',
  async (kind) => {
    const original = context(1, crypto.randomUUID(), 1, true);
    const { service, transport } = setup(original);
    transport.renew.mockResolvedValue(
      kind === 'user'
        ? context(2)
        : kind === 'family'
          ? context(1)
          : kind === 'unchanged'
            ? { ...original, needsRenewal: false }
            : { ...original, version: original.version.split(':')[0] + ':2' },
    );
    expect(await service.resume()).toBe(false);
    expect(service.getSnapshot().error?.kind).toBe('invalid_response');
  },
);
it('renova e repete somente uma leitura ainda do mesmo usuário', async () => {
  const family = crypto.randomUUID();
  const { service, transport } = setup(context(1, family));
  await service.resume();
  transport.read.mockResolvedValue(context(1, family, 1, true));
  transport.renew.mockResolvedValue(context(1, family, 2));
  const read = vi
    .fn()
    .mockRejectedValueOnce(
      new ApiError('http', { status: 401, code: 'access_expired' }),
    )
    .mockResolvedValueOnce('resultado');
  expect(await service.read(read)).toBe('resultado');
  expect(read).toHaveBeenCalledTimes(2);
});
it('outra identidade após 401 nunca recebe repetição da leitura antiga', async () => {
  const { service, transport } = setup();
  await service.resume();
  transport.read.mockResolvedValue(context(2));
  const read = vi
    .fn()
    .mockRejectedValue(
      new ApiError('http', { status: 401, code: 'access_expired' }),
    );
  await expect(service.read(read)).rejects.toMatchObject({ status: 401 });
  expect(read).toHaveBeenCalledOnce();
});
it('402 preserva contexto; demais 401 encerram, access_expired fica para recuperação explícita', async () => {
  const { service } = setup();
  await service.resume();
  service.unauthorized(new ApiError('http', { status: 402 }));
  expect(service.getSnapshot().phase).toBe('authenticated');
  service.unauthorized(
    new ApiError('http', { status: 401, code: 'access_expired' }),
  );
  expect(service.getSnapshot().phase).toBe('authenticated');
  service.unauthorized(new ApiError('http', { status: 401 }));
  expect(service.getSnapshot().phase).toBe('anonymous');
});
it('logout consulta prova atual na trava e confirma revogação, inclusive todas as sessões', async () => {
  const initial = context();
  const { service, transport } = setup(initial);
  await service.resume();
  const scope = service.capture();
  expect(await service.logout(true)).toBe(true);
  expect(scope.signal.aborted).toBe(true);
  expect(transport.logout).toHaveBeenCalledWith(
    expect.anything(),
    initial.proof,
    true,
  );
  expect(service.getSnapshot().phase).toBe('anonymous');
  expect(await service.logout()).toBe(false);
});
it('logout falho elimina dados locais mas não afirma revogação nem recupera acesso silenciosamente', async () => {
  const { service, transport, queryClient } = setup();
  await service.resume();
  queryClient.setQueryData(['private'], 1);
  transport.logout.mockRejectedValue(
    new ApiError('network', { mutation: true }),
  );
  expect(await service.logout()).toBe(false);
  expect(service.getSnapshot()).toMatchObject({
    phase: 'error',
    logoutUnconfirmed: true,
  });
  expect(service.getSnapshot().person).toBeUndefined();
  expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  expect(await service.resume()).toBe(false);
  expect(transport.logout).toHaveBeenCalledOnce();
  transport.read.mockRejectedValue(new ApiError('http', { status: 401 }));
  expect(await service.logout()).toBe(true);
  expect(transport.logout).toHaveBeenCalledOnce();
});
it('não encerra cookie de outra identidade que mudou enquanto esperava a trava', async () => {
  const { service, transport } = setup();
  await service.resume();
  transport.read.mockResolvedValue(context(2));
  expect(await service.logout()).toBe(false);
  expect(transport.logout).not.toHaveBeenCalled();
});
it('login valida destino e não envia fragmento nem credenciais ao emissor', () => {
  const { service, navigate } = setup();
  service.login('/painel?apagadas=1#serie', 'recover');
  const url = new URL(navigate.mock.calls[0]![0]);
  expect(url.pathname).toBe('/auth/start');
  expect(url.searchParams.get('return_to')).toBe('/painel?apagadas=1');
  expect(url.searchParams.get('intent')).toBe('recover');
  expect(url.hash).toBe('');
  service.login('https://evil.example');
  expect(
    new URL(navigate.mock.calls[1]![0]).searchParams.get('return_to'),
  ).toBe('/');
});
it('descarte impede nova consulta ou resposta de login antiga', async () => {
  const { service } = setup();
  const unsubscribe = service.subscribe(vi.fn());
  unsubscribe();
  service.dispose();
  expect(await service.resume()).toBe(false);
  expect(await service.logout()).toBe(false);
  expect(() => service.capture()).toThrow();
});
it('duas abas consultam dentro da mesma trava e emitem um único grant rotativo', async () => {
  const queryClient = new QueryClient();
  let current = context(1, crypto.randomUUID(), 1, true);
  let tail = Promise.resolve();
  const exclusive = async <T>(_signal: AbortSignal, work: () => Promise<T>) => {
    const previous = tail;
    let release = () => {};
    tail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await work();
    } finally {
      release();
    }
  };
  const transport = {
    read: vi.fn(async () => current),
    renew: vi.fn(async () => {
      current = {
        ...current,
        version: current.version.split(':')[0] + ':2',
        proof: crypto.randomUUID(),
        needsRenewal: false,
      };
      return current;
    }),
    logout: vi.fn(async () => {}),
  };
  const a = createSession({
    baseUrl: 'https://site.example.org',
    queryClient,
    transport,
    exclusive,
  });
  const b = createSession({
    baseUrl: 'https://site.example.org',
    queryClient: new QueryClient(),
    transport,
    exclusive,
  });
  services.push(a, b);
  await Promise.all([a.resume(), b.resume()]);
  expect(transport.renew).toHaveBeenCalledOnce();
  expect(a.capture().csrfToken).toBe(b.capture().csrfToken);
});
