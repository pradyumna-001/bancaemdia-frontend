// @vitest-environment node
import { RuleTester } from 'eslint';
import { describe, expect, it } from 'vitest';
import { regraPaleta } from '../../scripts/paleta.mjs';
import { verificarCores } from '../../scripts/check-palette.mjs';
RuleTester.describe = describe;
RuleTester.it = it;
const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});
tester.run('paleta/so-tokens', regraPaleta, {
  valid: [
    "const cor = 'var(--tinta)';",
    "const estado = 'RED';",
    'const link = <a href="#abc">Link</a>;',
    "const image = 'url(/assets/foto.svg#abc)';",
  ],
  invalid: [
    "const cor = '#abc';",
    "const cor = '#aabbccdd';",
    "const cor = 'RGB(0, 1, 2)';",
    'const cor = \x60hsl(123 50% 40%)\x60;',
    "const cor = 'oklch(40% 0.2 20)';",
    'const image = <svg fill={"red"} />;',
    "const cor = 'red';",
  ].map((code) => ({ code, errors: [{ messageId: 'literal' }] })),
});
it.each([
  '#abc',
  '#abcd',
  '#aabbcc',
  'rgb(1 2 3)',
  'hsl(120deg 50% 40%)',
  'oklch(50% 0.1 40)',
  'color(display-p3 1 0 0)',
  'red',
  'transparent',
  'var(--tinta, #fff)',
])('bloqueia cor CSS %s fora dos tokens', (cor) => {
  expect(
    verificarCores('src/app/exemplo.css', '.x { color: ' + cor + '; }'),
  ).toHaveLength(1);
});
it('permite tokens, comentários, URLs e cores apenas no arquivo canônico', () => {
  expect(
    verificarCores(
      'src/app/exemplo.css',
      '/* #abc */ .x { color:var(--tinta); fill:currentColor; background:url(/imagem.svg#abc); }',
    ),
  ).toEqual([]);
  expect(
    verificarCores('src/styles/tokens.css', ':root { --tinta:#abc; }'),
  ).toEqual([]);
  expect(
    verificarCores('src/outro/tokens.css', ':root { --tinta:#abc; }'),
  ).toHaveLength(1);
});
it('detecta atributos SVG e estilos HTML sem rejeitar âncoras', () => {
  expect(
    verificarCores(
      'public/icon.svg',
      '<svg fill="red"><path stroke="#abc"/></svg>',
    ),
  ).toHaveLength(2);
  expect(
    verificarCores(
      'index.html',
      '<p style="color:red">Teste</p><style>.x {color: #fff}</style>',
    ),
  ).toHaveLength(2);
  expect(verificarCores('index.html', '<a href="#abc">Link</a>')).toEqual([]);
});
