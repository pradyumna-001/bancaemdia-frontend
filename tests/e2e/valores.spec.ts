import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('valores exatos, ausência, freebet e estados parciais mantêm significado', async ({
  page,
}) => {
  await page.goto('http://127.0.0.1:4175/testes/valores');
  await expect(page.getByText('Valor de face').locator('..')).toHaveText(
    'Valor de faceR$ 100,00',
  );
  await expect(page.getByText('Custo próprio').locator('..')).toHaveText(
    'Custo próprioR$ 0,00',
  );
  await expect(page.getByText('−R$ 92.233.720.368.547.758,08')).toBeVisible();
  await expect(page.getByText('Não informado', { exact: true })).toBeVisible();
  await expect(page.getByText('SaldoR$ 0,00', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Valor indisponível', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('9.007.199.254.740.993,123456789')).toBeVisible();
  await expect(page.getByText('2,1234', { exact: true })).toBeVisible();
  await expect(page.getByText('12,5%', { exact: true })).toBeVisible();
  await expect(page.getByText('JPY 500 por mês')).toBeVisible();
  await expect(page.getByText('Meio green', { exact: true })).toBeVisible();
  await expect(page.getByText('Meio red', { exact: true })).toBeVisible();
  await expect(page.getByText('Estado desconhecido')).toBeVisible();
  await expect(page.locator('main')).not.toContainText('PRIVADO_INVALIDO');
  await expect(
    page.getByText('05/10/2026, 22:30 (America/Sao_Paulo)'),
  ).toBeVisible();
});

test('componentes de valor/estado são legíveis nos temas e em 320px', async ({
  page,
}, testInfo) => {
  await page.goto('http://127.0.0.1:4175/testes/valores');
  for (const theme of ['Claro', 'Escuro']) {
    await page.getByRole('radio', { name: theme, exact: true }).check();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`valores-${theme}.png`),
      fullPage: true,
    });
  }
  await page.getByRole('radio', { name: 'Sistema', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(
    page.getByRole('radio', { name: 'Claro', exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole('radio', { name: 'Claro', exact: true }),
  ).toBeFocused();
  await page.setViewportSize({ width: 320, height: 568 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.getByText('−R$ 92.233.720.368.547.758,08')).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('valores-320.png'),
    fullPage: true,
  });
});

test('ensaio de valores não é uma rota do aplicativo público', async ({
  page,
}) => {
  let identity = 0;
  page.on('request', (request) => {
    if (request.url().includes('/auth/')) identity++;
  });
  await page.goto('/testes/valores?valores=1');
  await expect(
    page.getByRole('heading', { name: 'Não achei esta página' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Ensaio de valores' }),
  ).toHaveCount(0);
  expect(identity).toBe(0);
});
