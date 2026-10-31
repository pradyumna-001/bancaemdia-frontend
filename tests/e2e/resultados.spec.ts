import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { resultadosFixture } from '../fixtures/resultados';
const url = 'http://127.0.0.1:4208/resultados';
test('Resultados: gestos, picker, desfazer, temas, teclado, alvos e reflow', async ({
  page,
}, info) => {
  const fixture = resultadosFixture();
  await page.route('**/api/v1/resultados/**', async (route) => {
    const request = route.request();
    const parsed = new URL(request.url());
    const result = fixture.handle(
      request.method(),
      parsed.pathname,
      parsed.searchParams,
      request.method() === 'POST' ? request.postDataJSON() : undefined,
    );
    await route.fulfill({ status: result.status, json: result.data });
  });
  await page.goto(url);
  await expect(
    page.getByRole('heading', { name: 'Botafogo × Fluminense', exact: true }),
  ).toBeVisible();
  for (const theme of ['Claro', 'Escuro']) {
    await page.getByRole('button', { name: 'Opções', exact: true }).click();
    await page.getByRole('radio', { name: theme, exact: true }).check();
    await page.keyboard.press('Escape');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
  await page.screenshot({
    path: info.outputPath('resultados-fila.png'),
    fullPage: true,
  });
  const green = page.getByRole('button', { name: 'GREEN', exact: true });
  expect((await green.boundingBox())!.height).toBeGreaterThanOrEqual(48);
  await green.focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Corinthians × Santos', exact: true }),
  ).toBeVisible();
  await expect(green).toBeFocused();
  await expect(green).toBeEnabled();
  await page
    .getByRole('button', {
      name: 'Desfazer Botafogo × Fluminense',
      exact: true,
    })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Botafogo × Fluminense', exact: true }),
  ).toBeVisible();
  await expect(green).toBeEnabled();
  await page
    .getByRole('button', { name: 'Outro resultado', exact: true })
    .click();
  await page.getByRole('button', { name: /^Resultado / }).click();
  await page.getByRole('button', { name: 'Cashout', exact: true }).click();
  await page.getByLabel('Valor pago no cashout (R$)').fill('8,00');
  await page
    .getByRole('button', { name: 'Registrar resultado', exact: true })
    .click();
  await expect(
    page.getByRole('button', {
      name: 'Desfazer Botafogo × Fluminense',
      exact: true,
    }),
  ).toBeVisible();
  expect(fixture.receipts.size).toBe(3);
  await page.setViewportSize({ width: 320, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
test('build público não aceita sessão simulada da demonstração de Resultados', async ({
  page,
}) => {
  await page.goto(url);
  await expect(
    page.getByRole('heading', { name: 'Resultados', exact: true }),
  ).toBeVisible();
  await page.route('**/config.json', (route) =>
    route.fulfill({
      json: {
        VITE_API_URL: 'http://127.0.0.1:4208',
        VITE_APP_ENV: 'production',
      },
    }),
  );
  await page.route('http://127.0.0.1:8000/**', (route) =>
    route.fulfill({
      status: 401,
      headers: {
        'Access-Control-Allow-Origin': 'http://127.0.0.1:4173',
        'Access-Control-Allow-Credentials': 'true',
      },
      json: { code: 'not_authenticated' },
    }),
  );
  await page.goto(
    'http://127.0.0.1:4173/resultados?session=true&fixture=http://127.0.0.1:4208',
  );
  await expect(
    page.getByRole('heading', { name: 'Entrar', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Botafogo × Fluminense', exact: true }),
  ).toHaveCount(0);
});
