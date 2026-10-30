// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';

it('Metas exige os dois viewports exatos, sem omissão, duplicação, falha ou skip', () => {
  const folder = mkdtempSync(join(tmpdir(), 'frontend-goals-proof-'));
  const report = join(folder, 'results.xml');
  const cases = [0, 1].map(
    (n) => `<testcase name="test_public_spa_metas[viewport${n}-chromium]"/>`,
  );
  const run = (entries) => {
    writeFileSync(
      report,
      `<testsuites><testsuite>${entries.join('')}</testsuite></testsuites>`,
    );
    return () =>
      execFileSync(
        'python',
        ['tests/identity/check_metas_results.py', report, 'chromium'],
        { stdio: 'pipe' },
      );
  };
  try {
    expect(run(cases)).not.toThrow();
    for (const invalid of [
      [],
      cases.slice(1),
      [cases[0], cases[0]],
      [...cases, cases[0]],
      [cases[0].replace('/>', '><skipped/></testcase>'), cases[1]],
      [cases[0].replace('/>', '><failure/></testcase>'), cases[1]],
    ])
      expect(run(invalid)).toThrow();
  } finally {
    rmSync(folder, { recursive: true });
  }
});
