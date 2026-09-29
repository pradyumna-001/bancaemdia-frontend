import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
import { launch } from 'chrome-launcher';
import { chromium } from '@playwright/test';
import { preview } from 'vite';

// Laboratory baseline of the public build, never the authenticated test fixture.
const server = await preview({
  configFile: false,
  preview: { host: '127.0.0.1', port: 4181, strictPort: true },
  plugins: [
    {
      name: 'lighthouse-runtime-config',
      configurePreviewServer(server) {
        server.middlewares.use('/config.json', (_req, res) => {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          res.end(
            JSON.stringify({
              VITE_API_URL: 'http://127.0.0.1:8000',
              VITE_APP_ENV: 'production',
              VITE_UPLOAD_POLL_MS: 1000,
            }),
          );
        });
      },
    },
  ],
});
let chrome;
let preflight;
try {
  const url = 'http://127.0.0.1:4181/login';
  preflight = await chromium.launch();
  const page = await preflight.newPage();
  await page.goto(url);
  await page.getByRole('heading', { name: 'Entrar', exact: true }).waitFor();
  await preflight.close();
  preflight = undefined;
  chrome = await launch({
    chromePath: process.env.CHROME_PATH || chromium.executablePath(),
    chromeFlags: ['--headless', '--no-sandbox'],
  });
  mkdirSync('reports/lighthouse', { recursive: true });
  const summaries = [];
  for (const device of ['mobile', 'desktop']) {
    const result = await lighthouse(
      url,
      {
        port: chrome.port,
        logLevel: 'error',
        output: ['json', 'html'],
        onlyCategories: ['performance', 'accessibility', 'best-practices'],
      },
      device === 'desktop' ? desktopConfig : undefined,
    );
    if (!result || result.lhr.runtimeError)
      throw new Error(
        'Lighthouse não concluiu a medição: ' +
          JSON.stringify(result?.lhr.runtimeError),
      );
    const { lhr } = result;
    if (lhr.configSettings.formFactor !== device)
      throw new Error('Perfil Lighthouse incorreto: ' + device);
    const scores = Object.fromEntries(
      Object.entries(lhr.categories).map(([key, value]) => {
        if (typeof value.score !== 'number')
          throw new Error('Score ausente: ' + key);
        return [key, Math.round(value.score * 100)];
      }),
    );
    const metrics = Object.fromEntries(
      [
        'largest-contentful-paint',
        'cumulative-layout-shift',
        'total-blocking-time',
      ].map((key) => {
        const value = lhr.audits[key].numericValue;
        if (!Number.isFinite(value)) throw new Error('Métrica ausente: ' + key);
        return [key, value];
      }),
    );
    for (const [index, extension] of ['json', 'html'].entries())
      writeFileSync(
        `reports/lighthouse/${device}.${extension}`,
        result.report[index],
      );
    summaries.push({
      device,
      url: lhr.finalDisplayedUrl,
      lighthouseVersion: lhr.lighthouseVersion,
      fetchTime: lhr.fetchTime,
      userAgent: lhr.userAgent,
      formFactor: lhr.configSettings.formFactor,
      screenEmulation: lhr.configSettings.screenEmulation,
      scores,
      metrics,
    });
  }
  const baseline = {
    scope:
      'Public login placeholder; no real session/API or protected screens. One cold lab run per device; not P75 or INP.',
    targets: { categoryScore: 95, lcpMs: 2500, cls: 0.1, inpMsField: 200 },
    enforcement: 'Measurement required; numeric release gates in issue #37.',
    summaries,
  };
  writeFileSync(
    'reports/lighthouse/summary.json',
    JSON.stringify(baseline, null, 2) + '\n',
  );
  const table = [
    '### Lighthouse — referência de laboratório',
    '',
    '| Dispositivo | Perf | A11y | Boas práticas | LCP ms | CLS | TBT ms |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...summaries.map(
      (r) =>
        `| ${r.device} | ${r.scores.performance} | ${r.scores.accessibility} | ${r.scores['best-practices']} | ${Math.round(r.metrics['largest-contentful-paint'])} | ${r.metrics['cumulative-layout-shift'].toFixed(3)} | ${Math.round(r.metrics['total-blocking-time'])} |`,
    ),
    '',
    baseline.scope,
    baseline.enforcement,
    '',
  ].join('\n');
  console.log(table);
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, table);
} finally {
  await preflight?.close();
  await chrome?.kill();
  await new Promise((resolve, reject) =>
    server.httpServer.close((error) => (error ? reject(error) : resolve())),
  );
}
