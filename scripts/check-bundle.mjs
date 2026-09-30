import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, relative, isAbsolute } from 'node:path';
import { gzipSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';

export const INITIAL_JS_LIMIT = 200_000;

export function inspectBundle(directory, limit = INITIAL_JS_LIMIT) {
  const root = resolve(directory);
  const read = (file) => {
    const path = resolve(root, file);
    const inside = relative(root, path);
    if (inside.startsWith('..') || isAbsolute(inside))
      throw new Error('Asset fora do diretório de build.');
    return readFileSync(path);
  };
  const manifest = JSON.parse(read('.vite/manifest.json').toString());
  const html = read('index.html').toString();
  const files = new Map();
  const visited = new Set();
  const visit = (key) => {
    if (visited.has(key)) return;
    visited.add(key);
    const chunk = manifest[key];
    if (!chunk?.file) throw new Error('Import ausente no manifesto: ' + key);
    if (/\.m?js$/.test(chunk.file)) files.set(chunk.file, read(chunk.file));
    for (const dependency of chunk.imports ?? []) visit(dependency);
    // dynamicImports are downloaded only after navigation and are not initial JS.
  };
  const addUrl = (url) => {
    if (/^(?:[a-z]+:|\/\/)/i.test(url))
      throw new Error('JavaScript inicial externo não pode escapar do budget.');
    const file = decodeURIComponent(url.split(/[?#]/)[0]).replace(/^\//, '');
    const key = Object.keys(manifest).find(
      (key) => manifest[key].file === file,
    );
    if (key) visit(key);
    else files.set(file, read(file));
  };
  let externalScripts = 0;
  let inlineCount = 0;
  for (const [, attributes, body] of html.matchAll(
    /<script\b([^>]*)>([\s\S]*?)<\/script>/gi,
  )) {
    const src = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(attributes);
    if (src) {
      externalScripts++;
      addUrl(src[1]);
    } else if (
      !/\btype\s*=\s*["'](?:application\/ld\+json|importmap)["']/i.test(
        attributes,
      )
    ) {
      files.set('inline-' + ++inlineCount, Buffer.from(body));
    }
  }
  for (const [, attributes] of html.matchAll(/<link\b([^>]+)>/gi)) {
    if (!/\brel\s*=\s*["']modulepreload["']/i.test(attributes)) continue;
    const href = /\bhref\s*=\s*["']([^"']+)["']/i.exec(attributes);
    if (!href) throw new Error('Preload sem endereço.');
    addUrl(href[1]);
  }
  if (!externalScripts) throw new Error('Build sem entrada JavaScript.');
  const assets = [...files].map(([file, bytes]) => ({
    file,
    bytes: bytes.length,
    gzipBytes: gzipSync(bytes, { level: 9 }).length,
  }));
  const totalGzipBytes = assets.reduce(
    (sum, asset) => sum + asset.gzipBytes,
    0,
  );
  return {
    limitBytes: limit,
    totalGzipBytes,
    passed: totalGzipBytes <= limit,
    assets,
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const report = inspectBundle('dist');
  mkdirSync('reports', { recursive: true });
  writeFileSync('reports/bundle.json', JSON.stringify(report, null, 2) + '\n');
  console.log(
    `JS inicial gzip: ${report.totalGzipBytes} / ${report.limitBytes} bytes`,
  );
  if (!report.passed)
    throw new Error('Orçamento de JavaScript inicial excedido.');
}
