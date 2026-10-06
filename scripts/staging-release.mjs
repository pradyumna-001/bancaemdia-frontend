import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isIP } from 'node:net';
import { securityConfig } from './build-csp.mjs';

export const repository = 'pradyumna-001/bancaemdia-frontend';
const shaPattern = /^[0-9a-f]{40}$/;
const digestPattern = /^sha256:[0-9a-f]{64}$/;
const requiredChecks = [
  'Testes (push)',
  'Identidade real (push)',
  'GitGuardian Security Checks',
];

export function approvedRun(run, checks, artifacts) {
  if (
    run.repository?.full_name !== repository ||
    run.head_repository?.full_name !== repository ||
    run.path !== '.github/workflows/ci.yml' ||
    run.event !== 'push' ||
    run.head_branch !== 'main' ||
    run.status !== 'completed' ||
    run.conclusion !== 'success' ||
    !Number.isSafeInteger(run.id) ||
    run.id <= 0 ||
    !shaPattern.test(run.head_sha)
  ) {
    throw new Error(
      'Escolha uma CI de push aprovada da main deste repositório.',
    );
  }
  for (const name of requiredChecks) {
    const matching = checks.filter((check) => check.name === name);
    if (
      matching.length !== 1 ||
      matching[0].head_sha !== run.head_sha ||
      matching[0].status !== 'completed' ||
      matching[0].conclusion !== 'success'
    ) {
      throw new Error(
        'Todos os checks obrigatórios devem aprovar o mesmo SHA.',
      );
    }
  }
  for (const check of checks) {
    // The current dispatch is itself pending on this commit while checking CI.
    if (check.name === 'Promover artefato para homologação') continue;
    if (
      check.head_sha !== run.head_sha ||
      check.status !== 'completed' ||
      check.conclusion !== 'success'
    ) {
      throw new Error(
        'Há outro check aplicável sem aprovação no SHA escolhido.',
      );
    }
  }
  const candidates = artifacts.filter(
    (artifact) => artifact.name === `frontend-${run.head_sha}-push`,
  );
  if (
    candidates.length !== 1 ||
    candidates[0].expired ||
    !Number.isSafeInteger(candidates[0].id) ||
    candidates[0].id <= 0 ||
    !digestPattern.test(candidates[0].digest) ||
    candidates[0].workflow_run?.head_sha !== run.head_sha
  ) {
    throw new Error(
      'Artefato público ausente, expirado ou sem origem verificável.',
    );
  }
  return {
    frontend_sha: run.head_sha,
    ci_run_id: run.id,
    artifact_id: candidates[0].id,
    artifact_digest: candidates[0].digest,
  };
}

export function publicOrigin(value) {
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    url.port ||
    isIP(url.hostname) ||
    url.origin !== value ||
    url.hostname === 'localhost' ||
    !url.hostname.includes('.') ||
    /(^|\.)(example|invalid|test|localhost)$/.test(url.hostname) ||
    /(^|\.)example\.(com|org|net)$/.test(url.hostname)
  ) {
    throw new Error('Informe a origem HTTPS real, sem caminho ou credenciais.');
  }
  return url.origin;
}

