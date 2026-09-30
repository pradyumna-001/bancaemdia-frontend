import { afterEach, expect, it, vi } from 'vitest';
import { loginDestination, restoreLoginFragment } from './returnDestination';
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
