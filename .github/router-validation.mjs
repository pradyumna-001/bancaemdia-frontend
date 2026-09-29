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
      expect(styles).toEqual({ radius: '14px', border: '1px' });
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
