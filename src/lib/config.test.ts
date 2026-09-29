import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ConfigError,
  getConfig,
  initializeConfig,
  loadConfig,
  parseConfig,
} from './config';

const minimal = { VITE_API_URL: 'http://127.0.0.1:8000/' };
const json = (value: unknown) =>
  vi.fn<typeof fetch>().mockResolvedValue(Response.json(value));

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe('validação das variáveis públicas', () => {
  it('aceita somente a URL e entrega valores padrão imutáveis', () => {
    const config = parseConfig(minimal);
    expect(config).toEqual({
      apiUrl: 'http://127.0.0.1:8000',
      appEnv: 'development',
      uploadPollMs: 1000,
    });
    expect(Object.isFrozen(config)).toBe(true);
  });

  it.each(['development', 'staging', 'production'])(
    'aceita o ambiente %s',
    (appEnv) => {
      expect(parseConfig({ ...minimal, VITE_APP_ENV: appEnv }).appEnv).toBe(
        appEnv,
      );
    },
  );

  it('preserva o caminho da API e aceita inteiros no JSON e no env', () => {
    expect(
      parseConfig({ VITE_API_URL: 'https://api.example.com/base/' }).apiUrl,
    ).toBe('https://api.example.com/base');
    for (const value of ['1', 1, '2147483647', 2147483647]) {
      expect(
        parseConfig({ ...minimal, VITE_UPLOAD_POLL_MS: value }).uploadPollMs,
      ).toBe(Number(value));
    }
  });

  it.each([
    undefined,
    null,
    '',
    ' ',
    123,
    '/api',
    'localhost:8000',
    'ftp://api.example.com',
    'https://user:secret@api.example.com',
    'https://api.example.com/?token=secret',
    'https://api.example.com/#secret',
  ])('rejeita URL inválida (%s) sem expor seu conteúdo', (value) => {
    expect(() => parseConfig({ VITE_API_URL: value })).toThrow(ConfigError);
    expect(() => parseConfig({ VITE_API_URL: value })).toThrow(/VITE_API_URL/);
    expect(() => parseConfig({ VITE_API_URL: value })).not.toThrow(/secret/);
  });

  it.each(['', 'testing', 'Production', null, false])(
    'rejeita ambiente inválido (%s)',
    (value) => {
      expect(() => parseConfig({ ...minimal, VITE_APP_ENV: value })).toThrow(
        /VITE_APP_ENV/,
      );
    },
  );

  it.each([
    '',
    ' ',
    '0',
    0,
    '-1',
    -1,
    '1.5',
    1.5,
    '1e3',
    '0x10',
    NaN,
    Infinity,
    null,
    true,
    '2147483648',
    2147483648,
  ])('rejeita intervalo inválido (%s)', (value) => {
    expect(() =>
      parseConfig({ ...minimal, VITE_UPLOAD_POLL_MS: value }),
    ).toThrow(/VITE_UPLOAD_POLL_MS/);
  });
});

describe('configuração no boot', () => {
  it('não busca config.json no servidor de desenvolvimento', async () => {
    const fetcher = json({ VITE_API_URL: 'https://runtime.example.com' });
    expect(await loadConfig(minimal, false, fetcher)).toEqual(
      parseConfig(minimal),
    );
    expect(fetcher).not.toHaveBeenCalled();
    await expect(loadConfig({}, false, fetcher)).rejects.toThrow(
      /VITE_API_URL/,
    );
  });

  it('aplica o runtime antes da validação e permite build sem URL', async () => {
    const fetcher = json({
      VITE_API_URL: 'https://runtime.example.com',
      VITE_APP_ENV: 'staging',
      VITE_UPLOAD_POLL_MS: 2500,
    });
    expect(
      await loadConfig({ VITE_APP_ENV: 'inválido' }, true, fetcher),
    ).toEqual({
      apiUrl: 'https://runtime.example.com',
      appEnv: 'staging',
      uploadPollMs: 2500,
    });
    expect(fetcher).toHaveBeenCalledExactlyOnceWith(
      '/config.json',
      expect.objectContaining({
        cache: 'no-store',
        credentials: 'omit',
        redirect: 'error',
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('runtime vazio preserva env e usa production como padrão do build', async () => {
    expect((await loadConfig(minimal, true, json({}))).appEnv).toBe(
      'production',
    );
    expect(
      (
        await loadConfig(
          { ...minimal, VITE_APP_ENV: 'staging' },
          true,
          json({}),
        )
      ).appEnv,
    ).toBe('staging');
    await expect(loadConfig({}, true, json({}))).rejects.toThrow(
      /VITE_API_URL/,
    );
  });

  it.each([
    null,
    [],
    'texto',
    12,
    { secret: 'não deve aparecer' },
    { VITE_API_URL: null },
    { VITE_APP_ENV: null },
  ])('não ignora configuração runtime inválida: %j', async (value) => {
    const fetcher = json(value);
    await expect(loadConfig(minimal, true, fetcher)).rejects.toThrow(
      ConfigError,
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it.each([
    new Response('stack trace', { status: 503 }),
    new Response('<html>fallback</html>', {
      headers: { 'content-type': 'text/html' },
    }),
    new Response('{erro', { headers: { 'content-type': 'application/json' } }),
    new Response('', { status: 404 }),
  ])(
    'falha sem fallback silencioso ou repetição automática',
    async (response) => {
      const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response);
      await expect(loadConfig(minimal, true, fetcher)).rejects.toThrow(
        ConfigError,
      );
      expect(fetcher).toHaveBeenCalledTimes(1);
    },
  );

  it('encerra uma requisição pendente em cinco segundos', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener('abort', () =>
            reject(new Error('detalhe interno')),
          );
        }),
    );
    const result = expect(loadConfig(minimal, true, fetcher)).rejects.toThrow(
      'Não foi possível ler a configuração do site. Confira a conexão e tente novamente.',
    );
    await vi.advanceTimersByTimeAsync(5000);
    await result;
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('expõe configuração somente após inicialização bem-sucedida', async () => {
    expect(() => getConfig()).toThrow(/ainda não foi carregada/);
    vi.stubEnv('PROD', false);
    vi.stubEnv('VITE_API_URL', minimal.VITE_API_URL);
    await initializeConfig();
    expect(getConfig().apiUrl).toBe('http://127.0.0.1:8000');
    vi.stubEnv('VITE_API_URL', '');
    await expect(initializeConfig()).rejects.toThrow(ConfigError);
    expect(() => getConfig()).toThrow(ConfigError);
  });
});
