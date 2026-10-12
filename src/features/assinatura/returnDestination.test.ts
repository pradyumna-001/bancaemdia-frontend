import { afterEach, expect, it, vi } from 'vitest';
import {
  clearBillingReturn,
  rememberBillingReturn,
  restoreBillingReturn,
  sanitizeBillingLocation,
} from './returnDestination';
const KEY = 'bancaemdia:retorno-assinatura';
const page = (path = '/assinatura') =>
  ({ pathname: path, href: 'https://site.example' + path }) as Location;
const history = () =>
  ({ state: null, replaceState: vi.fn() }) as unknown as History;
afterEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
});
it('conserva somente destino/filtros não secretos, consumido uma vez', () => {
  rememberBillingReturn(
    '/assinatura?casa=7&apagadas=1&session_id=secret&token=secret#secao',
    sessionStorage,
  );
  expect(sessionStorage.getItem(KEY)).not.toContain('secret');
  const h = history();
  expect(restoreBillingReturn(page(), h, sessionStorage)).toBe(true);
  expect(h.replaceState).toHaveBeenCalledWith(
    null,
    '',
    '/assinatura?casa=7&apagadas=1#secao',
  );
  expect(restoreBillingReturn(page(), h, sessionStorage)).toBe(false);
});
it('não consome em outra seção, nem aceita destino externo ou de outra área', () => {
  rememberBillingReturn('/assinatura?estado=GREEN', sessionStorage);
  expect(restoreBillingReturn(page('/painel'), history(), sessionStorage)).toBe(
    false,
  );
  clearBillingReturn(sessionStorage);
  for (const raw of ['https://evil.example/', '//evil.example/', '/painel']) {
    rememberBillingReturn(raw, sessionStorage);
    expect(sessionStorage.getItem(KEY)).toBeNull();
  }
});
it.each([
  'not-json',
  'null',
  '{}',
  JSON.stringify({ saved: 0, destination: '/assinatura' }),
  JSON.stringify({ saved: Date.now() + 1e9, destination: '/assinatura' }),
  JSON.stringify({ saved: Date.now(), destination: '/painel' }),
  'x'.repeat(4001),
  JSON.stringify({ saved: 'secret', destination: '/assinatura' }),
])('descarta registro inválido/expirado sem quebrar o site', (raw) => {
  sessionStorage.setItem(KEY, raw);
  expect(restoreBillingReturn(page(), history(), sessionStorage)).toBe(false);
  expect(sessionStorage.getItem(KEY)).toBeNull();
});
it('storage bloqueado/ausente não impede o fluxo', () => {
  const storage = {
    getItem: () => {
      throw new Error();
    },
    setItem: () => {
      throw new Error();
    },
    removeItem: () => {
      throw new Error();
    },
  } as unknown as Storage;
  rememberBillingReturn('/assinatura', storage);
  expect(restoreBillingReturn(page(), history(), storage)).toBe(false);
  clearBillingReturn(storage);
  rememberBillingReturn('/assinatura');
  expect(restoreBillingReturn(page(), history())).toBe(false);
});
it('remove parâmetros de protocolo antes de renderizar/persistir, sem conceder acesso', () => {
  const h = history();
  sanitizeBillingLocation(
    page('/assinatura?session_id=secret&success=1&casa=7#secao'),
    h,
  );
  // Test Location.pathname excludes the query, as a browser does.
  expect(h.replaceState).not.toHaveBeenCalled();
  sanitizeBillingLocation(
    {
      pathname: '/assinatura',
      href: 'https://site.example/assinatura?session_id=secret&success=1&casa=7#secao',
    } as Location,
    h,
  );
  expect(h.replaceState).toHaveBeenCalledWith(
    null,
    '',
    '/assinatura?casa=7#secao',
  );
  const clean = history();
  sanitizeBillingLocation(page(), clean);
  expect(clean.replaceState).not.toHaveBeenCalled();
});
