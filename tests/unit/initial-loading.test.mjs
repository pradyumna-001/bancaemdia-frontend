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
  expect(manifest.fonts).toHaveLength(3);
  expect(manifest.fonts.reduce((n, f) => n + f.bytes, 0)).toBeLessThan(110_000);
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
