import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
const cors = {
  'Access-Control-Allow-Origin': 'http://127.0.0.1:4173',
  'Access-Control-Allow-Credentials': 'true',
};

test('runtime válido permite iniciar a aplicação', async ({ page }) => {
  await page.route('https://api.example.com/auth/session', (route) =>
    route.fulfill({ status: 401, json: {}, headers: cors }),
  );
  await page.route('**/config.json', (route) =>
    route.fulfill({
      json: {
        VITE_API_URL: 'https://api.example.com',
        VITE_APP_ENV: 'staging',
        VITE_UPLOAD_POLL_MS: 1500,
      },
    }),
  );
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Entrar', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('note')).toContainText(
    'Cópia de teste · Homologação',
  );
});

for (const [label, config, message] of [
  ['URL ausente', { VITE_API_URL: '' }, 'Informe a URL da API'],
  ['URL inválida', { VITE_API_URL: '/api' }, 'VITE_API_URL deve ser'],
  ['ambiente inválido', { VITE_APP_ENV: 'testing' }, 'VITE_APP_ENV deve ser'],
  [
    'intervalo inválido',
    { VITE_UPLOAD_POLL_MS: 0 },
    'VITE_UPLOAD_POLL_MS deve ser',
  ],
] as const) {
  test(`${label} interrompe o boot com mensagem em português`, async ({
    page,
  }) => {
    await page.route('**/config.json', (route) =>
      route.fulfill({ json: config }),
    );
    await page.goto('/');
    await expect(page.getByRole('alert')).toContainText(message);
    await expect(page.getByText('Esta página está em preparação.')).toHaveCount(
      0,
    );
  });
}

test('erro de leitura é acessível e permite recuperar o mesmo build por teclado', async ({
  page,
}, testInfo) => {
  await page.route('https://production.example.com/auth/session', (route) =>
    route.fulfill({ status: 401, json: {}, headers: cors }),
  );
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  let fixed = false;
  await page.route('**/config.json', (route) =>
    route.fulfill(
      fixed
        ? {
            json: {
              VITE_API_URL: 'https://production.example.com',
              VITE_APP_ENV: 'production',
            },
          }
        : { status: 503, body: 'stack trace interno' },
    ),
  );
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText(
    'Não foi possível carregar a configuração',
  );
  await expect(page.getByText('stack trace interno')).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('config-error.png'),
    fullPage: true,
  });
  const bundle = await page
    .locator('script[type="module"]')
    .getAttribute('src');
  fixed = true;
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('button', { name: 'Tentar novamente' }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Entrar', exact: true }),
  ).toBeVisible();
  expect(await page.locator('script[type="module"]').getAttribute('src')).toBe(
    bundle,
  );
  expect(errors).toEqual([]);
});
