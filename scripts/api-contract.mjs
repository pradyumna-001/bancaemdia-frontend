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
  return `https://raw.githubusercontent.com/${pin.repository}/${pin.commit}/${pin.schemaPath}`;
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
