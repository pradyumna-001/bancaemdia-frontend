import { expect, test } from '@playwright/test';

test('marca e favicon são consistentes no login, cabeçalho e erros', async ({
  page,
}, testInfo) => {
  for (const theme of ['claro', 'escuro'] as const) {
    await page.emulateMedia({
      colorScheme: theme === 'claro' ? 'light' : 'dark',
    });
    for (const route of ['/login', '/tutorial', '/nao-existe']) {
      await page.goto(route);
      await expect(page.locator('html')).toHaveAttribute('data-tema', theme);
      if (route === '/login') {
        await expect(page.getByRole('radio')).toHaveCount(0);
      }
      await expect(
        page
          .locator('header')
          .getByRole('img', { name: 'bancaemdia', exact: true }),
      ).toHaveCount(1);
      await expect(page).toHaveTitle('bancaemdia');
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await page.screenshot({
      path: testInfo.outputPath('marca-' + theme + '.png'),
      fullPage: true,
    });
  }
  const favicon = page.locator('link[rel="icon"]');
  await expect(favicon).toHaveAttribute('href', '/favicon.svg');
  const response = await page.request.get('/favicon.svg');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('image/svg+xml');
  expect(await response.text()).not.toContain('var(');
  expect(
    await page.evaluate(async () => {
      const image = new Image();
      image.src = '/favicon.svg';
      await image.decode();
      return image.naturalWidth > 0;
    }),
  ).toBe(true);
  await page.route('**/config.json', (route) => route.fulfill({ status: 503 }));
  await page.reload();
  await expect(
    page.getByRole('heading', {
      name: 'Não foi possível iniciar o bancaemdia',
    }),
  ).toBeVisible();
  await expect(
    page
      .locator('header')
      .getByRole('img', { name: 'bancaemdia', exact: true }),
  ).toHaveCount(1);
});
