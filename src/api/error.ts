export type ApiErrorKind =
  | 'http'
  | 'network'
  | 'timeout'
  | 'cancelled'
  | 'invalid_response'
  | 'invalid_request';

const messages: Record<ApiErrorKind, string> = {
  http: 'Não foi possível concluir o pedido. Tente novamente.',
  network: 'Não foi possível conectar. Confira sua conexão e tente novamente.',
  timeout:
    'O pedido demorou mais que o esperado. Confira o resultado antes de tentar novamente.',
  cancelled: 'A espera pelo pedido foi interrompida.',
  invalid_response:
    'Não foi possível ler a resposta do serviço. Tente novamente.',
  invalid_request: 'Não foi possível preparar o pedido. Tente novamente.',
};

const httpMessages: Record<number, string> = {
  400: 'Confira os dados do pedido e tente novamente.',
  401: 'Entre novamente para continuar.',
  402: 'Sua conta está disponível para consulta. Confira sua assinatura para voltar a alterar dados.',
  403: 'Não foi possível autorizar este pedido.',
  404: 'Não encontramos o que você procurou.',
  405: 'Esta ação não está disponível.',
  409: 'Os dados mudaram ou este pedido já foi utilizado. Confira o resultado antes de continuar.',
  413: 'O arquivo ou pedido ultrapassa o tamanho permitido.',
  422: 'Confira os dados informados e tente novamente.',
  429: 'Muitas tentativas. Aguarde para tentar novamente.',
  500: 'O serviço encontrou um problema. Tente novamente mais tarde.',
  503: 'O serviço está temporariamente indisponível. Aguarde para tentar novamente.',
};

// Codes are protocol identifiers, never provider messages or arbitrary response text.
const knownCodes = new Set([
  'account_read_only',
  'access_expired',
  'not_authenticated',
  'session_expired',
  'session_revoked',
  'account_inactive',
  'identity_rejected',
  'email_unconfirmed',
  'csrf_failed',
  'origin_not_allowed',
  'refresh_reused',
  'identity_conflict',
  'identity_not_configured',
  'issuer_unavailable',
  'invalid_destination',
  'invalid_flow',
]);

export function retryAfterMs(
  value: string | null,
  now = Date.now(),
): number | undefined {
  if (!value?.trim()) return undefined;
  const raw = value.trim();
  if (/^\d+$/.test(raw)) {
    const seconds = Number(raw);
    return Number.isSafeInteger(seconds) &&
      seconds <= Number.MAX_SAFE_INTEGER / 1000
      ? seconds * 1000
      : undefined;
  }
  // Date.parse also accepts bare numbers and informal dates; those aren't HTTP dates.
  if (!/^(?:[A-Za-z]{3}, |[A-Za-z]+, |[A-Za-z]{3} )/.test(raw))
    return undefined;
  const date = Date.parse(raw);
  return Number.isFinite(date) ? Math.max(0, date - now) : undefined;
}

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export class ApiError extends Error {
  readonly name = 'ApiError';
  readonly status: number;
  readonly code?: string;
  readonly retryAfterMs?: number;
  readonly requestId?: string;
  readonly outcomeUnknown: boolean;

  constructor(
    readonly kind: ApiErrorKind,
    options: {
      status?: number;
      code?: string;
      headers?: Headers;
      mutation?: boolean;
    } = {},
  ) {
    super(
      options.status
        ? (httpMessages[options.status] ?? messages.http)
        : messages[kind],
    );
    this.status = options.status ?? 0;
    this.code =
      options.code && knownCodes.has(options.code) ? options.code : undefined;
    this.retryAfterMs = retryAfterMs(
      options.headers?.get('Retry-After') ?? null,
    );
    const id = options.headers?.get('X-Request-Id');
    this.requestId = id && /^[A-Za-z0-9._:-]{1,128}$/.test(id) ? id : undefined;
    this.outcomeUnknown =
      !!options.mutation &&
      (['network', 'timeout', 'cancelled', 'invalid_response'].includes(kind) ||
        (kind === 'http' && this.status >= 500));
  }
}

export function httpError(
  response: Response,
  body: unknown,
  mutation: boolean,
): ApiError {
  const value = record(body);
  const candidate =
    response.headers.get('X-Auth-Error') ??
    value?.code ??
    record(value?.detail)?.code;
  return new ApiError('http', {
    status: response.status,
    headers: response.headers,
    code: typeof candidate === 'string' ? candidate : undefined,
    mutation,
  });
}
