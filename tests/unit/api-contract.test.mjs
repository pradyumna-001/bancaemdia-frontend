// @vitest-environment node
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import {
  contractSource,
  operationPolicies,
  paginationPolicies,
  verifiedSchema,
} from '../../scripts/api-contract.mjs';

const bytes = Buffer.from(
  JSON.stringify({
    openapi: '3.1.0',
    paths: {
      '/example': {
        parameters: [{ in: 'header', name: 'Idempotency-Key' }],
        post: { requestBody: { content: { 'multipart/form-data': {} } } },
        get: {},
      },
    },
  }),
);
const pin = {
  repository: 'pradyumna-001/bancaemdia-api',
  commit: 'a'.repeat(40),
  schemaPath: 'tests/contract/schemas/openapi.json',
  sha256: createHash('sha256').update(bytes).digest('hex'),
};

it('só aceita commit completo, caminho e SHA-256 fixados', () => {
  expect(contractSource(pin)).toContain('/' + pin.commit + '/');
  for (const changes of [
    { commit: 'main' },
    { commit: 'latest' },
    { repository: 'another/repo' },
    { schemaPath: '../other.json' },
    { sha256: '' },
  ]) {
    expect(() => contractSource({ ...pin, ...changes })).toThrow();
  }
});
it('limites de paginação vêm do snapshot e respeitam a precisão do runtime', () => {
  expect(
    paginationPolicies({
      paths: {
        '/example': {
          get: {
            parameters: [
              {
                in: 'query',
                name: 'page',
                schema: { type: 'integer', default: 1, maximum: 1e20 },
              },
              {
                in: 'query',
                name: 'page_size',
                schema: {
                  type: 'integer',
                  default: 50,
                  minimum: 1,
                  maximum: 100,
                },
              },
            ],
          },
        },
        '/not-paged': { get: {} },
        '/write': { post: {} },
      },
    }),
  ).toEqual({
    'GET /example': {
      page: { default: 1, minimum: 1, maximum: Number.MAX_SAFE_INTEGER },
      page_size: { default: 50, minimum: 1, maximum: 100 },
    },
  });
});
it('não gera contrato quando bytes mudam sob a mesma referência', () => {
  expect(verifiedSchema(pin, bytes).openapi).toBe('3.1.0');
  expect(() => verifiedSchema(pin, Buffer.from('changed'))).toThrow('SHA-256');
});
it('recusa referência que não é OpenAPI mesmo com hash válido', () => {
  const invalid = Buffer.from('{}');
  expect(() =>
    verifiedSchema(
      { ...pin, sha256: createHash('sha256').update(invalid).digest('hex') },
      invalid,
    ),
  ).toThrow('OpenAPI 3');
});
it('deriva políticas de headers e multipart do próprio contrato', () => {
  expect(operationPolicies(verifiedSchema(pin, bytes))).toEqual({
    idempotent: ['GET /example', 'POST /example'],
    uploads: ['POST /example'],
  });
  expect(operationPolicies({ paths: { '/public': { get: {} } } })).toEqual({
    idempotent: [],
    uploads: [],
  });
});
it('referência versionada usa somente o snapshot oficial integrado', async () => {
  const actual = JSON.parse(await readFile('config/api-contract.json', 'utf8'));
  expect(contractSource(actual)).toMatch(
    /raw\.githubusercontent\.com\/pradyumna-001\/bancaemdia-api\/[a-f0-9]{40}\/tests\/contract\/schemas\/openapi\.json$/,
  );
});
