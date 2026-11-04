import { createHash } from 'node:crypto';

export function contractSource(pin) {
  if (
    pin.repository !== 'pradyumna-001/bancaemdia-api' ||
    !/^[a-f0-9]{40}$/.test(pin.commit ?? '') ||
    pin.schemaPath !== 'tests/contract/schemas/openapi.json' ||
    !/^[a-f0-9]{64}$/.test(pin.sha256 ?? '')
  )
    throw new Error(
      'A referência OpenAPI deve fixar repositório, commit completo e SHA-256.',
    );
  const availability = pin.availability;
  const reviewedPullRequest =
    availability?.kind === 'pull_request' &&
    /^https:\/\/github\.com\/pradyumna-001\/bancaemdia-api\/pull\/[1-9][0-9]*$/.test(
      availability.url ?? '',
    );
  const reconciliation =
    availability?.kind === 'sandbox_reconciliation' &&
    availability.url ===
      `https://github.com/${pin.repository}/tree/${pin.commit}` &&
    Array.isArray(availability.sources) &&
    availability.sources.length >= 2 &&
    availability.sources.every(
      (source) =>
        Number.isSafeInteger(source.pullRequest) &&
        source.pullRequest > 0 &&
        /^[a-f0-9]{40}$/.test(source.commit ?? ''),
    ) &&
    new Set(availability.sources.map((source) => source.pullRequest)).size ===
      availability.sources.length;
  if (
    availability &&
    ((!reviewedPullRequest && !reconciliation) ||
      !/^[a-f0-9]{40}$/.test(availability.integratedBaseline ?? ''))
  )
    throw new Error(
      'Contrato candidato exige origem revisável e baseline integrado imutáveis.',
    );
  return `https://raw.githubusercontent.com/${pin.repository}/${pin.commit}/${pin.schemaPath}`;
}

export function requireIntegratedContract(pin) {
  contractSource(pin);
  if (pin.availability)
    throw new Error(
      'O contrato depende de merge backend. Reconcile o pin integrado antes de publicar.',
    );
}

export function verifiedSchema(pin, bytes) {
  contractSource(pin);
  if (createHash('sha256').update(bytes).digest('hex') !== pin.sha256) {
    throw new Error(
      'O OpenAPI diverge do SHA-256 aprovado. Nenhum tipo foi atualizado.',
    );
  }
  const schema = JSON.parse(bytes.toString('utf8'));
  if (
    !schema.openapi?.startsWith('3.') ||
    !schema.paths ||
    typeof schema.paths !== 'object'
  ) {
    throw new Error('A referência não contém um contrato OpenAPI 3 válido.');
  }
  return schema;
}

export function operationPolicies(schema) {
  const idempotent = [];
  const uploads = [];
  for (const [path, item] of Object.entries(schema.paths)) {
    for (const method of [
      'get',
      'post',
      'put',
      'patch',
      'delete',
      'head',
      'options',
    ]) {
      const operation = item[method];
      if (!operation) continue;
      const key = `${method.toUpperCase()} ${path}`;
      if (
        [...(item.parameters ?? []), ...(operation.parameters ?? [])].some(
          (p) =>
            p.in === 'header' && p.name.toLowerCase() === 'idempotency-key',
        )
      )
        idempotent.push(key);
      if (operation.requestBody?.content?.['multipart/form-data'])
        uploads.push(key);
    }
  }
  return { idempotent, uploads };
}

export function paginationPolicies(schema) {
  const policies = {};
  for (const [path, item] of Object.entries(schema.paths)) {
    if (!item.get) continue;
    const parameters = [
      ...(item.parameters ?? []),
      ...(item.get.parameters ?? []),
    ];
    const rule = {};
    for (const name of ['page', 'page_size']) {
      const parameter = parameters.find(
        (p) => p.in === 'query' && p.name === name,
      );
      const value = parameter?.schema;
      if (value?.type !== 'integer' || !Number.isSafeInteger(value.default))
        continue;
      rule[name] = {
        default: value.default,
        minimum: value.minimum ?? 1,
        ...(value.maximum === undefined
          ? {}
          : { maximum: Math.min(value.maximum, Number.MAX_SAFE_INTEGER) }),
      };
    }
    if (rule.page && rule.page_size) policies[`GET ${path}`] = rule;
  }
  return policies;
}

const MODES = new Set(['FULL_WRITE', 'READ_ONLY']);
const IDENTITY = /^(none|header:Idempotency-Key|(path|body):[a-z_]+)$/;

// x-bancaemdia-policy is the single machine-readable policy of every operation
// (API #217): access modes, automatic retry and idempotency identity/recovery.
export function bancaemdiaPolicies(schema) {
  const policies = {};
  for (const [path, item] of Object.entries(schema.paths)) {
    for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
      const operation = item[method];
      if (!operation) continue;
      const key = `${method.toUpperCase()} ${path}`;
      const policy = operation['x-bancaemdia-policy'];
      const modes = policy?.access_modes;
      const retry = policy?.automatic_retry;
      const idempotency = policy?.idempotency;
      const header = [
        ...(item.parameters ?? []),
        ...(operation.parameters ?? []),
      ].some(
        (p) => p.in === 'header' && p.name.toLowerCase() === 'idempotency-key',
      );
      if (
        !Array.isArray(modes) ||
        !modes.length ||
        !modes.every((mode) => MODES.has(mode)) ||
        typeof retry?.allowed !== 'boolean' ||
        !(
          retry.max_attempts === null ||
          (Number.isSafeInteger(retry.max_attempts) && retry.max_attempts > 0)
        ) ||
        !IDENTITY.test(idempotency?.identity ?? '') ||
        // Recovery reads also take the key header to find an intention.
        (idempotency.identity === 'header:Idempotency-Key' && !header) ||
        (idempotency.identity.startsWith('path:') &&
          !path.includes(`{${idempotency.identity.slice(5)}}`)) ||
        !(
          idempotency.recovery === null ||
          // Same request, same key: the server deduplicates (never automatic here).
          idempotency.recovery === 'replay' ||
          /^(GET|POST|PUT|PATCH|DELETE) \/\S+$/.test(idempotency.recovery)
        ) ||
        !(
          idempotency.retention === null ||
          typeof idempotency.retention === 'string'
        )
      )
        throw new Error(`Política de operação ausente ou inválida: ${key}.`);
      policies[key] = {
        access_modes: [...modes].sort(),
        automatic_retry: {
          allowed: retry.allowed,
          max_attempts: retry.max_attempts,
        },
        idempotency: {
          identity: idempotency.identity,
          recovery: idempotency.recovery,
          retention: idempotency.retention,
        },
      };
    }
  }
  return policies;
}
