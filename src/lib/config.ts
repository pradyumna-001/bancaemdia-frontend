export type AppEnvironment = 'development' | 'staging' | 'production';

export interface AppConfig {
  readonly apiUrl: string;
  readonly appEnv: AppEnvironment;
  readonly uploadPollMs: number;
}

export class ConfigError extends Error {}

const runtimeKeys = ['VITE_API_URL', 'VITE_APP_ENV', 'VITE_UPLOAD_POLL_MS'];
let currentConfig: AppConfig | undefined;

export function parseConfig(
  values: Record<string, unknown>,
  defaultEnvironment: AppEnvironment = 'development',
): AppConfig {
  const apiUrl = values.VITE_API_URL;
  if (typeof apiUrl !== 'string' || apiUrl.trim() === '') {
    throw new ConfigError('Informe a URL da API em VITE_API_URL.');
  }

  let url: URL;
  try {
    url = new URL(apiUrl);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      throw new Error('URL inválida');
    }
  } catch {
    throw new ConfigError(
      'VITE_API_URL deve ser uma URL HTTP ou HTTPS completa, sem credenciais, consulta ou fragmento.',
    );
  }

  const appEnv =
    values.VITE_APP_ENV === undefined
      ? defaultEnvironment
      : values.VITE_APP_ENV;
  if (
    appEnv !== 'development' &&
    appEnv !== 'staging' &&
    appEnv !== 'production'
  ) {
    throw new ConfigError(
      'VITE_APP_ENV deve ser development, staging ou production.',
    );
  }

  const rawPoll =
    values.VITE_UPLOAD_POLL_MS === undefined
      ? 1000
      : values.VITE_UPLOAD_POLL_MS;
  const uploadPollMs =
    typeof rawPoll === 'string' && /^[1-9]\d*$/.test(rawPoll)
      ? Number(rawPoll)
      : rawPoll;
  if (
    typeof uploadPollMs !== 'number' ||
    !Number.isSafeInteger(uploadPollMs) ||
    uploadPollMs <= 0 ||
    uploadPollMs > 2_147_483_647
  ) {
    throw new ConfigError(
      'VITE_UPLOAD_POLL_MS deve ser um inteiro entre 1 e 2147483647 milissegundos.',
    );
  }

  return Object.freeze({
    apiUrl: url.href.replace(/\/+$/, ''),
    appEnv,
    uploadPollMs,
  });
}

async function readRuntimeConfig(
  fetcher: typeof fetch,
): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetcher('/config.json', {
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'error',
      signal: controller.signal,
    });
    if (!response.ok)
      throw new ConfigError(
        'Não foi possível carregar a configuração do site. Tente novamente.',
      );
    if (
      response.headers.get('content-type')?.split(';')[0]?.trim() !==
      'application/json'
    ) {
      throw new ConfigError(
        'A configuração do site deve ser um arquivo JSON válido.',
      );
    }
    const values: unknown = await response.json();
    if (
      typeof values !== 'object' ||
      values === null ||
      Array.isArray(values)
    ) {
      throw new ConfigError('A configuração do site deve ser um objeto JSON.');
    }
    if (Object.keys(values).some((key) => !runtimeKeys.includes(key))) {
      throw new ConfigError(
        'A configuração do site contém campos não reconhecidos.',
      );
    }
    return values as Record<string, unknown>;
  } catch (error) {
    if (error instanceof ConfigError) throw error;
    throw new ConfigError(
      'Não foi possível ler a configuração do site. Confira a conexão e tente novamente.',
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function loadConfig(
  env: Record<string, unknown>,
  production: boolean,
  fetcher: typeof fetch = fetch,
): Promise<AppConfig> {
  const runtime = production ? await readRuntimeConfig(fetcher) : {};
  return parseConfig(
    { ...env, ...runtime },
    production ? 'production' : 'development',
  );
}

export async function initializeConfig(): Promise<void> {
  currentConfig = undefined;
  currentConfig = await loadConfig(import.meta.env, import.meta.env.PROD);
}

// Os clientes da API só podem acessar a configuração após o boot validado.
export function getConfig(): AppConfig {
  if (!currentConfig)
    throw new ConfigError('A configuração ainda não foi carregada.');
  return currentConfig;
}
