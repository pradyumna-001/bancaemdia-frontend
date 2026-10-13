import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const demo = process.env.CONTAS_DEMO_URL ?? 'http://127.0.0.1:4183';
test('Contas preserva filtros, distingue histórico e verifica apresentação', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(demo + '/contas?tipster=5&apagadas=1');
  await expect(
    page.getByRole('link', { name: 'Marina', exact: true }),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: info.outputPath('contas-titulares.png'),
    fullPage: true,
  });
  await page.getByRole('link', { name: 'Marina', exact: true }).click();
  await expect(page).toHaveURL(/\/contas\/1\?tipster=5&apagadas=1/);
  await expect(
    page.getByRole('heading', { name: 'Conta principal', exact: true }),
  ).toBeVisible();
  const archived = page
    .getByRole('heading', { name: 'Conta encerrada' })
    .locator('..');
  await archived.getByText('Histórico de uso', { exact: true }).click();
  await expect(archived.getByText(/Registro legado/)).toBeVisible();
  await page.getByText('Marina · saldo Não informado', { exact: true }).click();
  const holderFinance = page
    .getByText('Marina · saldo Não informado', { exact: true })
    .locator('..');
  await expect(holderFinance.getByText('R$ 240,00').first()).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: info.outputPath('contas-do-titular.png'),
    fullPage: true,
  });
  await page.setViewportSize({ width: 320, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole('button', { name: 'Arquivar titular', exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Arquivar Marina?' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Arquivar titular', exact: true }),
  ).toBeFocused();
  expect(errors).toEqual([]);
});
test('cadastro e seleção por teclado não fazem envio duplicado nem ativam por conta própria', async ({
  page,
}) => {
  const name = 'Titular ' + crypto.randomUUID().slice(0, 8);
  const writes: string[] = [];
  page.on('request', (req) => {
    if (req.method() === 'POST' && req.url().includes('/titulares'))
      writes.push(req.url());
  });
  await page.goto(demo + '/contas');
  await page.getByText('Cadastrar titular', { exact: true }).first().click();
  await page.getByLabel('Nome do titular', { exact: true }).fill(name);
  await page
    .getByRole('button', { name: 'Cadastrar titular', exact: true })
    .click();
  await page.getByRole('link', { name, exact: true }).click();
  await page.getByText('Cadastrar conta', { exact: true }).first().click();
  await page
    .getByLabel('Apelido da conta', { exact: true })
    .fill('Conta de teste');
  const trigger = page.getByRole('button', {
    name: /^Casa da nova conta /,
  });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Casa da nova conta' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Betano', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(trigger).toBeFocused();
  await page
    .getByRole('button', { name: 'Cadastrar conta', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Conta de teste' }),
  ).toBeVisible();
  expect(writes).toHaveLength(2);
  expect(writes.some((url) => url.endsWith('/ativar'))).toBe(false);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
test('erros e READ_ONLY mantêm financeiro e filtros', async ({ page }) => {
  // Use the actual fixture contract for billing, changing only the published permission.
  await page.unroute('**/api/v1/billing/status');
  await page.route('**/api/v1/billing/status', async (route) => {
    const result = await route.fetch();
    await route.fulfill({
      response: result,
      json: { ...(await result.json()), access: 'READ_ONLY' },
    });
  });
  await page.route('**/api/v1/titulares/*/matriz', (route) =>
    route.fulfill({ status: 404, contentType: 'application/json', body: '{}' }),
  );
  await page.goto(demo + '/contas/1?casa=7&apagadas=1');
  await expect(
    page.getByRole('region', { name: /Contas e vigências/ }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', {
      name: 'Financeiro por titular e conta',
      exact: true,
    }),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
