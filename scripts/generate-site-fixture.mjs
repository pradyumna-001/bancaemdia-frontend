import { readFile, writeFile } from 'node:fs/promises';
import { format, resolveConfig } from 'prettier';
import { contractSource, verifiedSchema } from './api-contract.mjs';
import { siteReadContract } from './site-read-contract.mjs';

// One independent dependency snapshot, used exclusively by test builds.
const pin = {
  repository: 'pradyumna-001/bancaemdia-api',
  commit: '9b42a3579518a84d348d272afbaeff88f9119825',
  schemaPath: 'tests/contract/schemas/openapi.json',
  sha256: 'ed837f9a47ea15e839c543412f9aee2bd9a90332ae0a54936c95235c6d432bd5',
};
const local = process.argv[2];
let bytes;
if (local) bytes = await readFile(local);
else {
  const response = await fetch(contractSource(pin), {
    signal: AbortSignal.timeout(30_000),
    redirect: 'error',
  });
  if (!response.ok)
    throw new Error('O contrato pinado do exercício está indisponível.');
  bytes = Buffer.from(await response.arrayBuffer());
}
const document = verifiedSchema(pin, bytes);
await writeFile(
  'tests/fixtures/apostas-contract.generated.ts',
  await format(
    '// Dependency exercise only. Not the public contract, not a composed schema.\n' +
      `export const FILTER_API_COMMIT = ${JSON.stringify(pin.commit)};\n` +
      `export const FILTER_API_SCHEMA_SHA256 = ${JSON.stringify(pin.sha256)};\n` +
      `export const FILTER_READ_CONTRACT = ${JSON.stringify(siteReadContract(document))} as const;\n`,
    { ...(await resolveConfig('src/api/schema.d.ts')), parser: 'typescript' },
  ),
);
