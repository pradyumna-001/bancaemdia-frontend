// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
const tasks = [
  'acesso_pendente',
  'conta_ausente',
  'retomar_e_registrar',
  'canal_indisponivel',
].map((task) => ({ task, result: 'success', duration_ms: 10 }));
const cases = [0, 1].map(
  (n) => `<testcase name="test_public_spa_inicio[viewport${n}-chromium]"/>`,
);
function proof(work, entries = cases, measurements = tasks) {
  const folder = mkdtempSync(join(tmpdir(), 'frontend-inicio-proof-'));
  const report = join(folder, 'results.xml');
  const file = join(folder, 'inicio-chromium-390-tasks.json');
  try {
    for (const width of [390, 1440])
      writeFileSync(
        join(folder, `inicio-chromium-${width}-tasks.json`),
        JSON.stringify(measurements),
      );
    writeFileSync(
      report,
      `<testsuites><testsuite>${entries.join('')}</testsuite></testsuites>`,
    );
    work({
      folder,
      file,
      run: () =>
        execFileSync(
          'python',
          ['tests/identity/check_inicio_results.py', report, 'chromium'],
          { stdio: 'pipe' },
        ),
    });
  } finally {
    rmSync(folder, { recursive: true });
  }
}
it('aceita somente jornada completa e medições sem dados privados', () =>
  proof(({ run }) => expect(run).not.toThrow()));
it.each([
  ['sem casos', []],
  ['omissão', cases.slice(1)],
  ['duplicação', [cases[0], cases[0]]],
  ['excesso', [...cases, cases[0]]],
  ['skip', [cases[0].replace('/>', '><skipped/></testcase>'), cases[1]]],
  ['falha', [cases[0].replace('/>', '><failure/></testcase>'), cases[1]]],
])('recusa inventário com %s', (_label, entries) =>
  proof(({ run }) => expect(run).toThrow(), entries),
);
it.each([
  ['vazias', []],
  ['incompletas', tasks.slice(1)],
  ['excesso', [...tasks, tasks[0]]],
  ['identidade', tasks.map((t) => ({ ...t, usuario_id: 1 }))],
  ['texto livre', tasks.map((t) => ({ ...t, task: 'email@example.org' }))],
  ['erro', tasks.map((t) => ({ ...t, result: 'error' }))],
  ['duração negativa', tasks.map((t) => ({ ...t, duration_ms: -1 }))],
])('recusa medições com %s', (_label, measurements) =>
  proof(({ run }) => expect(run).toThrow(), cases, measurements),
);
it('remove relatório inseguro antes de impedir upload', () =>
  proof(({ folder, file }) => {
    writeFileSync(file, JSON.stringify([{ ...tasks[0], secret: 'private' }]));
    expect(() =>
      execFileSync('python', ['tests/identity/check_inicio_tasks.py', folder], {
        stdio: 'pipe',
      }),
    ).toThrow();
    expect(existsSync(file)).toBe(false);
  }));
