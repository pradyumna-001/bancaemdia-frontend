/* global document */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { availableParallelism, arch, platform } from 'node:os';
import { execFileSync } from 'node:child_process';
import { launch } from 'chrome-launcher';
import { chromium } from '@playwright/test';
import puppeteer from 'puppeteer-core';
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
import { inspectBundle, inspectRouteSplitting } from './check-bundle.mjs';
import {
  API_PIN,
  AUDIT_IDS,
  CATEGORIES,
  PROFILES,
  REPETITIONS,
  ROUTES,
  inspectPerformanceReport,
  referenceThrottling,
} from './performance-policy.mjs';

// Only the test harness writes stdin. Real HttpOnly cookies remain in memory;
// credentials, resolved private URLs and raw Lighthouse artifacts are never saved.
const profile = process.argv[2];
const output = resolve(process.argv[3] || 'reports/performance/result.json');
if (!Object.hasOwn(PROFILES, profile))
  throw new Error('PERFORMANCE_PROFILE_REQUIRED');
let serialized = '';
for await (const chunk of process.stdin) {
  serialized += chunk;
  if (serialized.length > 100_000)
    throw new Error('PERFORMANCE_INPUT_TOO_LARGE');
}
const input = JSON.parse(serialized);
serialized = '';
const origin = new URL(input.origin);
if (
  !['http:', 'https:'].includes(origin.protocol) ||
  origin.hostname !== '127.0.0.1' ||
  origin.pathname !== '/' ||
  origin.search ||
  origin.hash ||
  input.apiSha !== API_PIN.commit
)
  throw new Error('PERFORMANCE_SANDBOX_REQUIRED');
const routeInputs = new Map(input.routes.map((route) => [route.id, route]));
if (
  routeInputs.size !== ROUTES.length ||
  ROUTES.some((route) => !routeInputs.has(route.id))
)
  throw new Error('PERFORMANCE_ROUTES_REQUIRED');
for (const route of routeInputs.values()) {
  const url = new URL(route.path, origin);
  if (
    url.origin !== origin.origin ||
    url.hash ||
    !route.path.startsWith('/') ||
    route.path.startsWith('//') ||
    typeof route.heading !== 'string' ||
    !route.heading
  )
    throw new Error('PERFORMANCE_ROUTE_INVALID');
}
let cookies = input.cookies;
input.cookies = undefined;
if (
  !Array.isArray(cookies) ||
  !cookies.length ||
  cookies.some((cookie) => !cookie.httpOnly || cookie.domain !== '127.0.0.1')
)
  throw new Error('PERFORMANCE_REAL_COOKIE_REQUIRED');
const transferCookie = ({
  name,
  value,
  domain,
  path,
  expires,
  httpOnly,
  secure,
  sameSite,
}) => ({
  name,
  value,
  domain,
  path,
  httpOnly,
  secure,
  sameSite,
  ...(expires > 0 ? { expires } : {}),
});
cookies = cookies.map(transferCookie);
const bundle = inspectBundle('dist');
const manifest = JSON.parse(readFileSync('dist/.vite/manifest.json', 'utf8'));
const routeFiles = new Set(
  ROUTES.map((route) => manifest[route.module]?.file).filter(Boolean),
);
function allowedFiles(module) {
  const files = new Set(bundle.assets.map((asset) => asset.file));
  const seen = new Set();
  const visit = (key) => {
    if (seen.has(key) || !manifest[key]) return;
    seen.add(key);
    files.add(manifest[key].file);
    for (const dependency of manifest[key].imports || []) visit(dependency);
  };
  visit(module);
  return files;
}
inspectRouteSplitting(
  'dist',
  ROUTES.filter((r) => r.module !== 'src/features/conta/AccountPage.tsx').map(
    (r) => r.module,
  ),
);
let chrome;
let browser;
let stopping = false;
const terminateOwnedBrowser = async () => {
  if (stopping) return;
  stopping = true;
  cookies = [];
  try {
    await browser?.close();
  } catch {
    /* The process may already be gone. */
  }
  try {
    await chrome?.kill();
  } catch {
    /* The ephemeral runner owns this profile. */
  }
};
for (const signal of ['SIGTERM', 'SIGINT'])
  process.once(signal, async () => {
    await terminateOwnedBrowser();
    process.exit(143);
  });
