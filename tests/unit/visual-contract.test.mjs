// @vitest-environment node
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import { expect, it } from 'vitest';
import { securityConfig } from '../../scripts/build-csp.mjs';
const css = readFileSync(
  new URL('../../src/styles/tokens.css', import.meta.url),
  'utf8',
);
const themes = { claro: {}, escuro: {} };
postcss.parse(css).walkRules((rule) => {
  const target = rule.selector === ':root' ? themes.claro : themes.escuro;
  rule.walkDecls((d) => {
    target[d.prop] = d.value;
  });
});
themes.escuro = { ...themes.claro, ...themes.escuro };
function luminancia(hex) {
  const rgb = hex
    .slice(1)
    .match(/../g)
    .map((v) => parseInt(v, 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function contraste(a, b) {
  const [min, max] = [luminancia(a), luminancia(b)].sort((x, y) => x - y);
  return (max + 0.05) / (min + 0.05);
}
for (const [name, tokens] of Object.entries(themes)) {
  it(
    name + ': texto, estados, ações, foco e controles mantêm contraste',
    () => {
      for (const background of [
        '--fundo',
        '--superficie',
        '--superficie-secundaria',
      ]) {
        for (const foreground of ['--tinta', '--tinta-secundaria', '--acao']) {
          expect(
            contraste(tokens[foreground], tokens[background]),
            foreground + ' sobre ' + background,
          ).toBeGreaterThanOrEqual(4.5);
        }
        for (const control of ['--foco', '--borda-controle']) {
          expect(
            contraste(tokens[control], tokens[background]),
            control + ' sobre ' + background,
          ).toBeGreaterThanOrEqual(3);
        }
      }
      for (const state of ['lucro', 'perda', 'atencao']) {
        expect(
          contraste(tokens['--' + state], tokens['--' + state + '-fundo']),
        ).toBeGreaterThanOrEqual(4.5);
      }
      for (const action of ['--acao', '--acao-hover']) {
        expect(
          contraste(tokens['--sobre-acao'], tokens[action]),
        ).toBeGreaterThanOrEqual(4.5);
      }
    },
  );
}
it('autoriza exatamente o conteúdo inline e rejeita scripts adicionais', () => {
  const script = '\nwindow.tema = true;\n';
  const hash = createHash('sha256').update(script).digest('base64');
  const html =
    '<script id="tema-inicial">' +
    script +
    '</script><script src="/assets/app.js"></script>';
  expect(securityConfig(html, "script-src 'self' '__THEME_HASH__'")).toBe(
    "script-src 'self' 'sha256-" + hash + "'",
  );
  expect(() =>
    securityConfig(html + '<script>injetado()</script>', '__THEME_HASH__'),
  ).toThrow();
  expect(() =>
    securityConfig('<script src="/a.js"></script>', '__THEME_HASH__'),
  ).toThrow();
  expect(() => securityConfig(html, "script-src 'self'")).toThrow();
});
it('fontes locais são WOFF2 e todas as faces usam swap', () => {
  for (const weight of ['regular', 'semibold', 'bold']) {
    const font = readFileSync(
      new URL(
        '../../public/fontes/source-sans-3-' + weight + '.woff2',
        import.meta.url,
      ),
    );
    expect(font.subarray(0, 4).toString()).toBe('wOF2');
  }
  const base = postcss.parse(
    readFileSync(new URL('../../src/styles/base.css', import.meta.url), 'utf8'),
  );
  let faces = 0;
  base.walkAtRules('font-face', (rule) => {
    faces++;
    const declarations = Object.fromEntries(
      rule.nodes.filter((n) => n.type === 'decl').map((d) => [d.prop, d.value]),
    );
    expect(declarations['font-display']).toBe('swap');
    expect(declarations.src).toMatch(/url\(['"]?\/fontes\//);
  });
  expect(faces).toBe(3);
  expect(
    readFileSync(
      new URL('../../public/fontes/OFL-source-sans-3.md', import.meta.url),
      'utf8',
    ),
  ).toContain('SIL OPEN FONT LICENSE');
});
