// Test setup only. Runs on a same-origin JSON document before the cold navigation.
// No response, CSRF proof or identity leaves this browser context.
export async function prepareMeasurementSession() {
  try {
    return await navigator.locks.request('bancaemdia:identity', async () => {
      const options = {
        credentials: 'same-origin',
        cache: 'no-store',
        redirect: 'error',
        signal: AbortSignal.timeout(10_000),
      };
      const response = await fetch('/auth/session', options);
      if (response.status !== 200) throw new Error();
      const previous = await response.json();
      if (
        typeof previous.csrf_token !== 'string' ||
        !previous.csrf_token ||
        typeof previous.session_version !== 'string'
      )
        throw new Error();
      // The identity fixture deliberately issues 30-second access tokens. Renew
      // once in setup, without extending their lifetime or retrying a sample.
      const refreshed = await fetch('/auth/refresh', {
        ...options,
        method: 'POST',
        headers: { 'X-CSRF-Token': previous.csrf_token },
      });
      if (refreshed.status !== 200) throw new Error();
      const next = await refreshed.json();
      if (
        next.usuario_id !== previous.usuario_id ||
        typeof next.session_version !== 'string' ||
        next.session_version.split(':')[0] !==
          previous.session_version.split(':')[0] ||
        next.session_version === previous.session_version ||
        next.refresh_required !== false
      )
        throw new Error();
      return true;
    });
  } catch {
    // JSON/URL/transport exceptions can include private input; discard causes.
    throw new Error('MEASUREMENT_SESSION_SETUP_FAILED');
  }
}
