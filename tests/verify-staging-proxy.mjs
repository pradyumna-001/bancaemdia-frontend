// Disposable routing harness, not public homologation or a real API/identity proof.
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtemp, cp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, basename, resolve } from 'node:path';
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { verifyArtifact } from '../scripts/staging-release.mjs';

const identifier = 'frontend-edge-test-' + randomUUID().replaceAll('-', '');
const names = [
  identifier + '-api',
  identifier + '-frontend',
  identifier + '-proxy',
];
const directory = await mkdtemp(join(tmpdir(), 'frontend-edge-test-'));
const sha = execFileSync('git', ['rev-parse', 'HEAD'], {
  encoding: 'utf8',
}).trim();
function docker(...args) {
  return execFileSync('docker', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

async function removeHarnessDirectory() {
  if (
    dirname(directory) !== tmpdir() ||
    !basename(directory).startsWith('frontend-edge-test-')
  )
    throw new Error('Unexpected cleanup path');
  await rm(directory, { recursive: true, force: true });
}

try {
  await cp('dist', join(directory, 'dist'), { recursive: true });
  await cp('dist-security', join(directory, 'dist-security'), {
    recursive: true,
  });
  await verifyArtifact(directory, await readFile('nginx/default.conf', 'utf8'));
  await writeFile(
    join(directory, 'dist/release.json'),
    JSON.stringify({ frontend_sha: sha }) + '\n',
  );
  await writeFile(join(directory, 'config.json'), '{}');
  docker(
    'build',
    '--file',
    resolve('deploy/staging/Dockerfile'),
    '--build-arg',
    `FRONTEND_SHA=${sha}`,
    '--tag',
    identifier,
    directory,
  );
  assert.equal(
    docker(
      'image',
      'inspect',
      '--format',
      '{{index .Config.Labels "org.opencontainers.image.revision"}}',
      identifier,
    ),
    sha,
  );
  docker('network', 'create', identifier);
  const stub = `require('node:http').createServer((request,response)=>{response.writeHead(request.url.startsWith('/auth/') || request.url.startsWith('/api/') ? 401 : 200, {'Content-Type':'application/json','Cache-Control':'no-store'});response.end(JSON.stringify({source:'disposable-routing-harness', path:request.url.split('?')[0]}));}).listen(8000,'0.0.0.0');`;
  docker(
    'run',
    '--detach',
    '--name',
    names[0],
    '--network',
    identifier,
    '--network-alias',
    'api',
    'node:22.22.0-alpine',
    'node',
    '-e',
    stub,
  );
  docker(
    'run',
    '--detach',
    '--name',
    names[1],
    '--network',
    identifier,
    '--network-alias',
    'frontend-staging',
    '--read-only',
    '--tmpfs',
    '/tmp',
    '--cap-drop',
    'ALL',
    '--security-opt',
    'no-new-privileges:true',
    '--mount',
    `type=bind,source=${join(directory, 'config.json')},target=/usr/share/nginx/html/config.json,readonly`,
    identifier,
  );
  docker(
    'run',
    '--detach',
    '--name',
    names[2],
    '--network',
    identifier,
    '--publish',
    '127.0.0.1::80',
    '--env',
    'SITE_DOMAIN=http://:80',
    '--mount',
    `type=bind,source=${resolve('deploy/staging/Caddyfile')},target=/etc/caddy/Caddyfile,readonly`,
    'caddy:2.10.2-alpine',
  );
  const bound = docker('port', names[2], '80/tcp');
  assert.match(bound, /^127\.0\.0\.1:\d+$/);
  const origin = `http://${bound}`;
  await writeFile(
    join(directory, 'config.json'),
    JSON.stringify({
      VITE_API_URL: origin,
      VITE_APP_ENV: 'development',
      VITE_UPLOAD_POLL_MS: 1000,
    }),
  );
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      const response = await fetch(origin + '/ready');
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {
      /* Containers can still be starting. */
    }
    await new Promise((done) => setTimeout(done, 1000));
  }
  assert.equal(ready, true, 'Disposable proxy must become ready');
  for (const path of [
    '/auth/session',
    '/auth/callback',
    '/api/v1/apostas',
    '/health',
    '/ready',
  ]) {
    const response = await fetch(origin + path + '?code=routing-sentinel', {
      headers: {
        Cookie: 'routing-sentinel=value',
        Authorization: 'Bearer routing-sentinel',
      },
    });
    const body = await response.json();
    assert.equal(body.source, 'disposable-routing-harness');
    assert.equal(body.path, path, 'Proxy must preserve protocol prefixes');
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
  for (const path of [
    '/metrics',
    '/metrics/private',
    '/assets/missing.js',
    '/fontes/missing.woff2',
  ]) {
    assert.equal((await fetch(origin + path)).status, 404);
  }
  const runtime = await fetch(origin + '/config.json');
  assert.equal(runtime.headers.get('cache-control'), 'no-store');
  assert.equal((await runtime.json()).VITE_API_URL, origin);
  const version = await fetch(origin + '/release.json');
  assert.equal(version.headers.get('cache-control'), 'no-store');
  assert.equal((await version.json()).frontend_sha, sha);
  const html = await fetch(origin + '/tutorial');
  const csp = html.headers.get('content-security-policy');
  assert.ok(csp.includes("connect-src 'self'"));
  assert.ok(csp.includes("script-src 'self' 'sha256-"));
  assert.equal(/unsafe-inline|unsafe-eval|\*/.test(csp), false);
  const browser = await chromium.launch();
  try {
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 1440, height: 900 },
    ]) {
      const page = await browser.newPage({ viewport });
      await page.goto(origin + '/tutorial');
      await expect(
        page.getByText('Esta página está em preparação.'),
      ).toBeVisible();
      await page.reload();
      await expect(
        page.getByText('Esta página está em preparação.'),
      ).toBeVisible();
      await page.goto(origin + '/painel?periodo=mes#resumo');
      await expect(
        page.getByRole('heading', { name: 'Entrar', exact: true }),
      ).toBeVisible();
      assert.equal(
        new URL(page.url()).searchParams.get('destino'),
        '/painel?periodo=mes#resumo',
      );
      await page.close();
    }
  } finally {
    await browser.close();
  }
  assert.equal(docker('logs', names[2]).includes('routing-sentinel'), false);
  console.log(
    'Borda descartável: prefixos, privacidade, CSP, artefato e F5 nos dois viewports aprovados. Não é deploy público.',
  );
} finally {
  for (const name of [...names].reverse()) {
    try {
      docker('rm', '--force', name);
    } catch {
      /* Only this harness's named resources. */
    }
  }
  try {
    docker('network', 'rm', identifier);
  } catch {
    /* Network may not have been created. */
  }
  try {
    docker('image', 'rm', identifier);
  } catch {
    /* Image may not have been created. */
  }
  await removeHarnessDirectory();
}
