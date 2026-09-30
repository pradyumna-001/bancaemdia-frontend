import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import postcss from 'postcss';
import { corLiteral } from './paleta.mjs';

export function verificarCores(file, source) {
  const errors = [];
  if (file.replaceAll('\\', '/') === 'src/styles/tokens.css') return errors;
  if (file.endsWith('.css')) {
    postcss.parse(source, { from: file }).walkDecls((declaration) => {
      const cor = corLiteral(declaration.value, true);
      if (cor)
        errors.push(
          file + ':' + declaration.source.start.line + ': cor literal ' + cor,
        );
    });
  } else {
    // CSS inline e atributos de apresentação em HTML/SVG também são protegidos.
    for (const match of source.matchAll(
      /\b(?:fill|stroke|color|bgcolor)\s*=\s*["']([^"']+)["']/gi,
    )) {
      const cor = corLiteral(match[1], true);
      if (cor) errors.push(file + ': cor literal ' + cor);
    }
    for (const match of source.matchAll(/\bstyle\s*=\s*["']([^"']+)["']/gi)) {
      errors.push(
        ...verificarCores(file + '.css', 'elemento {' + match[1] + '}'),
      );
    }
    for (const match of source.matchAll(
      /<style\b[^>]*>([\s\S]*?)<\/style>/gi,
    )) {
      errors.push(...verificarCores(file + '.css', match[1]));
    }
  }
  return errors;
}
function filesIn(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? filesIn(file) : [file];
  });
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const files = [...filesIn('src'), ...filesIn('public'), 'index.html'].filter(
    (f) => /\.(css|html|svg)$/.test(f),
  );
  const errors = files.flatMap((file) =>
    verificarCores(file, readFileSync(file, 'utf8')),
  );
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else console.log('Paleta única: CSS, HTML e SVG aprovados.');
}
