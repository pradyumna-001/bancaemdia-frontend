// @vitest-environment node
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { criarFavicon } from '../../scripts/favicon-vite';

it('favicon resolve cores da fonte canônica sem depender de CSS ou fontes externos', () => {
  const svg = readFileSync(
    new URL('../../src/marca/favicon.svg', import.meta.url),
    'utf8',
  );
  const css = readFileSync(
    new URL('../../src/styles/tokens.css', import.meta.url),
    'utf8',
  );
  const result = criarFavicon(svg, css);
  expect(result).not.toMatch(/var\(|<style|<script|<text|href=/);
  expect(result).toContain('viewBox="0 0 32 32"');
  expect(result).toContain('bancaemdia');
  expect(
    criarFavicon(
      '<svg fill="var(--marca)" />',
      ':root { --marca: #123456; } :root[data-tema="escuro"] { --marca: #abcdef; }',
    ),
  ).toBe('<svg fill="#123456" />');
});

it('token ausente ou não resolvido impede gerar uma marca invisível', () => {
  expect(() => criarFavicon('var(--ausente)', ':root {}')).toThrow();
  expect(() =>
    criarFavicon('var(--marca)', ':root { --marca: var(--outra); }'),
  ).toThrow();
});
