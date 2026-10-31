import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const tema of ['claro', 'escuro']) {
  test(`proposta ${tema}: reflow, contraste e leitura sem hover`, async ({
    page,
  }, info) => {
    await page.goto('/painel');
    await expect(
      page.getByRole('heading', { name: 'Painel', exact: true }),
    ).toBeVisible();
    await page.evaluate((t) => {
      document.documentElement.dataset.tema = t;
    }, tema);
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(page.locator('.proposta-dias li')).toHaveCount(14);
    await expect(
      page.getByText('Zero confirmado', { exact: true }),
    ).toBeVisible();
    await expect(page.getByText('Dado ausente', { exact: true })).toBeVisible();
    await expect(
      page.getByText('Sem atividade', { exact: true }),
    ).toBeVisible();
    await expect(page.getByText('2 pendentes', { exact: true })).toBeVisible();
    await expect(
      page.getByText('Ainda não confirmado', { exact: true }),
    ).toBeVisible();
    const result = await new AxeBuilder({ page }).analyze();
    expect(result.violations).toEqual([]);
    await page.screenshot({
      path: info.outputPath(`${tema}.png`),
      fullPage: true,
    });
    await page.setViewportSize({ width: 320, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}

test('expansão por teclado, todos os dias, intervalos e URL inválida', async ({
  page,
}) => {
  await page.goto('/painel?trecho=invalido');
  await expect(page.locator('.proposta-dias li')).toHaveCount(14);
  await expect(page.locator('.proposta-dias time').first()).toHaveAttribute(
    'datetime',
    '2026-09-21',
  );
  const group = page.locator('details').nth(1);
  const summary = group.locator('summary');
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(group).toHaveAttribute('open', '');
  await expect(group.getByText('André', { exact: true })).toBeVisible();
  await expect(summary).toContainText('−R$');
  await page
    .getByRole('button', { name: 'Mostrar os 90 dias em lista' })
    .click();
  await expect(page.locator('.proposta-dias li')).toHaveCount(90);
  const dates = await page
    .locator('.proposta-dias time')
    .evaluateAll((elements) => elements.map((e) => e.getAttribute('datetime')));
  expect(new Set(dates).size).toBe(90);
  expect(dates[0]).toBe('2026-07-13');
  expect(dates.at(-1)).toBe('2026-10-10');
  await page
    .getByRole('button', { name: 'Voltar aos intervalos de 14 dias' })
    .click();
  await page.getByRole('button', { name: 'Próximos dias' }).click();
  await expect(page).toHaveURL(/trecho=6/);
  await expect(page.locator('.proposta-dias li')).toHaveCount(6);
  await expect(
    page.getByRole('button', { name: 'Próximos dias' }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Dias anteriores' }).click();
  await expect(page).toHaveURL(/trecho=5/);
  await expect(page.locator('.proposta-dias li')).toHaveCount(14);
});
