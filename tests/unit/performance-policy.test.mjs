// @vitest-environment node
import { expect, it } from 'vitest';
import {
  ROTAS_AUTH,
  ROTAS_PROTEGIDAS,
  ROTAS_PUBLICAS,
} from '../../src/app/paths';
import {
  API_PIN,
  CATEGORIES,
  PROFILES,
  REPETITIONS,
  ROUTES,
  inspectPerformanceReport,
  parseMeasurementInput,
  referenceThrottling,
} from '../../scripts/performance-policy.mjs';

function measurementInput() {
  return {
    origin: 'http://127.0.0.1:56803',
    apiSha: API_PIN.commit,
    routes: ROUTES.map((route) => ({
      id: route.id,
      path: route.path,
      heading: route.title,
    })),
    cookies: [
      { domain: '127.0.0.1', httpOnly: true, value: 'privado-de-teste' },
    ],
  };
}
it('entrada conserva cookie somente na estrutura em memória e exige o catálogo completo', () => {
  const input = measurementInput();
  const parsed = parseMeasurementInput(JSON.stringify(input));
  expect(parsed.input.cookies).toEqual(input.cookies);
  expect(parsed.origin.origin).toBe(input.origin);
  expect(parsed.routeInputs.size).toBe(ROUTES.length);
  input.routes.push(input.routes[0]);
  expect(() => parseMeasurementInput(JSON.stringify(input))).toThrow(
    'PERFORMANCE_INPUT_INVALID',
  );
});
it('JSON truncado nunca aparece no erro ou em sua causa', () => {
  const raw = JSON.stringify(measurementInput()).slice(0, -1);
  let caught;
  try {
    parseMeasurementInput(raw);
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(Error);
  expect(caught.message).toBe('PERFORMANCE_INPUT_INVALID');
  expect(caught.cause).toBeUndefined();
  expect(caught.stack).not.toContain('privado-de-teste');
});
it.each(['url-malformada', 'credencial-na-origem', 'rota-malformada'])(
  'URL privada nunca aparece no erro: %s',
  (failure) => {
    const input = measurementInput();
    if (failure === 'url-malformada') input.origin = 'http://[privado-de-teste';
    if (failure === 'credencial-na-origem')
      input.origin = 'http://privado-de-teste@127.0.0.1';
    if (failure === 'rota-malformada')
      input.routes[0].path = 'http://[privado-de-teste';
    let caught;
    try {
      parseMeasurementInput(JSON.stringify(input));
    } catch (error) {
      caught = error;
    }
    expect(caught.message).toBe('PERFORMANCE_INPUT_INVALID');
    expect(caught.cause).toBeUndefined();
    expect(caught.stack).not.toContain('privado-de-teste');
  },
);

function report(profile = 'mobile') {
  return {
    schema: 1,
    frontendSha: 'a'.repeat(40),
    apiSha: API_PIN.commit,
    apiSchemaSha256: API_PIN.sha256,
    availability: 'sandbox_reconciliation',
    productionAuthorized: false,
    profile,
    repetitions: REPETITIONS,
    environment: {
      node: 'v22.22.0',
      lighthouse: '13.5.0',
      chromium: 'HeadlessChrome/153.0.0.0',
      platform: 'linux',
      arch: 'x64',
      cpuCount: 2,
      viewport: PROFILES[profile],
      throttling: referenceThrottling(profile),
      throttlingMethod: 'simulate',
      cache: 'cleared-before-each-navigation',
    },
    dataset: { bets: 5007, tipsters: 40, markets: 40, days: 90 },
    bundleGzipBytes: 115_380,
    samples: ROUTES.flatMap((route) =>
      Array.from({ length: REPETITIONS }, (_, index) => ({
        route: route.id,
        run: index + 1,
        scores: Object.fromEntries(
          CATEGORIES.map((category) => [category, 95]),
        ),
        lcpMs: 2499.9,
        cls: 0.0999,
        tbtMs: 0,
        proofs: {
          headingVerified: true,
          dataSettled: true,
          authenticated: route.private,
          compressedJs: true,
          routeChunksIsolated: true,
          apiWrites: 0,
        },
      })),
    ),
  };
}

it('catálogo cobre todas as rotas reais, incluindo detalhes, conta e ajuda', () => {
  const expected = new Map([
    ...ROTAS_PROTEGIDAS.map((r) => [r.path, true]),
    ...ROTAS_PUBLICAS.map((r) => [r.path, false]),
    ...ROTAS_AUTH.map((r) => [r.path, r.protected]),
  ]);
  expect(new Map(ROUTES.map((r) => [r.path, r.private]))).toEqual(expected);
  expect(new Set(ROUTES.map((r) => r.id)).size).toBe(expected.size);
  expect(
    ROUTES.every((r) => /^src\/features\/.+Page\.tsx$/.test(r.module)),
  ).toBe(true);
});
it.each(['mobile', 'desktop'])(
  'exige três amostras frias por rota no perfil %s, sem arredondar o score',
  (profile) => {
    const r = report(profile);
    expect(
      inspectPerformanceReport(r, { expectedHead: r.frontendSha }),
    ).toEqual({ samples: ROUTES.length * 3, failed: [], complete: true });
    r.samples[0].scores.performance = 94.999;
    expect(() => inspectPerformanceReport(r)).toThrow('RELEASE_TARGETS');
    expect(
      inspectPerformanceReport(r, { requirePass: false }).failed,
    ).toHaveLength(1);
  },
);
it.each([
  [
    'unrelated route download',
    (r) => {
      r.samples[0].proofs.routeChunksIsolated = false;
    },
  ],
  [
    'LCP',
    (r) => {
      r.samples[0].lcpMs = 2500;
    },
  ],
  [
    'CLS',
    (r) => {
      r.samples[0].cls = 0.1;
    },
  ],
  ...CATEGORIES.map((category) => [
    category,
    (r) => {
      r.samples[0].scores[category] = 94;
    },
  ]),
  [
    'JS',
    (r) => {
      r.bundleGzipBytes = 200_001;
    },
  ],
  [
    'missing',
    (r) => {
      r.samples.pop();
    },
  ],
  [
    'duplicate',
    (r) => {
      r.samples[1] = structuredClone(r.samples[0]);
    },
  ],
  [
    'NaN',
    (r) => {
      r.samples[0].lcpMs = NaN;
    },
  ],
  [
    'missing metric',
    (r) => {
      delete r.samples[0].tbtMs;
    },
  ],
  [
    'small dataset',
    (r) => {
      r.dataset.bets = 4999;
    },
  ],
  [
    'no matrix',
    (r) => {
      r.dataset.tipsters = 1;
    },
  ],
  [
    'warm',
    (r) => {
      r.environment.cache = 'warm';
    },
  ],
  [
    'provided',
    (r) => {
      r.environment.throttlingMethod = 'provided';
    },
  ],
  [
    'fast CPU',
    (r) => {
      r.environment.throttling.cpuSlowdownMultiplier = 1;
    },
  ],
  [
    'wrong viewport',
    (r) => {
      r.environment.viewport = { width: 1440, height: 900 };
    },
  ],
  [
    'old API',
    (r) => {
      r.apiSha = 'b'.repeat(40);
    },
  ],
  [
    'schema drift',
    (r) => {
      r.apiSchemaSha256 = 'b'.repeat(64);
    },
  ],
  [
    'main promoted',
    (r) => {
      r.availability = 'integrated';
    },
  ],
  [
    'published',
    (r) => {
      r.productionAuthorized = true;
    },
  ],
  [
    'heading fallback',
    (r) => {
      r.samples[0].proofs.headingVerified = false;
    },
  ],
  [
    'data not loaded',
    (r) => {
      r.samples[0].proofs.dataSettled = false;
    },
  ],
  [
    'private page anonymous',
    (r) => {
      r.samples.find((s) => s.proofs.authenticated).proofs.authenticated =
        false;
    },
  ],
  [
    'uncompressed',
    (r) => {
      r.samples[0].proofs.compressedJs = false;
    },
  ],
  [
    'write',
    (r) => {
      r.samples[0].proofs.apiWrites = 1;
    },
  ],
  [
    'tool upgrade',
    (r) => {
      r.environment.lighthouse = '14.0.0';
    },
  ],
  [
    'run failed',
    (r) => {
      r.failure = { code: 'MEASUREMENT_FAILED', route: ROUTES[0].id, run: 1 };
    },
  ],
])('recusa aprovação por %s', (_, change) => {
  const r = report();
  change(r);
  expect(() => inspectPerformanceReport(r)).toThrow();
});
it('recusa outro commit mesmo com métricas verdes', () => {
  expect(() =>
    inspectPerformanceReport(report(), { expectedHead: 'b'.repeat(40) }),
  ).toThrow('HEAD_MISMATCH');
});
it.each([
  (r) => {
    r.cookie = 'private-content';
  },
  (r) => {
    r.samples[0].failedAudits = [{ id: 'private-content', score: 0 }];
  },
  (r) => {
    r.environment.url = 'private-content';
  },
  (r) => {
    r.samples[0].scores.dom = 'private-content';
  },
  (r) => {
    r.samples[0].proofs.csrf = 'private-content';
  },
  (r) => {
    r.dataset.email = 'private-content';
  },
  (r) => {
    r.samples[0].httpStatuses = [
      { status: 200, count: 1, url: 'private-content' },
    ];
  },
  (r) => {
    r.samples[0].httpStatuses = [{ status: 'private-content', count: 1 }];
  },
  (r) => {
    r.failure = { code: 'private-content', route: ROUTES[0].id, run: 1 };
  },
])(
  'o gate de publicação recusa conteúdo fora da allowlist também em diagnósticos',
  (change) => {
    const r = report();
    change(r);
    try {
      inspectPerformanceReport(r, { requirePass: false });
      throw new Error('NOT_REJECTED');
    } catch (error) {
      expect(error.message).not.toBe('NOT_REJECTED');
      expect(error.message).not.toContain('private-content');
    }
  },
);
it('diagnóstico HTTP aceita apenas status e contagens numéricas, sem aprovar falhas', () => {
  const r = report();
  r.samples[0].httpStatuses = [
    { status: 200, count: 4 },
    { status: 429, count: 1 },
  ];
  expect(inspectPerformanceReport(r).complete).toBe(true);
  r.samples[0].proofs.dataSettled = false;
  expect(() => inspectPerformanceReport(r)).toThrow('RELEASE_TARGETS');
  r.samples[0].httpStatuses.push({ status: 429, count: 1 });
  expect(() => inspectPerformanceReport(r, { requirePass: false })).toThrow(
    'REPORT_HTTP_INVALID',
  );
});
