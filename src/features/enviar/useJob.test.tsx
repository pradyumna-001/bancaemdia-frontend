import { StrictMode, type ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { ProvedorAuth } from '../../auth/ProvedorAuth';
import { createSession, type SessionService } from '../../auth/session';
import { sessionContext } from '../../auth/protocol';
import { createApiClient } from '../../api/client';
import * as apiModule from '../../api/client';
import * as configModule from '../../lib/config';
import { parseConfig } from '../../lib/config';
import {
  partialUpload,
  acceptedUpload,
} from '../../../tests/fixtures/api/responses';
import { useJob } from './useJob';

const id = acceptedUpload.job_id;
const otherId = 'bd66b236-df74-4c11-bf50-a8f823c6a479';
const pending = {
  ...partialUpload,
  status: 'processing',
  progress: { ...partialUpload.progress, percent: 20 },
};
const config = parseConfig({ VITE_API_URL: 'https://site.example.org' });
const services: SessionService[] = [];
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  vi.spyOn(configModule, 'getConfig').mockReturnValue(config);
});
afterEach(() => {
  services.splice(0).forEach((service) => service.dispose());
  vi.useRealTimers();
  vi.restoreAllMocks();
});
function person(id = 1) {
  return sessionContext({
    usuario_id: id,
    nome: 'Teste descartável',
    email: 'sandbox@example.org',
    session_version: `${crypto.randomUUID()}:1`,
    csrf_token: crypto.randomUUID(),
    refresh_required: false,
    access_expires_at: '2030-01-01T00:00:00Z',
    session_expires_at: '2030-01-02T00:00:00Z',
  });
}
async function setup(
  fetcher: (request: Request) => Promise<Response>,
  authenticated = true,
) {
  let current = person();
  const transport = {
    read: vi.fn(async () => current),
    renew: vi.fn(async () => current),
    logout: vi.fn(async () => {}),
  };
  const service = createSession({
    baseUrl: config.apiUrl,
    queryClient: new QueryClient(),
    transport,
    exclusive: async (_signal, work) => work(),
  });
  services.push(service);
  const client = createApiClient(config, {
    captureSession: service.capture,
    onUnauthorized: service.unauthorized,
    fetcher,
  });
  vi.spyOn(apiModule, 'getApiClient').mockReturnValue(client);
  if (authenticated) await service.resume();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <StrictMode>
      <ProvedorAuth service={service}>{children}</ProvedorAuth>
    </StrictMode>
  );
  return {
    service,
    wrapper,
    transport,
    changePerson: (id: number) => {
      current = person(id);
    },
  };
}
async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}
function json(data: unknown = pending, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

it('StrictMode e dois consumidores compartilham um GET tipado, privado e sem reenvio', async () => {
  const fetcher = vi.fn(async (request: Request) => {
    expect(request.method).toBe('GET');
    expect(request.url).toBe(config.apiUrl + '/api/v1/upload/' + id);
    expect(request.credentials).toBe('include');
    expect(request.cache).toBe('no-store');
    expect(request.headers.has('Authorization')).toBe(false);
    return json();
  });
  const { wrapper } = await setup(fetcher);
  const a = renderHook(() => useJob(id), { wrapper });
  const b = renderHook(() => useJob(id.toUpperCase()), { wrapper });
  await advance(1000);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(a.result.current.dados).toBe(b.result.current.dados);
  expect(a.result.current.etapa).toBe('Processando');
  expect(a.result.current.retomar()).toBe(false);
  a.unmount();
  await advance(1000);
  expect(fetcher).toHaveBeenCalledTimes(2);
  b.unmount();
  await advance(60000);
  expect(fetcher).toHaveBeenCalledTimes(2);
  const reloaded = renderHook(() => useJob(id), { wrapper });
  await advance(1000);
  expect(fetcher).toHaveBeenCalledTimes(3);
  reloaded.unmount();
});

it('ID inválido/ausente ou sessão sem autenticação não inicia consulta', async () => {
  const fetcher = vi.fn(async () => json());
  const { wrapper, service } = await setup(fetcher, false);
  const hook = renderHook(({ job }) => useJob(job), {
    wrapper,
    initialProps: { job: id },
  });
  await advance(5000);
  expect(hook.result.current.fase).toBe('inativo');
  expect(hook.result.current.retomar()).toBe(false);
  await act(async () => {
    await service.resume();
  });
  hook.rerender({ job: 'https://external.example.org/private' });
  await advance(5000);
  expect(fetcher).not.toHaveBeenCalled();
  hook.unmount();
  const absent = renderHook(() => useJob(null), { wrapper });
  await advance(5000);
  expect(absent.result.current.fase).toBe('inativo');
  const noProvider = renderHook(() => useJob(id));
  expect(noProvider.result.current.fase).toBe('inativo');
});

it('trocar job limpa a projeção anterior e descarta retorno atrasado de outro ID', async () => {
  let finish!: (response: Response) => void;
  const fetcher = vi.fn(async (request: Request) => {
    if (request.url.endsWith(id))
      return new Promise<Response>((resolve) => {
        finish = resolve;
      });
    return json({ ...partialUpload, job_id: otherId });
  });
  const { wrapper } = await setup(fetcher);
  const hook = renderHook(({ job }) => useJob(job), {
    wrapper,
    initialProps: { job: id },
  });
  await advance(1000);
  hook.rerender({ job: otherId });
  expect(hook.result.current.dados).toBeUndefined();
  await act(async () => {
    finish(json());
  });
  await advance(1000);
  expect(hook.result.current.dados?.job_id).toBe(otherId);
  expect(hook.result.current.resultado).toBe('parcial');
  await advance(60_000);
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it('troca de usuário e logout limpam dados, timers e callbacks antigos da sessão', async () => {
  let allow = true;
  const fetcher = vi.fn(async () =>
    allow ? json() : json({ detail: 'not found' }, 404),
  );
  const { wrapper, service, changePerson } = await setup(fetcher);
  const hook = renderHook(() => useJob(id), { wrapper });
  await advance(1000);
  expect(hook.result.current.dados).toBeDefined();
  const oldResume = hook.result.current.retomar;
  allow = false;
  changePerson(2);
  await act(async () => {
    await service.resume();
  });
  expect(hook.result.current.dados).toBeUndefined();
  expect(oldResume()).toBe(false);
  await advance(1000);
  expect(hook.result.current.erro?.status).toBe(404);
  expect(hook.result.current.dados).toBeUndefined();
  await act(async () => {
    await service.logout();
  });
  expect(hook.result.current).toMatchObject({ fase: 'inativo' });
  expect(hook.result.current.erro).toBeUndefined();
  await advance(60_000);
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it('HTTP402 não encerra sessão e recuperação consulta o mesmo job sem POST', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(json({ detail: 'PRIVATE_DETAIL_TEST' }, 402))
    .mockImplementation(async (request: Request) => {
      expect(request.method).toBe('GET');
      return json(partialUpload);
    });
  const { wrapper, service } = await setup(fetcher);
  const hook = renderHook(() => useJob(id), { wrapper });
  await advance(1000);
  expect(hook.result.current.erro?.status).toBe(402);
  expect(service.getSnapshot().phase).toBe('authenticated');
  let restarted = false;
  act(() => {
    restarted = hook.result.current.retomar();
  });
  expect(restarted).toBe(true);
  await advance(1000);
  expect(hook.result.current.resultado).toBe('parcial');
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it('HTTP401 invalida sessão e remove o job; corpo de sucesso ausente é resposta inválida', async () => {
  const fetcher = vi.fn(async () => json({ code: 'session_revoked' }, 401));
  const { wrapper, service } = await setup(fetcher);
  const hook = renderHook(() => useJob(id), { wrapper });
  await advance(1000);
  expect(service.getSnapshot().phase).toBe('anonymous');
  expect(hook.result.current.fase).toBe('inativo');
  expect(hook.result.current.dados).toBeUndefined();
  await advance(60_000);
  expect(fetcher).toHaveBeenCalledTimes(1);
  hook.unmount();
  fetcher.mockImplementation(async () => new Response(null, { status: 204 }));
  await act(async () => {
    await service.resume();
  });
  const missing = renderHook(() => useJob(id), { wrapper });
  await advance(1000);
  expect(missing.result.current.erro?.kind).toBe('invalid_response');
  expect(missing.result.current.resultado).toBeUndefined();
});
