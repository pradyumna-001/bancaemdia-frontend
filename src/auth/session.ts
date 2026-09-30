import type { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/error';
import { createIdentityTransport, type SessionContext } from './protocol';
import { loginDestination } from './returnDestination';

export type AuthState = Readonly<{
  phase: 'checking' | 'anonymous' | 'authenticated' | 'ending' | 'error';
  person?: SessionContext['person'];
  privateEpoch: number;
  error?: ApiError;
  logoutUnconfirmed?: boolean;
}>;
export type RequestContext = Readonly<{
  signal: AbortSignal;
  csrfToken?: string;
  isCurrent: () => boolean;
}>;
type Transport = ReturnType<typeof createIdentityTransport>;
type Exclusive = <T>(signal: AbortSignal, work: () => Promise<T>) => Promise<T>;
export function browserExclusive(): Exclusive | undefined {
  if (!globalThis.navigator?.locks) return undefined;
  return async (signal, work) =>
    await navigator.locks.request(
      'bancaemdia:identity',
      { mode: 'exclusive', signal },
      work,
    );
}
type Change = 'changed' | 'ending' | 'ended' | 'logout_failed';
type Channel = {
  postMessage: (message: Change) => void;
  addEventListener: (
    type: 'message',
    listener: (event: MessageEvent) => void,
  ) => void;
  removeEventListener: (
    type: 'message',
    listener: (event: MessageEvent) => void,
  ) => void;
  close: () => void;
};

export function createSession(options: {
  baseUrl: string;
  queryClient: QueryClient;
  transport?: Transport;
  exclusive?: Exclusive;
  channel?: Channel;
  navigate?: (url: string) => void;
  storage?: Storage;
}) {
  const transport =
    options.transport ?? createIdentityTransport(options.baseUrl);
  let context: SessionContext | undefined;
  let state: AuthState = Object.freeze({ phase: 'checking', privateEpoch: 0 });
  let requests = new AbortController();
  let controls = new AbortController();
  let generation = 0;
  let inFlight: Promise<boolean> | undefined;
  let ending = false;
  let remoteEnding = false;
  let disposed = false;
  let retryAt = 0;
  let logoutPerson: number | undefined;
  const listeners = new Set<() => void>();
  const cleanups = new Set<() => void>();
  const publish = (next: AuthState) => {
    state = Object.freeze(next);
    listeners.forEach((listener) => listener());
  };
  const fence = () => {
    requests.abort();
    requests = new AbortController();
    void options.queryClient.cancelQueries();
  };
  const clearPrivate = () => {
    fence();
    options.queryClient.clear();
    cleanups.forEach((cleanup) => cleanup());
    return state.privateEpoch + 1;
  };
  const invalidate = () => {
    generation++;
    controls.abort();
    controls = new AbortController();
    inFlight = undefined;
    context = undefined;
    const privateEpoch = clearPrivate();
    publish({ phase: 'anonymous', privateEpoch });
  };
  const setContext = (next: SessionContext) => {
    const changed =
      context?.person.id !== next.person.id ||
      context?.version.split(':')[0] !== next.version.split(':')[0];
    const privateEpoch = changed ? clearPrivate() : state.privateEpoch;
    if (!changed && context?.version !== next.version) fence();
    context = next;
    publish({ phase: 'authenticated', privateEpoch, person: next.person });
    if (changed) options.channel?.postMessage('changed');
  };
  const failure = (error: unknown, mine: number) => {
    if (mine !== generation || disposed) return;
    const safe = error instanceof ApiError ? error : new ApiError('network');
    if (safe.status === 401) {
      invalidate();
      options.channel?.postMessage('ended');
      return;
    }
    retryAt = Date.now() + (safe.retryAfterMs ?? 0);
    publish({
      ...state,
      phase: state.person ? 'error' : 'anonymous',
      error: safe,
    });
  };
  const resume = (): Promise<boolean> => {
    if (disposed || ending || remoteEnding || state.logoutUnconfirmed)
      return Promise.resolve(false);
    if (inFlight) return inFlight;
    if (Date.now() < retryAt) return Promise.resolve(false);
    const mine = generation;
    const signal = controls.signal;
    fence();
    publish({ ...state, phase: 'checking', error: undefined });
    const work = async () => {
      let next = await transport.read(signal);
      if (mine !== generation || signal.aborted)
        throw new ApiError('cancelled');
      if (next.needsRenewal) {
        if (!options.exclusive) throw new ApiError('invalid_request');
        const previous = next;
        next = await transport.renew(signal, next.proof);
        if (
          next.person.id !== previous.person.id ||
          next.version.split(':')[0] !== previous.version.split(':')[0] ||
          next.version === previous.version ||
          next.needsRenewal
        )
          throw new ApiError('invalid_response');
        options.channel?.postMessage('changed');
      }
      if (mine !== generation || signal.aborted)
        throw new ApiError('cancelled');
      setContext(next);
      return true;
    };
    const operation = options.exclusive
      ? options.exclusive(signal, work)
      : work();
    const promise = operation
      .catch((error: unknown) => {
        failure(error, mine);
        return false;
      })
      .finally(() => {
        if (inFlight === promise) inFlight = undefined;
      });
    inFlight = promise;
    return promise;
  };
  const capture = (): RequestContext => {
    if (disposed || state.phase !== 'authenticated' || !context)
      throw new ApiError('http', { status: 401 });
    const signal = requests.signal;
    const version = context.version;
    return {
      signal,
      csrfToken: context.proof,
      isCurrent: () =>
        !signal.aborted &&
        context?.version === version &&
        state.phase === 'authenticated',
    };
  };
  const unauthorized = (error: ApiError) => {
    if (error.status === 401 && error.code !== 'access_expired') {
      invalidate();
      options.channel?.postMessage('ended');
    }
  };
  const read = async <T>(operation: () => Promise<T>): Promise<T> => {
    const initial = context;
    const initialScope = capture();
    try {
      const result = await operation();
      if (!initialScope.isCurrent()) throw new ApiError('cancelled');
      return result;
    } catch (error) {
      if (
        !(error instanceof ApiError) ||
        error.status !== 401 ||
        error.code !== 'access_expired' ||
        !initial
      )
        throw error;
      if (
        !(await resume()) ||
        context?.person.id !== initial.person.id ||
        context?.version.split(':')[0] !== initial.version.split(':')[0]
      )
        throw error;
      const renewedScope = capture();
      const result = await operation(); // A single explicit recovery of a safe read; never a write.
      if (!renewedScope.isCurrent()) throw new ApiError('cancelled');
      return result;
    }
  };
  const logout = async (all = false): Promise<boolean> => {
    if (disposed || ending) return false;
    logoutPerson ??= context?.person.id;
    if (!logoutPerson) return false;
    const expected = logoutPerson;
    remoteEnding = false;
    invalidate();
    ending = true;
    publish({ phase: 'ending', privateEpoch: state.privateEpoch });
    options.channel?.postMessage('ending');
    const signal = controls.signal;
    try {
      if (!options.exclusive) throw new ApiError('invalid_request');
      await options.exclusive(signal, async () => {
        let current: SessionContext;
        try {
          current = await transport.read(signal);
        } catch (error) {
          if (error instanceof ApiError && error.status === 401) return;
          throw error;
        }
        if (current.person.id !== expected)
          throw new ApiError('invalid_request');
        await transport.logout(signal, current.proof, all);
      });
      logoutPerson = undefined;
      publish({ phase: 'anonymous', privateEpoch: state.privateEpoch });
      options.channel?.postMessage('ended');
      return true;
    } catch (error) {
      const safe =
        error instanceof ApiError
          ? error
          : new ApiError('network', { mutation: true });
      publish({
        phase: 'error',
        privateEpoch: state.privateEpoch,
        error: safe,
        logoutUnconfirmed: true,
      });
      options.channel?.postMessage('logout_failed');
      return false;
    } finally {
      ending = false;
    }
  };
  const onMessage = (event: MessageEvent) => {
    if (disposed || ending) return;
    if (event.data === 'ending') {
      logoutPerson ??= context?.person.id;
      invalidate();
      remoteEnding = true;
      publish({
        phase: 'ending',
        privateEpoch: state.privateEpoch,
        logoutUnconfirmed: true,
      });
    } else if (event.data === 'ended') {
      remoteEnding = false;
      logoutPerson = undefined;
      invalidate();
    } else if (event.data === 'logout_failed') {
      remoteEnding = false;
      publish({
        phase: 'error',
        privateEpoch: state.privateEpoch,
        error: new ApiError('network', { mutation: true }),
        logoutUnconfirmed: true,
      });
    } else if (event.data === 'changed') {
      fence();
      void resume();
    }
  };
  options.channel?.addEventListener('message', onMessage);
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    resume,
    capture,
    read,
    unauthorized,
    logout,
    registerCleanup: (cleanup: () => void) => {
      cleanups.add(cleanup);
      return () => {
        cleanups.delete(cleanup);
      };
    },
    login: (
      destination: string,
      intent: 'login' | 'signup' | 'recover' = 'login',
    ) => {
      const returnTo = loginDestination(destination, options.storage);
      invalidate();
      options.channel?.postMessage('changed');
      const url = new URL('/auth/start', options.baseUrl);
      url.searchParams.set('return_to', returnTo);
      url.searchParams.set('intent', intent);
      (options.navigate ?? ((target) => location.assign(target)))(url.href);
    },
    dispose: () => {
      disposed = true;
      invalidate();
      options.channel?.removeEventListener('message', onMessage);
      options.channel?.close();
      listeners.clear();
      cleanups.clear();
    },
  };
}
export type SessionService = ReturnType<typeof createSession>;
