// @vitest-environment node
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { temaInicial } from '../../scripts/tema-vite';

it('UTF-8 precede o tema exato e ambos precedem estilos, sem perder a CSP', () => {
  const html =
    '<html><head><meta charset="UTF-8"><link rel="stylesheet" href="/app.css"></head></html>';
  const transform = temaInicial().transformIndexHtml.handler;
  const output = transform(html);
  const theme = readFileSync(
    new URL('../../src/styles/tema-inicial.js', import.meta.url),
    'utf8',
  ).replaceAll('\r\n', '\n');
  expect(output.indexOf('<meta charset')).toBeLessThan(1024);
  expect(output.indexOf('<meta charset')).toBeLessThan(
    output.indexOf('<script'),
  );
  expect(output.indexOf('</script>')).toBeLessThan(output.indexOf('<link'));
  expect(
    output.match(/<script id="tema-inicial">([\s\S]*?)<\/script>/)[1],
  ).toBe(theme);
  expect(() => transform('<head><link rel="stylesheet"></head>')).toThrow(
    'UTF-8',
  );
  expect(() => transform(' '.repeat(1024) + html)).toThrow('UTF-8');
  expect(() => transform('é'.repeat(600) + html)).toThrow('UTF-8');
});

it('subconjuntos locais têm origem pinada, checksum e fontes completas de fallback', () => {
  const base = new URL('../../public/fontes/', import.meta.url);
  const manifest = JSON.parse(
    readFileSync(new URL('subsets.json', base), 'utf8'),
  );
  expect(manifest.internal_family).toBe('Bancaemdia Interface');
  expect(manifest.fonts).toHaveLength(6);
  expect(manifest.fonts.reduce((n, f) => n + f.bytes, 0)).toBeLessThan(110_000);
  // Each weight is split by unicode-range: the declared faces are exactly the
  // manifest's, together they cover the whole range, and only the part with
  // Portuguese text is preloaded.
  const css = readFileSync(
    new URL('../../src/styles/base.css', import.meta.url),
    'utf8',
  ).replace(/\s+/g, ' ');
  const html = readFileSync(
    new URL('../../index.html', import.meta.url),
    'utf8',
  );
  for (const font of manifest.fonts) {
    expect(css).toContain(
      `src: url('/fontes/${font.file}') format('woff2');`.replace(/\s+/g, ' '),
    );
    expect(css).toContain(
      'unicode-range: ' + font.unicode_range.split(',').join(', ') + ';',
    );
    expect(html.includes(`/fontes/${font.file}"`)).toBe(
      !font.file.includes('complemento'),
    );
  }
  const points = (ranges) =>
    ranges.split(',').flatMap((range) => {
      const [first, last = first] = range.replace('U+', '').split('-');
      const start = parseInt(first, 16);
      return Array.from(
        { length: parseInt(last, 16) - start + 1 },
        (_, i) => start + i,
      );
    });
  const full = points(manifest.unicode_range).sort((a, b) => a - b);
  for (const style of ['regular', 'semibold', 'bold']) {
    const parts = manifest.fonts
      .filter((f) => f.file.includes(`-${style}-`))
      .map((f) => points(f.unicode_range));
    expect(parts).toHaveLength(2);
    expect(parts.flat().sort((a, b) => a - b)).toEqual(full);
  }
  const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
  for (const font of manifest.fonts) {
    const bytes = readFileSync(new URL(font.file, base));
    expect(bytes.subarray(0, 4).toString()).toBe('wOF2');
    expect(digest(bytes)).toBe(font.sha256);
    const style = font.file.match(/interface-(regular|semibold|bold)-latin/)[1];
    expect(
      digest(readFileSync(new URL(`source-sans-3-${style}.woff2`, base))),
    ).toBe(font.source_sha256);
  }
});
