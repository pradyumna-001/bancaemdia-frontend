import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function securityConfig(html, template) {
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  const inline = scripts.filter(
    ([, attributes]) => !/\bsrc\s*=/.test(attributes),
  );
  if (inline.length !== 1 || !/\bid="tema-inicial"/.test(inline[0][1])) {
    throw new Error(
      'O build deve conter somente o script inline de tema conhecido.',
    );
  }
  if (!template.includes('__THEME_HASH__'))
    throw new Error('Marcador CSP ausente.');
  const hash = createHash('sha256').update(inline[0][2]).digest('base64');
  return template.replace('__THEME_HASH__', 'sha256-' + hash);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  mkdirSync('dist-security', { recursive: true });
  writeFileSync(
    'dist-security/default.conf',
    securityConfig(
      readFileSync('dist/index.html', 'utf8'),
      readFileSync('nginx/default.conf', 'utf8'),
    ),
  );
}
