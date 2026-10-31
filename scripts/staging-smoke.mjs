/* global document */
import { readFile, writeFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

async function main() {
  const release = JSON.parse(
    await readFile('.staging-release/release.json', 'utf8'),
  );
  const cookie = process.env.STAGING_SESSION_COOKIE;
  if (!cookie || /[\r\n;]/.test(cookie) || cookie.length > 1024) {
    throw new Error(
      'Configure uma sessão real e recente da conta descartável de homologação.',
    );
  }
  const discovery = await fetch(
    `${release.issuer.replace(/\/$/, '')}/.well-known/openid-configuration`,
    {
      signal: AbortSignal.timeout(15000),
      redirect: 'error',
    },
  );
  if (!discovery.ok) throw new Error('Emissor OIDC indisponível.');
  const oidc = await discovery.json();
  if (oidc.issuer !== release.issuer)
    throw new Error('Emissor OIDC divergente.');
  const authorization = new URL(oidc.authorization_endpoint);
  if (authorization.protocol !== 'https:') throw new Error('OIDC exige HTTPS.');
  const browser = await chromium.launch();
  try {
    const anonymous = await browser.newContext({ baseURL: release.origin });
    try {
      const session = await anonymous.request.get('/auth/session');
      if (
        session.status() !== 401 ||
        !session.headers()['content-type']?.includes('application/json')
      ) {
        throw new Error(
          'Sessão anônima deve ser negada pela API, sem fallback HTML.',
        );
      }
      const start = await anonymous.request.get(
        '/auth/start?return_to=%2F&intent=login',
        { maxRedirects: 0 },
      );
      const location = new URL(start.headers().location);
      if (
        start.status() !== 302 ||
        location.origin !== authorization.origin ||
        location.pathname !== authorization.pathname ||
        location.searchParams.get('code_challenge_method') !== 'S256' ||
        !location.searchParams.get('state') ||
        !location.searchParams.get('nonce') ||
        !/HttpOnly/i.test(start.headers()['set-cookie'] ?? '') ||
        !/;\s*Secure/i.test(start.headers()['set-cookie'] ?? '')
      )
        throw new Error(
          'Entrada hospedada, PKCE ou cookie de fluxo incompatível.',
        );
      const callback = await anonymous.request.get('/auth/callback', {
        maxRedirects: 0,
      });
      if (callback.headers()['content-type']?.includes('text/html')) {
        throw new Error('Callback caiu indevidamente no fallback da SPA.');
      }
    } finally {
      await anonymous.close();
    }

    for (const viewport of [
      { width: 390, height: 844 },
      { width: 1440, height: 900 },
    ]) {
      const context = await browser.newContext({
        baseURL: release.origin,
        viewport,
      });
      try {
        await context.addCookies([
          {
            name: '__Host-bancaemdia_session',
            value: cookie,
            url: release.origin,
            httpOnly: true,
            secure: true,
            sameSite: 'Lax',
          },
        ]);
        const session = await context.request.get('/auth/session', {
          headers: { Origin: release.origin },
        });
        if (
          session.status() !== 200 ||
          !session.headers()['cache-control']?.includes('no-store')
        ) {
          throw new Error('A sessão real de homologação não foi aceita.');
        }
        const cors = session.headers()['access-control-allow-origin'];
        if (cors && cors !== release.origin)
          throw new Error('CORS deve usar a origem exata.');
        const bets = await context.request.get(
          '/api/v1/apostas?page=1&page_size=1',
        );
        if (
          bets.status() !== 200 ||
          !bets.headers()['content-type']?.includes('application/json')
        ) {
          throw new Error('Consulta autenticada da API falhou.');
        }
        const runtime = await context.request.get('/config.json');
        if (
          !runtime.headers()['cache-control']?.includes('no-store') ||
          JSON.stringify(await runtime.json()) !==
            JSON.stringify(release.config)
        )
          throw new Error('Configuração runtime diverge do release.');
        const version = await context.request.get('/release.json');
        const metadata = await version.json();
        if (
          metadata.frontend_sha !== release.frontend_sha ||
          metadata.content_sha256 !== release.content_sha256 ||
          !version.headers()['cache-control']?.includes('no-store')
        )
          throw new Error(
            'Versão pública não corresponde ao artefato promovido.',
          );
        for (const path of [
          '/assets/inexistente.js',
          '/fontes/inexistente.woff2',
          '/metrics',
        ]) {
          if ((await context.request.get(path)).status() !== 404)
            throw new Error('Fallback ou exposição indevida de recurso.');
        }
        const page = await context.newPage();
        await page.addInitScript(() => {
          document.addEventListener('securitypolicyviolation', () => {
            document.documentElement.dataset.cspFailure = 'true';
          });
        });
        const response = await page.goto('/painel?periodo=mes#resumo');
        const csp = response?.headers()['content-security-policy'] ?? '';
        if (
          !csp.includes("connect-src 'self'") ||
          /unsafe-inline|unsafe-eval|\*/.test(csp)
        ) {
          throw new Error('CSP de homologação deve permanecer estrita.');
        }
        await expect(
          page.getByRole('heading', { name: 'Painel', exact: true }),
        ).toBeVisible();
        await page.reload();
        await expect(
          page.getByRole('heading', { name: 'Painel', exact: true }),
        ).toBeVisible();
        if (
          new URL(page.url()).search !== '?periodo=mes' ||
          new URL(page.url()).hash !== '#resumo' ||
          (await page.locator('html').getAttribute('data-csp-failure')) ===
            'true'
        )
          throw new Error(
            'Deep link, hard refresh ou CSP não passou no smoke.',
          );
      } finally {
        await context.close();
      }
    }
    await writeFile(
      '.staging-release/smoke.json',
      JSON.stringify(
        {
          frontend_sha: release.frontend_sha,
          api_sha: release.api_sha,
          origin: release.origin,
          viewports: ['390x844', '1440x900'],
          result: 'passed',
        },
        null,
        2,
      ) + '\n',
    );
  } finally {
    await browser.close();
  }
}

// No traces, screenshots, cookies, protocol URLs or personal API payloads in CI.
main().catch(() => {
  console.error(
    'Smoke real não passou: conferir versão, sessão, emissor, API e proxy.',
  );
  process.exitCode = 1;
});
