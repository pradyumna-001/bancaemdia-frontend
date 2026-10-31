import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { inspectAccessibilityReport } from './performance-policy.mjs';

try {
  const directory = resolve(process.argv[2]);
  const browser = process.argv[3];
  if (!['chromium', 'firefox', 'webkit'].includes(browser)) throw new Error();
  const files = readdirSync(directory).sort();
  const expected = ['desktop', 'mobile']
    .map((p) => `accessibility-${browser}-${p}.json`)
    .sort();
  if (JSON.stringify(files) !== JSON.stringify(expected)) throw new Error();
  const head = execFileSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8',
  }).trim();
  for (const file of files) {
    const report = JSON.parse(readFileSync(resolve(directory, file), 'utf8'));
    if (
      report.browser !== browser ||
      file !== `accessibility-${browser}-${report.profile}.json`
    )
      throw new Error();
    inspectAccessibilityReport(report, { expectedHead: head });
  }
  console.log('ACCESSIBILITY_INVENTORY_PASSED');
} catch {
  console.error('ACCESSIBILITY_REPORT_REJECTED');
  process.exitCode = 1;
}
