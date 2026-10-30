// @vitest-environment node
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  readFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { afterEach, expect, it } from 'vitest';
import {
  inspectBundle,
  inspectRouteSplitting,
  INITIAL_JS_LIMIT,
} from '../../scripts/check-bundle.mjs';

const directories = [];
afterEach(() =>
  directories.splice(0).forEach((dir) => rmSync(dir, { recursive: true })),
);
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'bundle-budget-'));
  directories.push(dir);
  mkdirSync(join(dir, '.vite'));
  mkdirSync(join(dir, 'assets'));
  const manifest = {
    'index.html': {
      file: 'assets/app.js',
      isEntry: true,
      imports: ['shared'],
      dynamicImports: ['lazy'],
    },
    shared: { file: 'assets/shared.js' },
    lazy: { file: 'assets/lazy.js' },
  };
  writeFileSync(join(dir, '.vite/manifest.json'), JSON.stringify(manifest));
  writeFileSync(
    join(dir, 'index.html'),
    '<script>theme()</script><script type="module" src="/assets/app.js"></script><link rel="modulepreload" href="/assets/shared.js">',
  );
  writeFileSync(join(dir, 'assets/app.js'), 'app()');
  writeFileSync(join(dir, 'assets/shared.js'), 'shared()');
  writeFileSync(
    join(dir, 'assets/lazy.js'),
    randomBytes(INITIAL_JS_LIMIT + 100),
  );
  return { dir, manifest };
}
it('mede entrada, imports estáticos e tema sem contar shared duas vezes ou lazy', () => {
  const { dir } = fixture();
  const report = inspectBundle(dir);
  expect(report.passed).toBe(true);
  expect(report.assets.map((asset) => asset.file)).toEqual([
    'inline-1',
    'assets/app.js',
    'assets/shared.js',
  ]);
  expect(inspectBundle(dir, report.totalGzipBytes).passed).toBe(true);
  expect(inspectBundle(dir, report.totalGzipBytes - 1).passed).toBe(false);
});
it('reprova página voltando à entrada ou preload, inclusive com manifesto ausente', () => {
  const { dir, manifest } = fixture();
  manifest.lazy.isDynamicEntry = true;
  writeFileSync(join(dir, '.vite/manifest.json'), JSON.stringify(manifest));
  expect(inspectRouteSplitting(dir, ['lazy', 'lazy'])).toHaveLength(1);
  expect(() => inspectRouteSplitting(dir, [])).toThrow(/Catálogo/);
  expect(() => inspectRouteSplitting(dir, ['missing'])).toThrow(/separada/);
  expect(() => inspectRouteSplitting(dir, ['shared'])).toThrow(/separada/);
  writeFileSync(
    join(dir, 'index.html'),
    '<script src="/assets/app.js"></script><link rel="modulepreload" href="/assets/lazy.js">',
  );
  expect(() => inspectRouteSplitting(dir, ['lazy'])).toThrow(/separada/);
});
it('reprova excesso real em dependência inicial e conta preload de dynamic import', () => {
  const { dir } = fixture();
  writeFileSync(
    join(dir, 'index.html'),
    '<script src="/assets/app.js"></script><link rel="modulepreload" href="/assets/lazy.js">',
  );
  expect(inspectBundle(dir).passed).toBe(false);
});
it('o pior preload de rota entra no budget inicial sem somar rotas alternativas', () => {
  const { dir } = fixture();
  const baseline = inspectBundle(dir);
  const hints = [
    {
      path: '/painel',
      files: ['assets/lazy.js', 'assets/shared.js', 'assets/lazy.js'],
    },
    { path: '/contas', files: ['assets/shared.js'] },
  ];
  const html = readFileSync(join(dir, 'index.html'), 'utf8');
  writeFileSync(
    join(dir, 'index.html'),
    '<meta id="rotas-iniciais" content="' +
      JSON.stringify(hints).replaceAll('"', '&quot;') +
      '">' +
      html,
  );
  const report = inspectBundle(dir);
  expect(report.passed).toBe(false);
  expect(report.baseGzipBytes).toBe(baseline.totalGzipBytes);
  expect(report.routeBudgets[1].gzipBytes).toBe(baseline.totalGzipBytes);
  expect(report.totalGzipBytes).toBe(report.routeBudgets[0].gzipBytes);
});
it('falha fechado com arquivo/import ausente ou referência externa', () => {
  const { dir, manifest } = fixture();
  manifest['index.html'].imports.push('missing');
  writeFileSync(join(dir, '.vite/manifest.json'), JSON.stringify(manifest));
  expect(() => inspectBundle(dir)).toThrow(/Import ausente/);
  writeFileSync(
    join(dir, 'index.html'),
    '<script src="https://example.com/app.js"></script>',
  );
  expect(() => inspectBundle(dir)).toThrow(/externo/);
  writeFileSync(
    join(dir, 'index.html'),
    '<script src="../outside.js"></script>',
  );
  expect(() => inspectBundle(dir)).toThrow(/fora/);
  writeFileSync(join(dir, 'index.html'), '<script src="/missing.js"></script>');
  expect(() => inspectBundle(dir)).toThrow();
  writeFileSync(join(dir, 'index.html'), '<main>sem build</main>');
  expect(() => inspectBundle(dir)).toThrow(/sem entrada/);
});
