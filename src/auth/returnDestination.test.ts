import { afterEach, expect, it, vi } from 'vitest';
import {
  loginDestination,
  restoreLoginFragment,
  sanitizeProtocolLocation,
} from './returnDestination';
afterEach(() => {
  sessionStorage.clear();
  vi.useRealTimers();
});
it('restaura fragmento somente no caminho/query permitido, uma vez e sem prova de sessão', () => {
  expect(loginDestination('/painel?apagadas=1#serie', sessionStorage)).toBe(
    '/painel?apagadas=1',
  );
  const location = { pathname: '/painel', search: '?apagadas=1' } as Location;
  const replaceState = vi.fn();
  const history = { state: null, replaceState } as unknown as History;
  restoreLoginFragment(location, history, sessionStorage);
  expect(replaceState).toHaveBeenCalledWith(
    null,
    '',
    '/painel?apagadas=1#serie',
  );
  restoreLoginFragment(location, history, sessionStorage);
  expect(replaceState).toHaveBeenCalledOnce();
  expect(sessionStorage.length).toBe(0);
});
it.each(['other', 'expired', 'malformed', 'unsafe'])(
  'descarta retorno %s sem redirecionar',
  (kind) => {
    vi.useFakeTimers();
    loginDestination('/painel#serie', sessionStorage);
    if (kind === 'expired') vi.advanceTimersByTime(600_001);
    if (kind === 'malformed')
      sessionStorage.setItem('bancaemdia:retorno-fragmento', 'malformed');
    if (kind === 'unsafe') loginDestination('/painel#%00', sessionStorage);
    const replaceState = vi.fn();
    restoreLoginFragment(
      {
        pathname: kind === 'other' ? '/enviar' : '/painel',
        search: '',
      } as Location,
      { state: null, replaceState } as unknown as History,
      sessionStorage,
    );
    expect(replaceState).not.toHaveBeenCalled();
    expect(sessionStorage.length).toBe(0);
  },
);
it('storage indisponível não impede entrada nem cria destino externo', () => {
  const unavailable = {
    removeItem: () => {
      throw new Error();
    },
    getItem: () => {
      throw new Error();
    },
  } as unknown as Storage;
  expect(loginDestination('https://evil.example', unavailable)).toBe('/');
  expect(() =>
    restoreLoginFragment(location, history, unavailable),
  ).not.toThrow();
});

it('retira protocolo da URL antes da tela e sanitiza o destino aninhado', () => {
  const replaceState = vi.fn();
  sanitizeProtocolLocation(
    {
      pathname: '/login',
      search:
        '?code=discard&state=discard&destino=%2Fpainel%3Fapagadas%3D1%26token%3Ddiscard%23serie',
      hash: '#access_token=discard',
    } as Location,
    { state: null, replaceState } as unknown as History,
  );
  const safe = new URL(replaceState.mock.calls[0]![2], 'https://site.example');
  expect([...safe.searchParams.keys()]).toEqual(['destino']);
  expect(safe.searchParams.get('destino')).toBe('/painel?apagadas=1#serie');
  expect(safe.hash).toBe('');
});
it('URL sem protocolo não substitui o histórico; fragmento secreto não entra em storage', () => {
  const replaceState = vi.fn();
  sanitizeProtocolLocation(
    { pathname: '/painel', search: '?apagadas=1', hash: '#serie' } as Location,
    { state: null, replaceState } as unknown as History,
  );
  expect(replaceState).not.toHaveBeenCalled();
  expect(
    loginDestination('/painel?code=discard#id_token=discard', sessionStorage),
  ).toBe('/painel');
  expect(sessionStorage.length).toBe(0);
});
