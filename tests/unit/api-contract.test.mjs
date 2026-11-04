// @vitest-environment node
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import {
  contractSource,
  operationPolicies,
  paginationPolicies,
  verifiedSchema,
  requireIntegratedContract,
  bancaemdiaPolicies,
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

const policy = (overrides = {}) => ({
  access_modes: ['FULL_WRITE'],
  automatic_retry: { allowed: false, max_attempts: null },
  idempotency: {
    identity: 'path:intencao_id',
    recovery: 'GET /api/v1/apostas-manuais/operacoes/{intencao_id}',
    retention: 'until_account_deletion',
  },
  ...overrides,
});
const manual = (post, get = policy({ access_modes: ['READ_ONLY'] })) => ({
  paths: {
    '/api/v1/apostas-manuais/operacoes/{intencao_id}': {
      post: { 'x-bancaemdia-policy': post },
      get: { 'x-bancaemdia-policy': get },
    },
  },
});

it('política por operação vem de x-bancaemdia-policy, com identidade e recuperação', () => {
  expect(bancaemdiaPolicies(manual(policy()))).toEqual({
    'POST /api/v1/apostas-manuais/operacoes/{intencao_id}': policy(),
    'GET /api/v1/apostas-manuais/operacoes/{intencao_id}': policy({
      access_modes: ['READ_ONLY'],
    }),
  });
  // Recovery reads take the key header without it being their own identity.
  const lookup = policy({
    access_modes: ['READ_ONLY', 'FULL_WRITE'],
    automatic_retry: { allowed: true, max_attempts: 3 },
    idempotency: { identity: 'none', recovery: null, retention: null },
  });
  expect(
    bancaemdiaPolicies({
      paths: {
        '/api/v1/bancas/intencao': {
          get: {
            parameters: [{ in: 'header', name: 'Idempotency-Key' }],
            'x-bancaemdia-policy': lookup,
          },
        },
      },
    })['GET /api/v1/bancas/intencao'].access_modes,
  ).toEqual(['FULL_WRITE', 'READ_ONLY']);
  const replay = policy({
    idempotency: {
      identity: 'header:Idempotency-Key',
      recovery: 'replay',
      retention: 'until_account_deletion',
    },
  });
  expect(
    bancaemdiaPolicies({
      paths: {
        '/api/v1/caixa': {
          post: {
            parameters: [{ in: 'header', name: 'Idempotency-Key' }],
            'x-bancaemdia-policy': replay,
          },
        },
      },
    })['POST /api/v1/caixa'].idempotency.recovery,
  ).toBe('replay');
});

it('operação sem política ou com política inválida falha fechada', () => {
  expect(() =>
    bancaemdiaPolicies({ paths: { '/x': { get: { responses: {} } } } }),
  ).toThrow('Política de operação ausente ou inválida: GET /x.');
  for (const bad of [
    policy({ access_modes: [] }),
    policy({ access_modes: ['ADMIN'] }),
    policy({ automatic_retry: { allowed: 'sim', max_attempts: null } }),
    policy({ automatic_retry: { allowed: true, max_attempts: 0 } }),
    policy({
      idempotency: { identity: 'cookie:x', recovery: null, retention: null },
    }),
    // Path identity must name a parameter of the same path.
    policy({
      idempotency: { identity: 'path:outro', recovery: null, retention: null },
    }),
    // Header identity requires the published header.
    policy({
      idempotency: {
        identity: 'header:Idempotency-Key',
        recovery: null,
        retention: null,
      },
    }),
    policy({
      idempotency: {
        identity: 'path:intencao_id',
        recovery: 'refazer',
        retention: null,
      },
    }),
  ])
    expect(() => bancaemdiaPolicies(manual(bad))).toThrow(
      'Política de operação ausente ou inválida',
    );
});

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
it('referência versionada usa somente o snapshot oficial imutável, com estado explícito', async () => {
  const actual = JSON.parse(await readFile('config/api-contract.json', 'utf8'));
  expect(contractSource(actual)).toMatch(
    /raw\.githubusercontent\.com\/pradyumna-001\/bancaemdia-api\/[a-f0-9]{40}\/tests\/contract\/schemas\/openapi\.json$/,
  );
});
it('candidato autenticado não se passa por contrato integrado nem pode publicar', () => {
  const candidate = {
    ...pin,
    availability: {
      kind: 'pull_request',
      url: 'https://github.com/pradyumna-001/bancaemdia-api/pull/184',
      integratedBaseline: 'b'.repeat(40),
    },
  };
  expect(contractSource(candidate)).toContain(pin.commit);
  expect(() => requireIntegratedContract(candidate)).toThrow('merge backend');
  expect(() => requireIntegratedContract(pin)).not.toThrow();
  for (const availability of [
    { ...candidate.availability, url: 'https://example.org/184' },
    { ...candidate.availability, integratedBaseline: 'main' },
    { ...candidate.availability, kind: 'integrated' },
  ])
    expect(() => contractSource({ ...pin, availability })).toThrow('candidato');
});
it('reconciliação usa uma árvore imutável da API e mantém o bloqueio de publicação', () => {
  const availability = {
    kind: 'sandbox_reconciliation',
    url: `https://github.com/${pin.repository}/tree/${pin.commit}`,
    integratedBaseline: 'b'.repeat(40),
    sources: [
      { pullRequest: 189, commit: 'c'.repeat(40) },
      { pullRequest: 193, commit: 'd'.repeat(40) },
    ],
  };
  expect(contractSource({ ...pin, availability })).toContain(pin.commit);
  expect(() => requireIntegratedContract({ ...pin, availability })).toThrow(
    'merge backend',
  );
  for (const changes of [
    { url: `https://github.com/${pin.repository}/tree/main` },
    { sources: [{ pullRequest: 193, commit: 'main' }] },
    { sources: [availability.sources[0], availability.sources[0]] },
    {
      sources: [
        { pullRequest: -1, commit: 'c'.repeat(40) },
        availability.sources[1],
      ],
    },
    { sources: undefined },
    { integratedBaseline: 'main' },
  ])
    expect(() =>
      contractSource({ ...pin, availability: { ...availability, ...changes } }),
    ).toThrow('candidato');
});
