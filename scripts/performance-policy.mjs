import { readFileSync } from 'node:fs';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
import defaultConfig from 'lighthouse/core/config/default-config.js';

export const ROUTES = JSON.parse(
  readFileSync(
    new URL('../config/performance-routes.json', import.meta.url),
    'utf8',
  ),
);
export const REPETITIONS = 3;
export const PROFILES = {
  mobile: { width: 390, height: 844 },
  desktop: { width: 1440, height: 900 },
};
export const CATEGORIES = ['performance', 'accessibility', 'best-practices'];
export const AUDIT_IDS = new Set(
  defaultConfig.audits.map((entry) =>
    (typeof entry === 'string' ? entry : entry.path)
      .split('/')
      .at(-1)
      .replace(/\.js$/, ''),
  ),
);
export const API_PIN = JSON.parse(
  readFileSync(new URL('../config/api-contract.json', import.meta.url), 'utf8'),
);

const demand = (condition, code) => {
  if (!condition) throw new Error(code);
};
/** Stdin may contain HttpOnly cookies. Parser/URL errors must never echo it. */
export function parseMeasurementInput(serialized) {
  try {
    const input = JSON.parse(serialized);
    const origin = new URL(input.origin);
    demand(
      ['http:', 'https:'].includes(origin.protocol) &&
        origin.hostname === '127.0.0.1' &&
        !origin.username &&
        !origin.password &&
        origin.pathname === '/' &&
        !origin.search &&
        !origin.hash &&
        input.apiSha === API_PIN.commit,
      'INVALID',
    );
    const routeInputs = new Map(input.routes.map((route) => [route.id, route]));
    demand(
      routeInputs.size === ROUTES.length &&
        input.routes.length === ROUTES.length &&
        ROUTES.every((route) => routeInputs.has(route.id)),
      'INVALID',
    );
    for (const route of routeInputs.values()) {
      const url = new URL(route.path, origin);
      demand(
        url.origin === origin.origin &&
          !url.hash &&
          route.path.startsWith('/') &&
          !route.path.startsWith('//') &&
          typeof route.heading === 'string' &&
          !!route.heading,
        'INVALID',
      );
    }
    demand(
      Array.isArray(input.cookies) &&
        input.cookies.length > 0 &&
        input.cookies.every(
          (cookie) => cookie.httpOnly && cookie.domain === '127.0.0.1',
        ),
      'INVALID',
    );
    return { input, origin, routeInputs };
  } catch {
    // Do not attach the original cause: JSON/URL errors can include credentials.
    throw new Error('PERFORMANCE_INPUT_INVALID');
  }
}
const object = (value, required, optional = []) => {
  demand(
    value && typeof value === 'object' && !Array.isArray(value),
    'REPORT_OBJECT_REQUIRED',
  );
  demand(
    required.every((key) => Object.hasOwn(value, key)) &&
      Object.keys(value).every((key) =>
        [...required, ...optional].includes(key),
      ),
    'REPORT_FIELDS_INVALID',
  );
};
const finite = (n, min = 0, max = Number.MAX_SAFE_INTEGER) =>
  Number.isFinite(n) && n >= min && n <= max;

export function referenceThrottling(profile) {
  return {
    ...(profile === 'desktop' ? desktopConfig.settings : defaultConfig.settings)
      .throttling,
  };
}

