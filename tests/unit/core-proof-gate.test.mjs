// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';

it('o gate central recusa caso ausente, duplicado, skip ou falha nos dois viewports', () => {
  const names = ['journey', 'access_isolation'].flatMap((name) =>
    [0, 1].map(
      (viewport) =>
        `test_public_spa_central_${name}[viewport${viewport}-chromium]`,
    ),
  );
  const folder = mkdtempSync(join(tmpdir(), 'frontend-core-proof-'));
  const report = join(folder, 'results.xml');
  const run = (entries) => {
    writeFileSync(
      report,
      `<testsuites><testsuite>${entries.join('')}</testsuite></testsuites>`,
    );
    return () =>
      execFileSync(
        'python',
        ['tests/identity/check_core_results.py', report, 'chromium'],
        { stdio: 'pipe' },
      );
  };
  const cases = names.map((name) => `<testcase name="${name}"/>`);
  try {
    expect(run(cases)).not.toThrow();
    for (const invalid of [
      [],
      cases.slice(1),
      [cases[0], ...cases.slice(0, 3)],
      [`<testcase name="${names[0]}"><skipped/></testcase>`, ...cases.slice(1)],
      [`<testcase name="${names[0]}"><failure/></testcase>`, ...cases.slice(1)],
    ])
      expect(run(invalid)).toThrow();
  } finally {
    rmSync(folder, { recursive: true });
  }
});

it('Resultados exige ambos os viewports sem omissão, duplicação ou skip', () => {
  const folder = mkdtempSync(join(tmpdir(), 'frontend-results-proof-'));
  const report = join(folder, 'results.xml');
  const names = [0, 1].map(
    (view) =>
      `test_public_spa_resultados_gestures_undo_recovery[viewport${view}-chromium]`,
  );
  const cases = names.map((name) => `<testcase name="${name}"/>`);
  const run = (entries) => {
    writeFileSync(
      report,
      `<testsuites><testsuite>${entries.join('')}</testsuite></testsuites>`,
    );
    return () =>
      execFileSync(
        'python',
        ['tests/identity/check_resultados_results.py', report, 'chromium'],
        { stdio: 'pipe' },
      );
  };
  try {
    expect(run(cases)).not.toThrow();
    for (const invalid of [
      [],
      [cases[0]],
      [cases[0], cases[0]],
      [`<testcase name="${names[0]}"><skipped/></testcase>`, cases[1]],
      [`<testcase name="${names[0]}"><error/></testcase>`, cases[1]],
    ])
      expect(run(invalid)).toThrow();
  } finally {
    rmSync(folder, { recursive: true });
  }
});
