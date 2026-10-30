// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';

const identity = [
  'real_identity_cookie_contract',
  'session_lifecycle',
  'account_registration_and_recovery',
  'expired_confirmation',
  'commercial_access',
  'telegram_import',
  'timezone_preference',
  'aposta_photo',
].flatMap((name) => [0, 1].map((v) => `test_public_spa_${name}[viewport${v}]`));
const reports = {
  identity: identity,
  matching: ['house-first', 'telegram-first'].flatMap((order) =>
    [0, 1].map(
      (v) => `test_public_spa_matching[${order}-viewport${v}-chromium]`,
    ),
  ),
  hypothesis: [0, 1].map(
    (v) => `test_public_spa_historical_comparison[viewport${v}-chromium]`,
  ),
};
function proof(work) {
  const folder = mkdtempSync(join(tmpdir(), 'frontend-product-proof-'));
  const write = (kind, names, tag = '') => {
    const browser =
      kind === 'identity'
        ? '<properties><property name="executed_browser" value="chromium"/></properties>'
        : '';
    const cases = names.map(
      (name) => `<testcase name="${name}">${browser}${tag}</testcase>`,
    );
    writeFileSync(
      join(folder, `product-${kind}-results.xml`),
      `<testsuites><testsuite>${cases.join('')}</testsuite></testsuites>`,
    );
  };
  try {
    for (const [kind, names] of Object.entries(reports)) write(kind, names);
    work({
      folder,
      write,
      run: () =>
        execFileSync(
          'python',
          ['tests/identity/check_product_results.py', folder, 'chromium'],
          { stdio: 'pipe' },
        ),
    });
  } finally {
    rmSync(folder, { recursive: true });
  }
}
it('exige as 22 jornadas reais do produto nos dois viewports', () =>
  proof(({ run }) => expect(run).not.toThrow()));
it.each(Object.keys(reports))('recusa arquivo %s ausente', (kind) =>
  proof(({ folder, run }) => {
    rmSync(join(folder, `product-${kind}-results.xml`));
    expect(run).toThrow();
  }),
);
it.each(['webkit', ''])(
  'recusa navegador executado diferente ou ausente (%s)',
  (browser) =>
    proof(({ folder, run }) => {
      const path = join(folder, 'product-identity-results.xml');
      writeFileSync(
        path,
        readFileSync(path, 'utf8').replaceAll(
          'value="chromium"',
          `value="${browser}"`,
        ),
      );
      expect(run).toThrow();
    }),
);
it.each([
  ['omissão', reports.matching.slice(1), ''],
  ['duplicação', reports.matching.map(() => reports.matching[0]), ''],
  [
    'outro browser',
    reports.matching.map((n) => n.replace('chromium', 'webkit')),
    '',
  ],
  ['skip', reports.matching, '<skipped/>'],
  ['falha', reports.matching, '<failure/>'],
  ['erro', reports.matching, '<error/>'],
])('recusa prova de duplicidade com %s', (_label, names, tag) =>
  proof(({ write, run }) => {
    write('matching', names, tag);
    expect(run).toThrow();
  }),
);
