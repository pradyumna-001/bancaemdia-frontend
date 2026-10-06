// @vitest-environment node
import { expect, it, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import {
  approvedRun,
  environmentConfig,
  publicOrigin,
  verifyArtifact,
  repository,
} from '../../scripts/staging-release.mjs';
import { securityConfig } from '../../scripts/build-csp.mjs';

const sha = 'a'.repeat(40);
const run = {
  id: 123,
  repository: { full_name: repository },
  head_repository: { full_name: repository },
  path: '.github/workflows/ci.yml',
  event: 'push',
  head_branch: 'main',
  head_sha: sha,
  status: 'completed',
  conclusion: 'success',
};
const checks = [
  'Testes (push)',
  'Identidade real (push)',
  'GitGuardian Security Checks',
].map((name) => ({
  name,
  head_sha: sha,
  status: 'completed',
  conclusion: 'success',
}));
const artifact = {
  id: 42,
  name: `frontend-${sha}-push`,
  expired: false,
  digest: 'sha256:' + 'b'.repeat(64),
  workflow_run: { head_sha: sha },
};

it('seleciona somente o artefato público do SHA aprovado da main', () => {
  expect(approvedRun(run, checks, [artifact])).toEqual({
    frontend_sha: sha,
    ci_run_id: 123,
    artifact_id: 42,
    artifact_digest: artifact.digest,
  });
});
it.each([
  { event: 'pull_request' },
  { head_branch: 'feature' },
  { conclusion: 'failure' },
  { status: 'in_progress' },
  { head_sha: 'main' },
  { path: '.github/workflows/identity-contract.yml' },
  { repository: { full_name: 'someone/other' } },
  { head_repository: { full_name: 'fork/repo' } },
])('recusa origem de CI não publicável: %j', (changes) => {
  expect(() =>
    approvedRun({ ...run, ...changes }, checks, [artifact]),
  ).toThrow();
});
it.each(['queued', 'in_progress', 'failure', 'cancelled', 'skipped'])(
  'não aceita segurança pendente ou não aprovada: %s',
  (state) => {
    expect(() =>
      approvedRun(
        run,
        [
          ...checks.slice(0, 2),
          {
            ...checks[2],
            status: state === 'in_progress' ? state : 'completed',
            conclusion: state,
          },
        ],
        [artifact],
      ),
    ).toThrow();
  },
);
it('não reutiliza aprovação de outro commit nem check ausente', () => {
  expect(() => approvedRun(run, checks.slice(1), [artifact])).toThrow();
  expect(() =>
    approvedRun(
      run,
      checks.map((check) => ({ ...check, head_sha: 'c'.repeat(40) })),
      [artifact],
    ),
  ).toThrow();
});
it('exige também checks adicionais e exclui somente a própria promoção em andamento', () => {
  const extra = {
    name: 'Outra verificação',
    head_sha: sha,
    status: 'completed',
    conclusion: 'failure',
  };
  expect(() => approvedRun(run, [...checks, extra], [artifact])).toThrow();
  expect(
    approvedRun(
      run,
      [
        ...checks,
        {
          ...extra,
          name: 'Promover artefato para homologação',
          status: 'in_progress',
          conclusion: null,
        },
      ],
      [artifact],
    ).frontend_sha,
  ).toBe(sha);
});
it.each([
  { expired: true },
  { name: 'validation-push-123' },
  { digest: null },
  { workflow_run: { head_sha: 'c'.repeat(40) } },
])('recusa artefato impróprio: %j', (changes) => {
  expect(() =>
    approvedRun(run, checks, [{ ...artifact, ...changes }]),
  ).toThrow();
});

// Pure validation fixtures; these addresses are never configured or deployed.
const env = {
  STAGING_ENABLED: 'true',
  GITHUB_REF: 'refs/heads/main',
  STAGING_ORIGIN: 'https://app.unit-fixture.org',
  STAGING_ISSUER: 'https://issuer.unit-fixture.org/realm',
  STAGING_API_SHA: sha,
  STAGING_API_IMAGE:
    'ghcr.io/pradyumna-001/bancaemdia-api@sha256:' + 'b'.repeat(64),
  STAGING_SSH_HOST: 'host.unit-fixture.org',
  STAGING_SSH_USER: 'deploy',
};
it('gera apenas configuração pública e exige contrato de identidade integrado', () => {
  const result = environmentConfig(
    env,
    { commit: sha },
    "'/auth/session': {}; '/auth/refresh': {};",
  );
  expect(result.config).toEqual({
    VITE_API_URL: env.STAGING_ORIGIN,
    VITE_APP_ENV: 'staging',
    VITE_UPLOAD_POLL_MS: 1000,
  });
  expect(JSON.stringify(result)).not.toContain('PRIVATE_KEY');
  expect(() =>
    environmentConfig(env, { commit: sha }, "'/api/v1/apostas': {};"),
  ).toThrow();
  expect(() =>
    environmentConfig(
      env,
      { commit: 'c'.repeat(40) },
      "'/auth/session': {}; '/auth/refresh': {};",
    ),
  ).toThrow();
});
it.each([
  { STAGING_ENABLED: '' },
  { GITHUB_REF: 'refs/heads/feature' },
  { STAGING_API_IMAGE: 'ghcr.io/pradyumna-001/bancaemdia-api:latest' },
  { STAGING_SSH_HOST: 'host;touch bad' },
  { STAGING_SSH_USER: 'deploy $(command)' },
])('recusa ativação ou parâmetros inválidos: %j', (changes) => {
  expect(() =>
    environmentConfig(
      { ...env, ...changes },
      { commit: sha },
      "'/auth/session': {}; '/auth/refresh': {};",
    ),
  ).toThrow();
});
it.each([
  'http://app.unit-fixture.org',
  'https://localhost',
  'https://127.0.0.1',
  'https://example.com',
  'https://app.invalid',
  'https://app.unit-fixture.org/api/v1',
  'https://user:password@app.unit-fixture.org',
  'https://app.unit-fixture.org?token=value',
])('não inventa homologação nem aceita origem ambígua: %s', (url) => {
  expect(() => publicOrigin(url)).toThrow();
});

const directories = [];
const html =
  '<script id="tema-inicial">document.documentElement.dataset.tema="escuro";</script><div id="root"></div>';
const template = "script-src 'self' '__THEME_HASH__';";
async function artifactDirectory() {
  const directory = await mkdtemp(join(tmpdir(), 'staging-release-test-'));
  directories.push(directory);
  await mkdir(join(directory, 'dist/.vite'), { recursive: true });
  await mkdir(join(directory, 'dist/assets'));
  await mkdir(join(directory, 'dist-security'));
  await writeFile(join(directory, 'dist/index.html'), html);
  await writeFile(join(directory, 'dist/.vite/manifest.json'), '{}');
  await writeFile(
    join(directory, 'dist/assets/index-AbCd12.js'),
    'export const publicBuild = true;',
  );
  await writeFile(
    join(directory, 'dist-security/default.conf'),
    securityConfig(html, template),
  );
  return directory;
}
afterEach(async () => {
  for (const directory of directories.splice(0)) {
    if (
      dirname(directory) !== tmpdir() ||
      !basename(directory).startsWith('staging-release-test-')
    )
      throw new Error('Unexpected cleanup path');
    await rm(directory, { recursive: true, force: true });
  }
});
it('fingerprint muda quando qualquer byte do build aprovado muda', async () => {
  const directory = await artifactDirectory();
  const first = await verifyArtifact(directory, template);
  await writeFile(
    join(directory, 'dist/assets/index-AbCd12.js'),
    'export const publicBuild = false;',
  );
  expect(await verifyArtifact(directory, template)).not.toBe(first);
});
it.each([
  'dist/assets/source.map',
  'dist/source.ts',
  'dist-shell-fixture/index.html',
])('não publica código ou fixture: %s', async (path) => {
  const directory = await artifactDirectory();
  await mkdir(dirname(join(directory, path)), { recursive: true });
  await writeFile(join(directory, path), 'private fixture');
  await expect(verifyArtifact(directory, template)).rejects.toThrow();
});
it('recusa HTML/CSP misturados e sessão de fixture no JavaScript', async () => {
  const directory = await artifactDirectory();
  await writeFile(
    join(directory, 'dist/index.html'),
    html.replace('escuro', 'claro'),
  );
  await expect(verifyArtifact(directory, template)).rejects.toThrow();
  await writeFile(join(directory, 'dist/index.html'), html);
  await writeFile(
    join(directory, 'dist/assets/index-AbCd12.js'),
    'fixture-session',
  );
  await expect(verifyArtifact(directory, template)).rejects.toThrow();
});
it('recusa symlink em vez de seguir arquivo externo', async () => {
  const directory = await artifactDirectory();
  // Junctions also expose directory escape on Windows without symlink privilege.
  await symlink(
    join(directory, 'dist/.vite'),
    join(directory, 'dist/assets/linked'),
    'junction',
  );
  await expect(verifyArtifact(directory, template)).rejects.toThrow();
});
it('exercita rollback, concorrência e extração segura com stdlib Python', () => {
  execFileSync(
    process.env.STAGING_TEST_PYTHON ?? 'python3',
    ['-m', 'unittest', 'discover', '-s', 'tests/staging', '-v'],
    { stdio: 'pipe' },
  );
});
