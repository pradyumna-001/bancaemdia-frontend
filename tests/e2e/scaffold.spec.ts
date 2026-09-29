import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('abre a aplicação e mostra informações da versão por teclado', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page).toHaveTitle('bancaemdia');
  await expect(
    page.getByRole('heading', { name: 'bancaemdia', level: 1 }),
  ).toBeVisible();
  const information = page.getByText(
    'As telas serão disponibilizadas nas próximas etapas.',
  );
  await expect(information).toBeHidden();
  await page.keyboard.press('Tab');
  await expect(page.getByText('Sobre esta versão')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(information).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath('scaffold.png'),
    fullPage: true,
  });
});
