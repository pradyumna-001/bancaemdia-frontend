const transient = new Set([
  'code',
  'state',
  'session_state',
  'iss',
  'error',
  'error_description',
  'error_uri',
  'access_token',
  'refresh_token',
  'id_token',
  'token',
  'token_type',
  'expires_in',
  'scope',
  'client_info',
  'key',
  'csrf_token',
  'code_verifier',
  'nonce',
  'password',
  'client_secret',
  'assertion',
]);

// Only protocol fields are removed; ordinary filters and section anchors survive.
export function clearProtocolParameters(url: URL) {
  for (const key of [...url.searchParams.keys()])
    if (transient.has(key.toLowerCase())) url.searchParams.delete(key);
  let value = url.hash.slice(1);
  try {
    value = decodeURIComponent(value);
  } catch {
    /* Keep a malformed section harmless. */
  }
  const fragment = new URLSearchParams(value);
  if (
    value.includes('=') &&
    [...fragment.keys()].some((key) => transient.has(key.toLowerCase()))
  )
    url.hash = '';
}
