import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipAsync } from '@gfx/zopfli';
import type { Plugin } from 'vite';

// Same selection as the on-the-fly gzip of nginx/default.conf (gzip_types plus
// text/html, gzip_min_length 1024). nginx serves `<arquivo>.gz` through
// gzip_static; any other client still receives the original bytes.
const COMPRIMIVEIS = /\.(html|css|js|svg)$/;
const MINIMO = 1024;

export function arquivosComprimiveis(raiz: string): string[] {
  return readdirSync(raiz, { recursive: true, encoding: 'utf8' })
    .map((nome) => join(raiz, nome))
    .filter(
      (arquivo) =>
        COMPRIMIVEIS.test(arquivo) &&
        statSync(arquivo).isFile() &&
        statSync(arquivo).size >= MINIMO,
    )
    .sort();
}

export async function precomprimir(raiz: string): Promise<string[]> {
  const arquivos = arquivosComprimiveis(raiz);
  // Zopfli writes standard gzip, smaller than zlib at any level; deterministic.
  for (const arquivo of arquivos)
    writeFileSync(
      arquivo + '.gz',
      await gzipAsync(readFileSync(arquivo), { numiterations: 15 }),
    );
  return arquivos;
}

export function precompressaoGzip(): Plugin {
  return {
    name: 'precompressao-gzip',
    apply: 'build',
    async writeBundle(options) {
      if (options.dir) await precomprimir(options.dir);
    },
  };
}