let current = { route: ROUTES[0].id, run: 1 };
const report = {
  schema: 1,
  frontendSha: execFileSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8',
  }).trim(),
  apiSha: input.apiSha,
  apiSchemaSha256: API_PIN.sha256,
  availability: API_PIN.availability.kind,
  productionAuthorized: false,
  profile,
  repetitions: REPETITIONS,
  environment: undefined,
  dataset: input.dataset,
  bundleGzipBytes: bundle.totalGzipBytes,
  samples: [],
};
try {
  chrome = await launch({
    chromePath: process.env.CHROME_PATH || chromium.executablePath(),
    chromeFlags: ['--headless', '--no-sandbox'],
  });
  browser = await puppeteer.connect({
    browserURL: `http://127.0.0.1:${chrome.port}`,
    defaultViewport: null,
  });
  report.environment = {
    node: process.version,
    lighthouse: JSON.parse(
      readFileSync(
        new URL('../node_modules/lighthouse/package.json', import.meta.url),
        'utf8',
      ),
    ).version,
    chromium: await browser.version(),
    platform: platform(),
    arch: arch(),
    cpuCount: availableParallelism(),
    viewport: PROFILES[profile],
    throttling: referenceThrottling(profile),
    throttlingMethod: 'simulate',
    cache: 'cleared-before-each-navigation',
  };
  // Anonymous account/help pages first. Each sample owns a new incognito context,
  // retaining only the actual server session between private samples.
  for (const route of [
    ...ROUTES.filter((r) => !r.private),
    ...ROUTES.filter((r) => r.private),
  ]) {
    const target = routeInputs.get(route.id);
    for (let run = 1; run <= REPETITIONS; run++) {
      current = { route: route.id, run };
      const context = await browser.createBrowserContext();
      let page;
      try {
        if (route.private) await context.setCookie(...cookies);
        page = await context.newPage();
        const cdp = await page.createCDPSession();
        await cdp.send('Network.enable');
        await cdp.send('Network.clearBrowserCache');
        let compressedJs = false;
        let routeChunksIsolated = true;
        const allowed = allowedFiles(route.module);
        let apiWrites = 0;
        let identityReads = 0;
        let successfulSessionRead = false;
        page.on('request', (request) => {
          const url = new URL(request.url());
          const asset = url.pathname.replace(/^\//, '');
          if (
            url.origin === origin.origin &&
            routeFiles.has(asset) &&
            !allowed.has(asset)
          )
            routeChunksIsolated = false;
          if (url.origin === origin.origin && url.pathname.startsWith('/auth/'))
            identityReads++;
          if (
            url.origin === origin.origin &&
            url.pathname.startsWith('/api/') &&
            request.method() !== 'GET'
          )
            apiWrites++;
        });
        page.on('response', (response) => {
          const url = new URL(response.url());
          if (
            url.origin === origin.origin &&
            url.pathname === '/auth/session' &&
            response.status() === 200
          )
            successfulSessionRead = true;
          if (
            url.origin === origin.origin &&
            url.pathname.startsWith('/assets/') &&
            url.pathname.endsWith('.js') &&
            response.headers()['content-encoding'] === 'gzip'
          )
            compressedJs = true;
        });
        const config =
          profile === 'desktop'
            ? { ...desktopConfig, settings: { ...desktopConfig.settings } }
            : { extends: 'lighthouse:default', settings: {} };
        config.settings.screenEmulation = {
          ...PROFILES[profile],
          mobile: profile === 'mobile',
          deviceScaleFactor: profile === 'mobile' ? 1.75 : 1,
          disabled: false,
        };
        const result = await lighthouse(
          new URL(target.path, origin).href,
          {
            port: chrome.port,
            logLevel: 'silent',
            disableStorageReset: true,
            onlyCategories: CATEGORIES,
          },
          config,
          page,
        );
        if (!result || result.lhr.runtimeError)
          throw new Error('PERFORMANCE_NAVIGATION_FAILED');
        const { lhr } = result;
        const displayed = new URL(lhr.finalDisplayedUrl);
        const requested = new URL(target.path, origin);
        if (
          displayed.origin !== requested.origin ||
          displayed.pathname !== requested.pathname ||
          displayed.search !== requested.search ||
          lhr.configSettings.formFactor !== profile ||
          lhr.configSettings.throttlingMethod !== 'simulate'
        )
          throw new Error('PERFORMANCE_WRONG_DOCUMENT');
        if (
          Object.entries(referenceThrottling(profile)).some(
            ([key, value]) => lhr.configSettings.throttling[key] !== value,
          ) ||
          lhr.configSettings.screenEmulation.width !==
            PROFILES[profile].width ||
          lhr.configSettings.screenEmulation.height !== PROFILES[profile].height
        )
          throw new Error('PERFORMANCE_WRONG_THROTTLING');
        // Do not wait for missing data after measurement and then approve the
        // score of a loading placeholder. Inspect the document Lighthouse saw.
        const { headingVerified, settled } = await page.evaluate((heading) => {
          const title = document.querySelector('main h1');
          const loading = [
            ...document.querySelectorAll('[role="status"]'),
          ].some(
            (node) =>
              node.getClientRects().length > 0 &&
              /^(Abrindo|Carregando|Consultando|Conferindo)/.test(
                node.textContent?.trim() || '',
              ),
          );
          return {
            headingVerified:
              !!title?.getClientRects().length &&
              title.textContent?.trim() === heading,
            settled:
              !loading &&
              !document.querySelector('[aria-busy="true"],main .erro-api'),
          };
        }, target.heading);
        const authenticated = route.private
          ? await page.evaluate(
              async () =>
                (
                  await fetch('/auth/session', {
                    credentials: 'same-origin',
                    cache: 'no-store',
                  })
                ).status === 200,
            )
          : successfulSessionRead ||
            (await context.cookies(origin.origin)).some(
              (cookie) => cookie.httpOnly,
            );
        if (!route.private && identityReads !== 0)
          throw new Error('PERFORMANCE_PUBLIC_IDENTITY');
        report.samples.push({
          route: route.id,
          run,
          scores: Object.fromEntries(
            CATEGORIES.map((id) => [
              id,
              lhr.categories[id].score === null
                ? null
                : lhr.categories[id].score * 100,
            ]),
          ),
          lcpMs: lhr.audits['largest-contentful-paint'].numericValue,
          cls: lhr.audits['cumulative-layout-shift'].numericValue,
          tbtMs: lhr.audits['total-blocking-time'].numericValue,
          failedAudits: Object.entries(lhr.audits)
            .filter(
              ([id, audit]) =>
                AUDIT_IDS.has(id) &&
                typeof audit.score === 'number' &&
                audit.score < 1,
            )
            .map(([id, audit]) => ({ id, score: audit.score })),
          proofs: {
            headingVerified,
            dataSettled: settled,
            authenticated,
            compressedJs,
            routeChunksIsolated,
            apiWrites,
          },
        });
        if (
          !headingVerified ||
          !settled ||
          !routeChunksIsolated ||
          authenticated !== route.private ||
          apiWrites !== 0
        )
          throw new Error('PERFORMANCE_CONTEXT_INVALID');
        if (route.private)
          cookies = (await context.cookies()).map(transferCookie);
        // Raw lhr/report/devtoolsLog may contain private DOM or cookie headers.
        // None is copied to a report, diagnostic file or console.
      } finally {
        await page?.close();
        await context.close();
      }
    }
  }
} catch {
  report.failure = { code: 'MEASUREMENT_FAILED', ...current };
  process.exitCode = 1;
} finally {
  cookies = [];
  await terminateOwnedBrowser();
}
try {
  inspectPerformanceReport(report, { requirePass: false });
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  const result = inspectPerformanceReport(report);
  console.log(
    JSON.stringify({ profile, samples: result.samples, passed: true }),
  );
} catch {
  console.error('PERFORMANCE_PROOF_FAILED');
  process.exitCode = 1;
}