/** Strict allowlist for public artifacts, separately from numeric acceptance. */
export function inspectPerformanceReport(
  report,
  { requirePass = true, expectedHead } = {},
) {
  object(
    report,
    [
      'schema',
      'frontendSha',
      'apiSha',
      'apiSchemaSha256',
      'availability',
      'productionAuthorized',
      'profile',
      'repetitions',
      'environment',
      'dataset',
      'bundleGzipBytes',
      'samples',
    ],
    ['failure'],
  );
  demand(
    report.schema === 1 && /^[a-f0-9]{40}$/.test(report.frontendSha),
    'REPORT_VERSION_INVALID',
  );
  if (expectedHead)
    demand(report.frontendSha === expectedHead, 'REPORT_HEAD_MISMATCH');
  demand(
    report.apiSha === API_PIN.commit &&
      report.apiSchemaSha256 === API_PIN.sha256,
    'REPORT_API_MISMATCH',
  );
  demand(
    report.availability === 'sandbox_reconciliation' &&
      report.productionAuthorized === false,
    'REPORT_RELEASE_SCOPE_INVALID',
  );
  demand(
    Object.hasOwn(PROFILES, report.profile) &&
      report.repetitions === REPETITIONS,
    'REPORT_PROFILE_INVALID',
  );
  object(report.environment, [
    'node',
    'lighthouse',
    'chromium',
    'platform',
    'arch',
    'cpuCount',
    'viewport',
    'throttling',
    'throttlingMethod',
    'cache',
  ]);
  const env = report.environment;
  demand(
    /^v22\.\d+\.\d+$/.test(env.node) && env.lighthouse === '13.5.0',
    'REPORT_TOOL_VERSION_INVALID',
  );
  demand(
    /^(HeadlessChrome|Chrome)\/\d+\.\d+\.\d+\.\d+$/.test(env.chromium),
    'REPORT_BROWSER_INVALID',
  );
  demand(
    ['win32', 'linux', 'darwin'].includes(env.platform) &&
      ['x64', 'arm64'].includes(env.arch),
    'REPORT_PLATFORM_INVALID',
  );
  demand(
    Number.isInteger(env.cpuCount) && finite(env.cpuCount, 1, 512),
    'REPORT_CPU_INVALID',
  );
  object(env.viewport, ['width', 'height']);
  demand(
    JSON.stringify(env.viewport) === JSON.stringify(PROFILES[report.profile]),
    'REPORT_VIEWPORT_INVALID',
  );
  demand(
    env.throttlingMethod === 'simulate' &&
      env.cache === 'cleared-before-each-navigation',
    'REPORT_MEASUREMENT_PROFILE_INVALID',
  );
  const reference = referenceThrottling(report.profile);
  object(env.throttling, Object.keys(reference));
  demand(
    Object.entries(reference).every(
      ([key, value]) => env.throttling[key] === value,
    ),
    'REPORT_THROTTLING_INVALID',
  );
  object(report.dataset, ['bets', 'tipsters', 'markets', 'days']);
  demand(
    Object.values(report.dataset).every(
      (n) => Number.isInteger(n) && finite(n, 1, 100_000),
    ),
    'REPORT_DATASET_INVALID',
  );
  demand(
    report.dataset.bets >= 5000 &&
      report.dataset.tipsters >= 40 &&
      report.dataset.markets >= 40 &&
      report.dataset.days >= 90,
    'REPORT_DATASET_TOO_SMALL',
  );
  demand(
    Number.isInteger(report.bundleGzipBytes) &&
      finite(report.bundleGzipBytes, 1),
    'REPORT_BUNDLE_INVALID',
  );
  demand(
    Array.isArray(report.samples) &&
      report.samples.length <= ROUTES.length * REPETITIONS,
    'REPORT_SAMPLES_INVALID',
  );
  const identities = new Set();
  const failed = [];
  for (const sample of report.samples) {
    object(
      sample,
      ['route', 'run', 'scores', 'lcpMs', 'cls', 'tbtMs', 'proofs'],
      ['failedAudits', 'httpStatuses'],
    );
    const route = ROUTES.find((r) => r.id === sample.route);
    demand(
      route &&
        Number.isInteger(sample.run) &&
        sample.run >= 1 &&
        sample.run <= REPETITIONS,
      'REPORT_ROUTE_INVALID',
    );
    const identity = sample.route + ':' + sample.run;
    demand(!identities.has(identity), 'REPORT_DUPLICATE_SAMPLE');
    identities.add(identity);
    object(sample.scores, CATEGORIES);
    demand(
      CATEGORIES.every((key) => finite(sample.scores[key], 0, 100)),
      'REPORT_SCORE_INVALID',
    );
    demand(
      finite(sample.lcpMs, 1) && finite(sample.cls) && finite(sample.tbtMs),
      'REPORT_METRIC_INVALID',
    );
    if (sample.failedAudits !== undefined) {
      demand(
        Array.isArray(sample.failedAudits) &&
          sample.failedAudits.length <= AUDIT_IDS.size,
        'REPORT_DIAGNOSTICS_INVALID',
      );
      const seen = new Set();
      for (const audit of sample.failedAudits) {
        object(audit, ['id', 'score']);
        demand(
          AUDIT_IDS.has(audit.id) &&
            !seen.has(audit.id) &&
            finite(audit.score, 0, 1),
          'REPORT_DIAGNOSTICS_INVALID',
        );
        seen.add(audit.id);
      }
    }
    if (sample.httpStatuses !== undefined) {
      demand(
        Array.isArray(sample.httpStatuses) && sample.httpStatuses.length <= 500,
        'REPORT_HTTP_INVALID',
      );
      const seen = new Set();
      for (const entry of sample.httpStatuses) {
        object(entry, ['status', 'count']);
        demand(
          Number.isInteger(entry.status) &&
            finite(entry.status, 100, 599) &&
            !seen.has(entry.status) &&
            Number.isInteger(entry.count) &&
            finite(entry.count, 1, 10000),
          'REPORT_HTTP_INVALID',
        );
        seen.add(entry.status);
      }
    }
    object(sample.proofs, [
      'headingVerified',
      'dataSettled',
      'authenticated',
      'compressedJs',
      'routeChunksIsolated',
      'apiWrites',
    ]);
    demand(
      [
        'headingVerified',
        'dataSettled',
        'authenticated',
        'compressedJs',
        'routeChunksIsolated',
      ].every((key) => typeof sample.proofs[key] === 'boolean') &&
        Number.isInteger(sample.proofs.apiWrites) &&
        finite(sample.proofs.apiWrites),
      'REPORT_PROOFS_INVALID',
    );
    if (
      !sample.proofs.headingVerified ||
      !sample.proofs.dataSettled ||
      sample.proofs.authenticated !== route.private ||
      !sample.proofs.compressedJs ||
      !sample.proofs.routeChunksIsolated ||
      sample.proofs.apiWrites !== 0 ||
      CATEGORIES.some((key) => sample.scores[key] < 95) ||
      sample.lcpMs >= 2500 ||
      sample.cls >= 0.1
    )
      failed.push(identity);
  }
  if (report.failure) {
    object(report.failure, ['code', 'route', 'run']);
    demand(
      report.failure.code === 'MEASUREMENT_FAILED' &&
        ROUTES.some((r) => r.id === report.failure.route) &&
        Number.isInteger(report.failure.run) &&
        report.failure.run >= 1 &&
        report.failure.run <= REPETITIONS,
      'REPORT_FAILURE_INVALID',
    );
  }
  if (requirePass) {
    demand(
      !report.failure && identities.size === ROUTES.length * REPETITIONS,
      'REPORT_INVENTORY_INCOMPLETE',
    );
    demand(report.bundleGzipBytes <= 200_000, 'REPORT_BUNDLE_EXCEEDED');
    demand(failed.length === 0, 'REPORT_RELEASE_TARGETS_FAILED');
  }
  return {
    samples: identities.size,
    failed,
    complete:
      identities.size === ROUTES.length * REPETITIONS && !report.failure,
  };
}

