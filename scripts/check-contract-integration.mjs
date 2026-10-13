import { readFile } from 'node:fs/promises';
import { requireIntegratedContract } from './api-contract.mjs';
try {
  const pin = JSON.parse(await readFile('config/api-contract.json', 'utf8'));
  requireIntegratedContract(pin);
  const response = await fetch(
    `https://api.github.com/repos/${pin.repository}/compare/${pin.commit}...main`,
    {
      headers: { Accept: 'application/vnd.github+json' },
      signal: AbortSignal.timeout(30_000),
      redirect: 'error',
    },
  );
  if (!response.ok)
    throw new Error(
      'Não foi possível comprovar a integração do contrato backend.',
    );
  const comparison = await response.json();
  if (!['ahead', 'identical'].includes(comparison.status))
    throw new Error('O commit do contrato não está integrado na main backend.');
  console.info(
    'Contrato backend integrado: publicação pode prosseguir conforme os demais gates.',
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
