/* global document, getComputedStyle */
import { chromium, firefox, webkit, expect } from '@playwright/test';

for (const [name, browserType] of Object.entries({
  chromium,
  firefox,
  webkit,
})) {
  const browser = await browserType.launch();
  try {
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 1440, height: 900 },
    ]) {
      const page = await browser.newPage({ viewport });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.addInitScript(() => {
        document.addEventListener('securitypolicyviolation', () => {
          document.documentElement.dataset.cspFailure = 'true';
        });
      });
      for (const path of [
        '/tutorial',
        '/extensao',
        '/criar-conta',
        '/redefinir-senha',
      ]) {
        await page.goto(`http://127.0.0.1:8080${path}`);
        await expect(
          page.getByText('Esta página está em preparação.'),
        ).toBeVisible();
        await page.reload();
        await expect(
          page.getByText('Esta página está em preparação.'),
        ).toBeVisible();
      }
      await page.goto('http://127.0.0.1:8080/aposta/abc?apagadas=1#foto');
      await expect(
        page.getByRole('heading', { name: 'Entrar', exact: true }),
      ).toBeVisible();
      expect(new URL(page.url()).searchParams.get('destino')).toBe(
        '/aposta/abc?apagadas=1#foto',
      );
      await page.goto('http://127.0.0.1:8080/nao-existe');
      await expect(
        page.getByRole('heading', { name: 'Não achei esta página' }),
      ).toBeVisible();
      const styles = await page.locator('.pagina-erro').evaluate((element) => ({
        radius: getComputedStyle(element).borderRadius,
        border: getComputedStyle(element).borderTopWidth,
      }));
      expect(styles).toEqual({ radius: '12px', border: '1px' });
      await page.getByRole('radio', { name: 'Escuro', exact: true }).check();
      await page.reload();
      await expect(page.locator('html')).toHaveAttribute('data-tema', 'escuro');
      await page.getByRole('radio', { name: 'Claro', exact: true }).check();
      await page.reload();
      await expect(page.locator('html')).toHaveAttribute('data-tema', 'claro');
      const htmlResponse = await page.request.get(
        'http://127.0.0.1:8080/tutorial',
      );
      const csp = htmlResponse.headers()['content-security-policy'];
      expect(csp).toContain("connect-src 'self'");
      const config = await page.request.get(
        'http://127.0.0.1:8080/config.json',
      );
      expect((await config.json()).VITE_API_URL).toBe('http://127.0.0.1:8080');
      for (const path of [
        '/auth/session',
        '/auth/callback',
        '/api/v1/apostas',
      ]) {
        const unavailable = await page.request.get(
          `http://127.0.0.1:8080${path}`,
        );
        expect(unavailable.status()).toBe(503);
        expect(unavailable.headers()['content-type']).toContain(
          'application/json',
        );
        expect(unavailable.headers()['cache-control']).toBe('no-store');
        expect(unavailable.headers()['content-security-policy']).toBe(csp);
        expect(await unavailable.text()).not.toContain('<html');
      }
      const favicon = await page.request.get(
        'http://127.0.0.1:8080/favicon.svg',
      );
      expect(favicon.status()).toBe(200);
      expect(favicon.headers()['content-type']).toContain('image/svg+xml');
      expect(await favicon.text()).not.toContain('var(');
      await expect(
        page
          .locator('header')
          .getByRole('img', { name: 'bancaemdia', exact: true }),
      ).toHaveCount(1);
      expect(csp).toMatch(/script-src 'self' 'sha256-[^']+'/);
      expect(csp).not.toContain('unsafe-inline');
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(() =>
          document.fonts.check('400 16px "Source Sans 3"'),
        ),
      ).toBe(true);
      expect(
        (
          await page.request.get('http://127.0.0.1:8080/fontes/ausente.woff2')
        ).status(),
      ).toBe(404);
      expect(
        await page.evaluate(() => document.documentElement.dataset.cspFailure),
      ).toBeUndefined();
      expect(errors).toEqual([]);
      await page.close();
      console.log(
        `${name} ${viewport.width}: deep links, F5, guard, 404 e CSS sob CSP aprovados`,
      );
    }
  } finally {
    await browser.close();
  }
}