export function environmentConfig(env, pin, generatedSchema) {
  if (env.STAGING_ENABLED !== 'true' || env.GITHUB_REF !== 'refs/heads/main') {
    throw new Error(
      'Homologação depende de ativação do operador e execução na main.',
    );
  }
  const origin = publicOrigin(env.STAGING_ORIGIN);
  if (
    !shaPattern.test(env.STAGING_API_SHA) ||
    env.STAGING_API_SHA !== pin.commit ||
    !/['"]\/auth\/session['"]/.test(generatedSchema) ||
    !/['"]\/auth\/refresh['"]/.test(generatedSchema)
  ) {
    throw new Error(
      'Integrar identidade e adotar o OpenAPI da API implantada primeiro.',
    );
  }
  if (
    !/^ghcr\.io\/pradyumna-001\/bancaemdia-api@sha256:[0-9a-f]{64}$/.test(
      env.STAGING_API_IMAGE,
    )
  ) {
    throw new Error('Informe a imagem revisada da API por digest.');
  }
  const issuer = new URL(env.STAGING_ISSUER);
  publicOrigin(issuer.origin);
  if (
    issuer.protocol !== 'https:' ||
    issuer.username ||
    issuer.password ||
    issuer.search ||
    issuer.hash
  ) {
    throw new Error('Informe o emissor OIDC HTTPS aprovado.');
  }
  if (
    !/^[a-zA-Z0-9][a-zA-Z0-9.-]*$/.test(env.STAGING_SSH_HOST ?? '') ||
    !/^[a-z_][a-z0-9_-]{0,31}$/.test(env.STAGING_SSH_USER ?? '')
  ) {
    throw new Error(
      'Host e usuário SSH de homologação não estão configurados.',
    );
  }
  return {
    origin,
    issuer: env.STAGING_ISSUER,
    api_sha: env.STAGING_API_SHA,
    api_image: env.STAGING_API_IMAGE,
    config: {
      VITE_API_URL: origin,
      VITE_APP_ENV: 'staging',
      VITE_UPLOAD_POLL_MS: 1000,
    },
  };
}

export async function verifyArtifact(directory, template) {
  const files = [];
  async function walk(relative = '') {
    for (const entry of await readdir(join(directory, relative), {
      withFileTypes: true,
    })) {
      const path = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink())
        throw new Error('Artefato não admite links simbólicos.');
      if (entry.isDirectory()) {
        if (
          ![
            'dist',
            'dist/assets',
            'dist/fontes',
            'dist/.vite',
            'dist-security',
          ].includes(path)
        ) {
          throw new Error('Diretório inesperado no artefato público.');
        }
        await walk(path);
      } else if (entry.isFile()) {
        if (
          !/^(dist\/(index\.html|config\.json|favicon\.svg|\.vite\/manifest\.json|assets\/[A-Za-z0-9_-]+\.(js|css)|fontes\/[A-Za-z0-9_.-]+\.(woff2|md))|dist-security\/default\.conf)$/.test(
            path,
          )
        )
          throw new Error(
            'Arquivo inesperado: fixture, mapa de código ou fonte não é release.',
          );
        files.push(path);
      } else throw new Error('Tipo de arquivo não permitido no artefato.');
    }
  }
  await walk();
  for (const path of [
    'dist/index.html',
    'dist/.vite/manifest.json',
    'dist-security/default.conf',
  ]) {
    if (!files.includes(path)) throw new Error('Artefato público incompleto.');
  }
  const html = await readFile(join(directory, 'dist/index.html'), 'utf8');
  const actual = await readFile(
    join(directory, 'dist-security/default.conf'),
    'utf8',
  );
  if (actual !== securityConfig(html, template)) {
    throw new Error(
      'HTML e configuração CSP não pertencem à mesma compilação.',
    );
  }
  const hashes = [];
  for (const path of files.sort()) {
    const bytes = await readFile(join(directory, path));
    if (
      /\.js$/.test(path) &&
      /Sessão de demonstração|fixture-session|bancaemdia-shell-fixture/.test(
        bytes.toString(),
      )
    ) {
      throw new Error('Sessão de fixture encontrada no artefato.');
    }
    hashes.push(`${path}:${createHash('sha256').update(bytes).digest('hex')}`);
  }
  return createHash('sha256').update(hashes.join('\n')).digest('hex');
}

function github(path) {
  try {
    return JSON.parse(
      execFileSync('gh', ['api', path], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }),
    );
  } catch {
    throw new Error('Não foi possível verificar os registros de CI no GitHub.');
  }
}

async function main() {
  const [operation, directory = '.staging-artifact'] = process.argv.slice(2);
  if (operation === 'prepare') {
    const id = process.env.CI_RUN_ID;
    if (!/^[1-9]\d*$/.test(id ?? ''))
      throw new Error('Informe o ID numérico da CI de push.');
    const run = github(`repos/${repository}/actions/runs/${id}`);
    if (run.head_sha !== process.env.GITHUB_SHA) {
      throw new Error(
        'Escolha a CI do mesmo SHA da main que executa esta promoção.',
      );
    }
    const checks = github(
      `repos/${repository}/commits/${run.head_sha}/check-runs?filter=latest&per_page=100`,
    );
    const artifacts = github(
      `repos/${repository}/actions/runs/${id}/artifacts?per_page=100`,
    );
    if (
      checks.total_count !== checks.check_runs.length ||
      artifacts.total_count !== artifacts.artifacts.length
    ) {
      throw new Error(
        'Consulta incompleta de checks ou artefatos; não promover.',
      );
    }
    const metadata = approvedRun(run, checks.check_runs, artifacts.artifacts);
    const environment = environmentConfig(
      process.env,
      JSON.parse(await readFile('config/api-contract.json', 'utf8')),
      await readFile('src/api/schema.d.ts', 'utf8'),
    );
    const compared = github(
      `repos/pradyumna-001/bancaemdia-api/compare/${environment.api_sha}...main`,
    );
    if (!['ahead', 'identical'].includes(compared.status))
      throw new Error('A versão da API ainda não foi integrada à main.');
    await mkdir('.staging-release', { recursive: true });
    await writeFile(
      '.staging-release/release.json',
      JSON.stringify({ schema: 1, ...metadata, ...environment }, null, 2) +
        '\n',
    );
    await writeFile(
      process.env.GITHUB_OUTPUT,
      `sha=${metadata.frontend_sha}\nartifact_id=${metadata.artifact_id}\n`,
      { flag: 'a' },
    );
  } else if (operation === 'package') {
    const release = JSON.parse(
      await readFile('.staging-release/release.json', 'utf8'),
    );
    release.content_sha256 = await verifyArtifact(
      resolve(directory),
      await readFile('nginx/default.conf', 'utf8'),
    );
    await writeFile(
      join(directory, 'dist/release.json'),
      JSON.stringify({
        frontend_sha: release.frontend_sha,
        ci_run_id: release.ci_run_id,
        content_sha256: release.content_sha256,
      }) + '\n',
    );
    await writeFile(
      '.staging-release/release.json',
      JSON.stringify(release, null, 2) + '\n',
    );
  } else throw new Error('Operação de homologação inválida.');
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
