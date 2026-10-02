import { expect, it } from 'vitest';
import { clearProtocolParameters } from './protocolParameters';
import { destinoInterno } from './destinoInterno';

it('remove parâmetros de protocolo sem alterar filtros e âncora de seção', () => {
  const url = new URL(
    'https://site.example/painel?apagadas=1&casa=Bet%20365&code=discard&STATE=discard&iss=discard&error_description=discard#serie',
  );
  clearProtocolParameters(url);
  expect(url.searchParams.get('apagadas')).toBe('1');
  expect(url.searchParams.get('casa')).toBe('Bet 365');
  expect([...url.searchParams.keys()]).toEqual(['apagadas', 'casa']);
  expect(url.hash).toBe('#serie');
});
it.each(['access_token', 'id_token', 'token', 'refresh_token', 'key', 'error'])(
  'descarta fragmento de protocolo com %s',
  (key) => {
    const url = new URL(
      `https://site.example/painel#${key}=discard&other=discard`,
    );
    clearProtocolParameters(url);
    expect(url.hash).toBe('');
    expect(destinoInterno(`/painel?${key}=discard#${key}=discard`)).toBe(
      '/painel',
    );
  },
);
it('não transforma um destino externo em interno para remover parâmetros', () => {
  expect(destinoInterno('https://foreign.example/painel?code=discard')).toBe(
    '/',
  );
});

it('remove pares de protocolo codificados, preserva âncora literal e tolera escape inválido', () => {
  for (const hash of ['#access_token%3Ddiscard', '#CSRF_TOKEN=discard']) {
    const url = new URL('https://site.example/painel' + hash);
    clearProtocolParameters(url);
    expect(url.hash).toBe('');
  }
  for (const hash of ['#code', '#secao%ZZ']) {
    const url = new URL('https://site.example/painel' + hash);
    clearProtocolParameters(url);
    expect(url.hash).toBe(hash);
  }
});
