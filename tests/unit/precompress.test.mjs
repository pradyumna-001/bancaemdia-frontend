// @vitest-environment node
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import { afterEach, expect, it } from 'vitest';
import { precomprimir } from '../../scripts/precompress-vite';

const pastas = [];
afterEach(() =>
  pastas.splice(0).forEach((p) => rmSync(p, { recursive: true })),
);

it('grava gzip padrão só para os tipos e o tamanho mínimo do nginx', async () => {
  const raiz = mkdtempSync(join(tmpdir(), 'precompressao-'));
  pastas.push(raiz);
  mkdirSync(join(raiz, 'assets'));
  const grande = (marca) =>
    Buffer.from(
      Array.from({ length: 400 }, (_, i) => `${marca}(${i % 37});`).join('\n'),
    );
  const arquivos = {
    'index.html': grande('html'),
    'assets/index-a.js': grande('js'),
    'assets/style-a.css': grande('css'),
    'favicon.svg': grande('svg'),
    'assets/pequeno.js': Buffer.from('curto();'),
    'config.json': grande('json'),
    'fonte.woff2': grande('fonte'),
  };
  for (const [nome, bytes] of Object.entries(arquivos))
    writeFileSync(join(raiz, nome), bytes);

  const feitos = await precomprimir(raiz);

  expect(
    feitos.map((f) => f.slice(raiz.length + 1).replace(/\\/g, '/')),
  ).toEqual([
    'assets/index-a.js',
    'assets/style-a.css',
    'favicon.svg',
    'index.html',
  ]);
  for (const arquivo of feitos) {
    const comprimido = readFileSync(arquivo + '.gz');
    const original = readFileSync(arquivo);
    expect(gunzipSync(comprimido)).toEqual(original);
    // Never larger than the on-the-fly level 6 it replaces.
    expect(comprimido.length).toBeLessThanOrEqual(
      gzipSync(original, { level: 6 }).length,
    );
  }
  expect(readdirSync(raiz).sort()).toEqual(
    [
      'assets',
      'config.json',
      'favicon.svg',
      'favicon.svg.gz',
      'fonte.woff2',
      'index.html',
      'index.html.gz',
    ].sort(),
  );
  // Deterministic: the same input writes the same bytes.
  const antes = readFileSync(join(raiz, 'index.html.gz'));
  await precomprimir(join(raiz));
  expect(readFileSync(join(raiz, 'index.html.gz'))).toEqual(antes);
});
