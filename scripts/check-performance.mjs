import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { inspectPerformanceReport } from './performance-policy.mjs';

try {
  const report = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  const expectedHead = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: fileURLToPath(new URL('../', import.meta.url)),
    encoding: 'utf8',
  }).trim();
  const privacyOnly = process.argv[3] === '--privacy-only';
  const result = inspectPerformanceReport(report, {
    expectedHead,
    requirePass: !privacyOnly,
  });
  console.log(
    JSON.stringify({
      profile: report.profile,
      samples: result.samples,
      complete: result.complete,
      failedSamples: result.failed.length,
      privacyOnly,
    }),
  );
} catch {
  // Do not echo invalid JSON, unknown field names or arbitrary error messages.
  console.error('PERFORMANCE_REPORT_REJECTED');
  process.exitCode = 1;
}
