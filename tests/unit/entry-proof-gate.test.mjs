// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';

const central = {
  manual: 'test_public_spa_manual_creation_recovery',
  prints: 'test_public_spa_prints_real_worker',
  sheet: 'test_public_spa_sheet_preview_remap_confirm',
  resultados: 'test_public_spa_resultados_gestures_undo_recovery',
  revisao: 'test_public_spa_revisao_typed_decisions_recovery',
};
it.each(['central', 'export'])(
  'entrada %s exige inventário exato e bem-sucedido',
  (mode) => {
    const dir = mkdtempSync(join(tmpdir(), 'frontend-entry-gate-'));
    const files =
      mode === 'central'
        ? Object.entries(central).map(([prefix, name]) => [
            `${prefix}-spa-results.xml`,
            name,
          ])
        : [
            [
              'entry-export-results.xml',
              'test_entry_export_lost_response_and_real_limit',
            ],
          ];
    const cases = (name) =>
      [0, 1].map((v) => `<testcase name="${name}[viewport${v}-chromium]"/>`);
    const save = (filename, rows) =>
      writeFileSync(
        join(dir, filename),
        `<testsuites><testsuite>${rows.join('')}</testsuite></testsuites>`,
      );
    const run = () =>
      execFileSync(
        'python',
        ['tests/identity/check_entry_results.py', dir, 'chromium', mode],
        { stdio: 'pipe' },
      );
    try {
      files.forEach(([file, name]) => save(file, cases(name)));
      expect(run).not.toThrow();
      const [filename, name] = files[0];
      const rows = cases(name);
      for (const invalid of [
        [],
        rows.slice(1),
        [rows[0], rows[0]],
        [...rows, rows[0]],
        [rows[0].replace('/>', '><skipped/></testcase>'), rows[1]],
        [rows[0].replace('/>', '><failure/></testcase>'), rows[1]],
        [rows[0].replace('/>', '><error/></testcase>'), rows[1]],
        rows.map((r) => r.replace('chromium', 'firefox')),
      ]) {
        save(filename, invalid);
        expect(run).toThrow();
      }
      rmSync(join(dir, filename));
      expect(run).toThrow();
    } finally {
      rmSync(dir, { recursive: true });
    }
  },
);

it('trace remove argumentos, resultados e conteúdo privado e falha sem publicar ZIP bruto', () => {
  const dir = mkdtempSync(join(tmpdir(), 'frontend-trace-privacy-'));
  const program = `
import importlib.util,json,sys,zipfile,subprocess
from pathlib import Path
spec=importlib.util.spec_from_file_location('privacy','tests/identity/trace_privacy.py')
privacy=importlib.util.module_from_spec(spec);spec.loader.exec_module(privacy)
path=Path(sys.argv[1])/'entry.zip'
secret='DO_NOT_PUBLISH_PRIVATE_PROOF'
events=[
 {'type':'context-options','version':8,'options':{'viewport':{'width':390,'height':844},'storageState':secret}},
 {'type':'before','callId':'call@1','apiName':'page.evaluate','startTime':12,'params':{'arg':{'csrf':secret}},'title':secret},
 {'type':'after','callId':'call@1','endTime':18,'result':{'value':secret},'error':{'message':secret}},
 {'type':'log','message':secret},
]
with zipfile.ZipFile(path,'w') as out:
 out.writestr('trace.trace','\\n'.join(json.dumps(e) for e in events))
 out.writestr('trace.network',secret);out.writestr('resources/image.png',secret)
 out.writestr('trace.stacks','{"files":["test_entry_contract.py"],"stacks":[]}')
privacy.sanitize_trace(path)
with zipfile.ZipFile(path) as out:
 assert set(out.namelist())=={'trace.trace','trace.stacks'}
 assert all(secret.encode() not in out.read(n) for n in out.namelist())
 rows=[json.loads(line) for line in out.read('trace.trace').splitlines()]
 assert len(rows)==3 and rows[1]['callId']=='call@1' and rows[2]['endTime']==18
subprocess.run([sys.executable,'tests/identity/trace_privacy.py','--check-dir',str(path.parent)],check=True,capture_output=True)
with zipfile.ZipFile(path,'a') as out:out.writestr('trace.network',secret)
assert subprocess.run([sys.executable,'tests/identity/trace_privacy.py','--check-dir',str(path.parent)],capture_output=True).returncode!=0
with zipfile.ZipFile(path,'w') as out:out.writestr('trace.trace','invalid json '+secret)
try:privacy.sanitize_trace(path)
except json.JSONDecodeError:pass
else:raise AssertionError('Malformed trace accepted')
assert not path.exists() and not path.with_suffix('.private').exists()
`;
  try {
    expect(() =>
      execFileSync('python', ['-c', program, dir], { stdio: 'pipe' }),
    ).not.toThrow();
  } finally {
    rmSync(dir, { recursive: true });
  }
});
