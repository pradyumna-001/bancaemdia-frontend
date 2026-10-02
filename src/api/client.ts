import createClient, { type Client } from 'openapi-fetch';
import { getConfig, type AppConfig } from '../lib/config';
import { ApiError, httpError } from './error';
import {
  IDEMPOTENT_OPERATIONS,
  UPLOAD_OPERATIONS,
} from './operations.generated';
import type { paths } from './schema';
import type { RequestContext } from '../auth/session';

export const API_TIMEOUTS = Object.freeze({
  read: 10_000,
  write: 15_000,
  upload: 60_000,
});
const idempotent = new Set<string>(IDEMPOTENT_OPERATIONS);
const uploads = new Set<string>(UPLOAD_OPERATIONS);
const reads = new Set(['GET', 'HEAD', 'OPTIONS']);

export interface ApiClientOptions {
  readonly getCsrfToken?: () => string | undefined;
  readonly fetcher?: (request: Request) => Promise<Response>;
  readonly captureSession?: () => RequestContext;
  readonly onUnauthorized?: (error: ApiError) => void;
}

export function createIdempotencyKey(): string {
  // Create once per confirmed intent; keep that same key when reconciling the request.
  return crypto.randomUUID();
}

export function createApiClient(
  config: AppConfig = getConfig(),
  options: ApiClientOptions = {},
) {
  const metadata = new WeakMap<
    Request,
    { operation: string; parseAs: string; context?: RequestContext }
  >();
  const fetcher = options.fetcher ?? globalThis.fetch;

  const transport = async (request: Request): Promise<Response> => {
    const policy = metadata.get(request);
    if (!policy) throw new ApiError('invalid_request');
    const mutation = !reads.has(request.method);
    if (request.signal.aborted) throw new ApiError('cancelled');
    if (policy.context && !policy.context.isCurrent())
      throw new ApiError('cancelled');
    const controller = new AbortController();
    let rejectAbort: (error: ApiError) => void = () => {};
    const aborted = new Promise<never>((_resolve, reject) => {
      rejectAbort = reject;
    });
    const stop = (kind: 'cancelled' | 'timeout') => {
      rejectAbort(new ApiError(kind, { mutation }));
      controller.abort();
    };
    const cancel = () => stop('cancelled');
    request.signal.addEventListener('abort', cancel, { once: true });
    policy.context?.signal.addEventListener('abort', cancel, { once: true });
    const deadline = uploads.has(policy.operation)
      ? API_TIMEOUTS.upload
      : mutation
        ? API_TIMEOUTS.write
        : API_TIMEOUTS.read;
    const timer = setTimeout(() => stop('timeout'), deadline);
    try {
      return await Promise.race([
        aborted,
        (async () => {
          const response = await fetcher(
            new Request(request, { signal: controller.signal }),
          );
          // The deadline includes receiving the body, not only receiving HTTP headers.
          // Current downloads are finite files; streaming is not this client's contract.
          const bytes = await response.arrayBuffer();
          if (policy.context && !policy.context.isCurrent())
            throw new ApiError('cancelled', { mutation });
          const mime = response.headers
            .get('Content-Type')
            ?.split(';')[0]
            ?.trim()
            .toLowerCase();
          const json = mime === 'application/json' || !!mime?.endsWith('+json');
          let body: unknown;
          if (
            json &&
            bytes.byteLength &&
            (policy.parseAs === 'json' || !response.ok)
          ) {
            try {
              body = JSON.parse(
                new TextDecoder().decode(bytes),
                (_key, value: unknown) => {
                  // Refuse loss of integer precision (including BIGINT cents/IDs), rather
                  // than displaying a rounded amount. This does not calculate money.
                  if (
                    typeof value === 'number' &&
                    (!Number.isFinite(value) ||
                      (Number.isInteger(value) && !Number.isSafeInteger(value)))
                  ) {
                    throw new Error('Unsafe JSON number');
                  }
                  return value;
                },
              );
            } catch {
              if (response.ok)
                throw new ApiError('invalid_response', { mutation });
            }
          }
          if (!response.ok) {
            const error = httpError(response, body, mutation);
            if (error.status === 401) options.onUnauthorized?.(error);
            throw error;
          }
          const noBody =
            request.method === 'HEAD' ||
            response.status === 204 ||
            response.status === 205;
          if (
            !noBody &&
            policy.parseAs === 'json' &&
            (!json || !bytes.byteLength)
          ) {
            throw new ApiError('invalid_response', { mutation });
          }
          const buffered = new Response(noBody ? null : bytes, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          });
          Object.defineProperty(buffered, 'url', { value: response.url });
          if (policy.context) {
            // openapi-fetch parses after transport returns; re-check at consumption too.
            for (const method of [
              'json',
              'text',
              'arrayBuffer',
              'blob',
              'formData',
            ] as const) {
              const consume = buffered[method].bind(buffered);
              Object.defineProperty(buffered, method, {
                value: async () => {
                  const result: unknown = await consume();
                  if (!policy.context?.isCurrent())
                    throw new ApiError('cancelled', { mutation });
                  return result;
                },
              });
            }
          }
          return buffered;
        })(),
      ]);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('network', { mutation });
    } finally {
      clearTimeout(timer);
      request.signal.removeEventListener('abort', cancel);
      policy.context?.signal.removeEventListener('abort', cancel);
      metadata.delete(request);
    }
  };

  const client = createClient<paths>({
    baseUrl: config.apiUrl,
    fetch: transport,
    credentials: 'include',
    redirect: 'error',
    cache: 'no-store',
  });
  client.use({
    onRequest({ request, schemaPath, options: requestOptions }) {
      if (
        requestOptions.baseUrl !== config.apiUrl ||
        requestOptions.fetch !== transport ||
        requestOptions.parseAs === 'stream' ||
        request.headers.has('Authorization')
      ) {
        throw new ApiError('invalid_request');
      }
      const operation = `${request.method} ${schemaPath}`;
      const key = request.headers.get('Idempotency-Key');
      if (idempotent.has(operation) ? !key?.trim() : key !== null) {
        throw new ApiError('invalid_request');
      }
      const headers = new Headers(request.headers);
      const context = options.captureSession?.();
      headers.delete('X-CSRF-Token');
      if (!reads.has(request.method)) {
        const csrf = context?.csrfToken ?? options.getCsrfToken?.();
        if (csrf) headers.set('X-CSRF-Token', csrf);
      }
      const protectedRequest = new Request(request, {
        headers,
        credentials: 'include',
        redirect: 'error',
        cache: 'no-store',
      });
      metadata.set(protectedRequest, {
        operation,
        parseAs: requestOptions.parseAs,
        context,
      });
      return protectedRequest;
    },
  });
  // Preserve openapi-fetch inference; domain response shapes come only from schema.d.ts.
  return client;
}

let appClient: Client<paths> | undefined;
export function initializeApiClient(
  options: ApiClientOptions = {},
): Client<paths> {
  if (appClient) throw new ApiError('invalid_request');
  return (appClient = createApiClient(getConfig(), options));
}
export function getApiClient(): Client<paths> {
  return appClient ?? initializeApiClient();
}
