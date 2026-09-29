import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import openapiTS, { astToString } from 'openapi-typescript';
import { format, resolveConfig } from 'prettier';

// Snapshot oficial já integrado em bancaemdia-api/main; ver README.
const defaultSource =
  'https://raw.githubusercontent.com/pradyumna-001/bancaemdia-api/bd055417459f796fed960b5b37efb33a9744419f/tests/contract/schemas/openapi.json';
const source = process.argv[2] ?? defaultSource;
const input = /^https?:\/\//.test(source)
  ? new URL(source)
  : pathToFileURL(resolve(source));

try {
  const schema = astToString(await openapiTS(input));
  const output = await format(schema, {
    ...(await resolveConfig('src/api/schema.d.ts')),
    parser: 'typescript',
  });
  await mkdir('src/api', { recursive: true });
  await writeFile('src/api/schema.d.ts', output);
  console.info(
    `Tipos gerados em src/api/schema.d.ts a partir de ${input.href}`,
  );
} catch (error) {
  console.error(
    'Não foi possível gerar os tipos. Confira a fonte OpenAPI e a conexão.',
    error.message,
  );
  process.exitCode = 1;
}