/** No DOM, names, values, identifiers, URLs or credentials in accessibility artifacts. */
export function inspectAccessibilityReport(report, { expectedHead } = {}) {
  object(report, [
    'schema',
    'frontendSha',
    'apiSha',
    'browser',
    'browserVersion',
    'profile',
    'viewport',
    'dataset',
    'samples',
    'graphAlternatives',
    'photoReservedAndFocus',
    'eventTiming',
    'productionAuthorized',
  ]);
  demand(
    report.schema === 1 && /^[a-f0-9]{40}$/.test(report.frontendSha),
    'A11Y_VERSION_INVALID',
  );
  if (expectedHead)
    demand(report.frontendSha === expectedHead, 'A11Y_HEAD_MISMATCH');
  demand(
    report.apiSha === API_PIN.commit && report.productionAuthorized === false,
    'A11Y_API_INVALID',
  );
  demand(
    ['chromium', 'firefox', 'webkit'].includes(report.browser) &&
      /^\d+(\.\d+){0,3}$/.test(report.browserVersion),
    'A11Y_BROWSER_INVALID',
  );
  demand(Object.hasOwn(PROFILES, report.profile), 'A11Y_PROFILE_INVALID');
  object(report.viewport, ['width', 'height']);
  demand(
    JSON.stringify(report.viewport) ===
      JSON.stringify(PROFILES[report.profile]),
    'A11Y_VIEWPORT_INVALID',
  );
  object(report.dataset, ['bets', 'tipsters', 'markets', 'days']);
  demand(
    Object.values(report.dataset).every(
      (n) => Number.isInteger(n) && finite(n, 1, 100_000),
    ) &&
      report.dataset.bets >= 5000 &&
      report.dataset.tipsters >= 40 &&
      report.dataset.markets >= 40 &&
      report.dataset.days >= 90,
    'A11Y_DATASET_INVALID',
  );
  demand(
    Array.isArray(report.samples) &&
      report.samples.length === ROUTES.length * 2,
    'A11Y_INVENTORY_INCOMPLETE',
  );
  const seen = new Set();
  for (const sample of report.samples) {
    object(sample, ['route', 'theme', 'passed']);
    demand(
      ROUTES.some((r) => r.id === sample.route) &&
        ['claro', 'escuro'].includes(sample.theme) &&
        sample.passed === true,
      'A11Y_SAMPLE_INVALID',
    );
    const key = sample.route + ':' + sample.theme;
    demand(!seen.has(key), 'A11Y_DUPLICATE_SAMPLE');
    seen.add(key);
  }
  demand(
    Number.isInteger(report.graphAlternatives) &&
      finite(report.graphAlternatives, 1, 10000) &&
      report.photoReservedAndFocus === true,
    'A11Y_ALTERNATIVES_MISSING',
  );
  const event = report.eventTiming;
  object(event, [
    'supported',
    'trustedClicks',
    'entries',
    'maxDurationMs',
    'thresholdMs',
    'throttled',
  ]);
  demand(
    typeof event.supported === 'boolean' &&
      event.throttled === (report.browser === 'chromium') &&
      event.thresholdMs === 16 &&
      Number.isInteger(event.trustedClicks) &&
      finite(event.trustedClicks, 4, 1000) &&
      Number.isInteger(event.entries) &&
      finite(event.entries, 0, 10000),
    'A11Y_INTERACTION_INVALID',
  );
  demand(
    report.browser !== 'chromium' || event.supported,
    'A11Y_EVENT_TIMING_REQUIRED',
  );
  demand(
    (event.entries === 0 && event.maxDurationMs === null) ||
      (event.supported &&
        event.entries > 0 &&
        finite(event.maxDurationMs, 16, 199.999)),
    'A11Y_INTERACTION_LATENCY_INVALID',
  );
  return { samples: seen.size };
}
