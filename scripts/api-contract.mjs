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
  if (
    pin.availability &&
    (pin.availability.kind !== 'pull_request' ||
      !/^https:\/\/github\.com\/pradyumna-001\/bancaemdia-api\/pull\/[1-9][0-9]*$/.test(
        pin.availability.url ?? '',
      ) ||
      !/^[a-f0-9]{40}$/.test(pin.availability.integratedBaseline ?? ''))
  )
    throw new Error(
      'Contrato candidato exige PR e baseline integrado imutáveis.',
    );
  return `https://raw.githubusercontent.com/${pin.repository}/${pin.commit}/${pin.schemaPath}`;
}

export function requireIntegratedContract(pin) {
  contractSource(pin);
  if (pin.availability?.kind === 'pull_request')
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
