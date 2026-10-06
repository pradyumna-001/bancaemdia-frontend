import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('preferência é aplicada antes de React, mesmo se o bundle não carregar', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.addInitScript(() =>
    localStorage.setItem('bancaemdia.tema', 'escuro'),
  );
  await page.route('**/assets/*.js', (route) => route.abort());
  await page.goto('/tutorial');
  await expect(page.locator('html')).toHaveAttribute('data-tema', 'escuro');
  expect(await page.locator('#root').innerHTML()).toBe('');
  const html = await page.content();
  expect(html.indexOf('id="tema-inicial"')).toBeLessThan(
    html.indexOf('rel="stylesheet"'),
  );
});

test('tema acompanha sistema, persiste escolha e funciona por teclado nos dois temas', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  const fonts: string[] = [];
  page.on('request', (request) => {
    if (request.resourceType() === 'font') fonts.push(request.url());
  });
  await page.goto('/tutorial');
  await expect(
    page.getByRole('heading', { name: 'Tutorial', exact: true }),
  ).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-tema', 'escuro');
  await expect(
    page.getByRole('radio', { name: 'Sistema', exact: true }),
  ).toBeChecked();
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-tema', 'claro');
  for (const [label, value] of [
    ['Escuro', 'escuro'],
    ['Claro', 'claro'],
  ] as const) {
    await page.getByRole('radio', { name: label, exact: true }).check();
    await page.reload();
    await expect(
      page.getByRole('radio', { name: label, exact: true }),
    ).toBeChecked();
    await expect(page.locator('html')).toHaveAttribute('data-tema', value);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath('fundacao-' + value + '.png'),
      fullPage: true,
    });
  }
  await page.getByRole('radio', { name: 'Claro', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(
    page.getByRole('radio', { name: 'Escuro', exact: true }),
  ).toBeFocused();
  await expect(page.locator('html')).toHaveAttribute('data-tema', 'escuro');
  await page.getByRole('radio', { name: 'Sistema', exact: true }).check();
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-tema', 'escuro');
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(() =>
      [400, 600, 700].every((weight) =>
        document.fonts.check(weight + ' 16px "Source Sans 3"'),
      ),
    ),
  ).toBe(true);
  expect(fonts.length).toBeGreaterThan(0);
  expect(
    fonts.every(
      (url) =>
        new URL(url).origin === new URL(page.url()).origin &&
        new URL(url).pathname.startsWith('/fontes/'),
    ),
  ).toBe(true);
});

test('storage bloqueado não impede trocar tema ou navegar', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() =>
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Bloqueado', 'SecurityError');
      },
    }),
  );
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/rota-inexistente');
  await expect(page.locator('html')).toHaveAttribute('data-tema', 'escuro');
  await page.getByRole('radio', { name: 'Claro', exact: true }).check();
  await expect(page.locator('html')).toHaveAttribute('data-tema', 'claro');
  await page.getByRole('link', { name: 'Abrir tutorial' }).click();
  await expect(
    page.getByRole('radio', { name: 'Claro', exact: true }),
  ).toBeChecked();
  expect(errors).toEqual([]);
});

test('alteração em outra aba e limpeza da preferência sincronizam sem reload', async ({
  page,
  context,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/tutorial');
  const other = await context.newPage();
  await other.goto('/tutorial');
  await other.getByRole('radio', { name: 'Escuro', exact: true }).check();
  await expect(page.locator('html')).toHaveAttribute('data-tema', 'escuro');
  await expect(
    page.getByRole('radio', { name: 'Escuro', exact: true }),
  ).toBeChecked();
  await other.evaluate(() => localStorage.removeItem('bancaemdia.tema'));
  await expect(
    page.getByRole('radio', { name: 'Sistema', exact: true }),
  ).toBeChecked();
  await expect(page.locator('html')).toHaveAttribute('data-tema', 'claro');
});
